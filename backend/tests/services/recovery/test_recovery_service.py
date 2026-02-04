import os
from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import pwd_context
from app.db.models import RecoveryCode, RecoveryIPAttempt, RecoveryResetToken, User
from app.services.recovery_service import RecoveryService


async def _setup_db(tmp_path):
    db_path = tmp_path / f"recovery_{uuid4().hex}.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, session_factory


async def _create_user(session_factory, username: str = "alice") -> User:
    async with session_factory() as session:
        user = User(username=username, password_hash="hash")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


class FakeClock:
    def __init__(self, start: datetime):
        self._now = start
        self.sleeps: list[float] = []

    def now(self) -> datetime:
        return self._now

    async def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self._now = self._now + timedelta(seconds=seconds)


@pytest.mark.asyncio
async def test_generate_codes_hashing(tmp_path):
    engine, session_factory = await _setup_db(tmp_path)
    user = await _create_user(session_factory)
    service = RecoveryService(session_factory)

    codes, hashes = await service.generate_codes(user.id)

    assert len(codes) == service.DEFAULT_CODES_COUNT
    assert len(hashes) == service.DEFAULT_CODES_COUNT
    assert all(code not in hashes for code in codes)

    async with session_factory() as session:
        result = await session.exec(
            select(RecoveryCode).where(RecoveryCode.user_id == user.id)
        )
        stored = result.all()

    assert len(stored) == service.DEFAULT_CODES_COUNT
    for code in codes:
        assert any(pwd_context.verify(code, record.code_hash) for record in stored)

    await engine.dispose()


@pytest.mark.asyncio
async def test_verify_code_sets_used_at(tmp_path):
    engine, session_factory = await _setup_db(tmp_path)
    user = await _create_user(session_factory)
    service = RecoveryService(session_factory)

    codes, _hashes = await service.generate_codes(user.id)
    code = codes[0]

    result = await service.verify_code(user.username, code, ip="127.0.0.1")
    assert result.reset_token is not None

    async with session_factory() as session:
        result_db = await session.exec(
            select(RecoveryCode).where(RecoveryCode.user_id == user.id)
        )
        stored = result_db.all()
    assert sum(1 for record in stored if record.used_at is not None) == 1

    result_second = await service.verify_code(user.username, code, ip="127.0.0.1")
    assert result_second.reset_token is None

    await engine.dispose()


@pytest.mark.asyncio
async def test_regenerate_invalidates_old_batch(tmp_path):
    engine, session_factory = await _setup_db(tmp_path)
    user = await _create_user(session_factory)
    service = RecoveryService(session_factory)

    old_codes, _hashes = await service.generate_codes(user.id)
    old_code = old_codes[0]

    new_codes, _new_hashes = await service.regenerate(user.id)
    assert new_codes

    result_old = await service.verify_code(user.username, old_code, ip="127.0.0.1")
    assert result_old.reset_token is None

    result_new = await service.verify_code(user.username, new_codes[0], ip="127.0.0.1")
    assert result_new.reset_token is not None

    await engine.dispose()


@pytest.mark.asyncio
async def test_reset_token_one_time(tmp_path):
    engine, session_factory = await _setup_db(tmp_path)
    user = await _create_user(session_factory)
    clock = FakeClock(datetime(2026, 2, 4, 12, 0, 0))
    service = RecoveryService(session_factory, now_fn=clock.now, sleep_fn=clock.sleep)

    codes, _hashes = await service.generate_codes(user.id)
    result = await service.verify_code(user.username, codes[0], ip="127.0.0.1")
    assert result.reset_token is not None

    ok_first = await service.reset_password(result.reset_token, "NewPassword123")
    assert ok_first is True

    ok_second = await service.reset_password(result.reset_token, "OtherPassword123")
    assert ok_second is False

    async with session_factory() as session:
        result_db = await session.exec(
            select(RecoveryResetToken).where(RecoveryResetToken.user_id == user.id)
        )
        token_row = result_db.one()
        assert token_row.used_at is not None

    await engine.dispose()


@pytest.mark.asyncio
async def test_user_lock_after_five_attempts(tmp_path):
    engine, session_factory = await _setup_db(tmp_path)
    user = await _create_user(session_factory)
    clock = FakeClock(datetime(2026, 2, 4, 12, 0, 0))
    service = RecoveryService(session_factory, now_fn=clock.now, sleep_fn=clock.sleep)

    await service.generate_codes(user.id)

    for _ in range(service.USER_MAX_ATTEMPTS):
        result = await service.verify_code(user.username, "WRONG-00000", ip="127.0.0.1")
        assert result.reset_token is None
        assert result.message == service.ERROR_MESSAGE

    async with session_factory() as session:
        refreshed = await session.get(User, user.id)
        assert refreshed.recovery_lock_until is not None
        expected_lock = clock.now() + timedelta(seconds=service.USER_LOCK_SECONDS)
        assert refreshed.recovery_lock_until == expected_lock

    await engine.dispose()


@pytest.mark.asyncio
async def test_ip_lock_after_ten_attempts(tmp_path):
    engine, session_factory = await _setup_db(tmp_path)
    clock = FakeClock(datetime(2026, 2, 4, 12, 0, 0))
    service = RecoveryService(session_factory, now_fn=clock.now, sleep_fn=clock.sleep)

    for _ in range(service.IP_MAX_ATTEMPTS):
        result = await service.verify_code("missing", "WRONG-00000", ip="10.0.0.1")
        assert result.reset_token is None
        assert result.message == service.ERROR_MESSAGE

    async with session_factory() as session:
        result = await session.exec(
            select(RecoveryIPAttempt).where(RecoveryIPAttempt.ip == "10.0.0.1")
        )
        ip_state = result.one()
        assert ip_state.lock_until is not None

    await engine.dispose()


@pytest.mark.asyncio
async def test_backoff_schedule(tmp_path):
    engine, session_factory = await _setup_db(tmp_path)
    user = await _create_user(session_factory)
    clock = FakeClock(datetime(2026, 2, 4, 12, 0, 0))
    service = RecoveryService(session_factory, now_fn=clock.now, sleep_fn=clock.sleep)

    await service.generate_codes(user.id)

    for _ in range(4):
        await service.verify_code(user.username, "WRONG-00000", ip="127.0.0.1")

    assert clock.sleeps[:4] == list(service.BACKOFF_SCHEDULE_SECONDS)

    await engine.dispose()
