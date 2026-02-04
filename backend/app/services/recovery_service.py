from __future__ import annotations

import asyncio
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from jose import JWTError, jwt
from sqlmodel import select

from app.core.config import settings
from app.core.security import get_password_hash, pwd_context
from app.db.database import async_session
from app.db.models import RecoveryCode, RecoveryIPAttempt, RecoveryResetToken, User


@dataclass(frozen=True)
class RecoveryVerifyResult:
    reset_token: str | None
    expires_in_seconds: int
    message: str


class RecoveryService:
    DEFAULT_CODES_COUNT = 8
    CODE_LENGTH = 10
    CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    RESET_TOKEN_TTL_SECONDS = 600
    SETUP_TOKEN_TTL_SECONDS = 900
    ERROR_MESSAGE = "Не удалось подтвердить код. Проверьте данные и повторите."

    USER_WINDOW_SECONDS = 900
    USER_MAX_ATTEMPTS = 5
    USER_LOCK_SECONDS = 1800

    IP_WINDOW_SECONDS = 600
    IP_MAX_ATTEMPTS = 10
    IP_LOCK_SECONDS = 900

    BACKOFF_SCHEDULE_SECONDS = (0.5, 1.0, 2.0, 4.0)
    BACKOFF_MAX_SECONDS = 8.0

    _codes_cache: dict[str, tuple[datetime, list[str]]] = {}

    def __init__(self, session_factory=async_session, *, now_fn=None, sleep_fn=None):
        self._session_factory = session_factory
        self._now_fn = now_fn or datetime.utcnow
        self._sleep_fn = sleep_fn or asyncio.sleep

    def _now(self) -> datetime:
        return self._now_fn()

    async def _sleep(self, seconds: float) -> None:
        await self._sleep_fn(seconds)

    def _generate_plain_code(self) -> str:
        raw = "".join(
            secrets.choice(self.CODE_ALPHABET) for _ in range(self.CODE_LENGTH)
        )
        return f"{raw[:5]}-{raw[5:]}"

    def _create_reset_token(
        self, username: str, batch_id: UUID, code_id: UUID, jti: str
    ) -> str:
        now = self._now()
        payload = {
            "sub": username,
            "type": "recovery_reset",
            "batch_id": str(batch_id),
            "code_id": str(code_id),
            "exp": now + timedelta(seconds=self.RESET_TOKEN_TTL_SECONDS),
            "jti": jti,
        }
        return jwt.encode(
            payload, settings.jwt_secret, algorithm=settings.jwt_algorithm
        )

    def create_setup_token(self, username: str) -> str:
        now = self._now()
        payload = {
            "sub": username,
            "type": "recovery_setup",
            "exp": now + timedelta(seconds=self.SETUP_TOKEN_TTL_SECONDS),
            "jti": secrets.token_urlsafe(16),
        }
        return jwt.encode(
            payload, settings.jwt_secret, algorithm=settings.jwt_algorithm
        )

    async def generate_codes(self, user_id: UUID, count: int | None = None):
        count = count or self.DEFAULT_CODES_COUNT
        batch_id = uuid4()
        plain_codes: list[str] = []
        code_hashes: list[str] = []
        now = self._now()

        async with self._session_factory() as session:
            user = await session.get(User, user_id)
            if not user:
                return [], []

            await session.exec(
                RecoveryCode.__table__.delete().where(RecoveryCode.user_id == user_id)
            )
            for _ in range(count):
                code = self._generate_plain_code()
                code_hash = pwd_context.hash(code)
                plain_codes.append(code)
                code_hashes.append(code_hash)
                session.add(
                    RecoveryCode(
                        user_id=user_id,
                        batch_id=batch_id,
                        code_hash=code_hash,
                        created_at=now,
                    )
                )
            user.recovery_codes_generated_at = now
            user.recovery_codes_viewed_at = None
            await session.commit()

        return plain_codes, code_hashes

    async def regenerate(self, user_id: UUID):
        return await self.generate_codes(user_id)

    def cache_plain_codes(self, user_id: UUID, codes: list[str]) -> None:
        expires_at = self._now() + timedelta(minutes=10)
        self._codes_cache[str(user_id)] = (expires_at, codes)

    def pop_cached_codes(self, user_id: UUID) -> list[str] | None:
        entry = self._codes_cache.pop(str(user_id), None)
        if not entry:
            return None
        expires_at, codes = entry
        if expires_at < self._now():
            return None
        return codes

    async def _get_ip_state(self, ip: str) -> RecoveryIPAttempt:
        async with self._session_factory() as session:
            result = await session.exec(
                select(RecoveryIPAttempt).where(RecoveryIPAttempt.ip == ip)
            )
            ip_state = result.one_or_none()
            if not ip_state:
                ip_state = RecoveryIPAttempt(
                    ip=ip,
                    attempted_at=self._now(),
                    last_attempt_at=self._now(),
                    attempt_count=0,
                    success=False,
                )
                session.add(ip_state)
                await session.commit()
                await session.refresh(ip_state)
            return ip_state

    async def _update_ip_attempt(
        self, ip: str, username: str | None, success: bool
    ) -> RecoveryIPAttempt:
        now = self._now()
        async with self._session_factory() as session:
            result = await session.exec(
                select(RecoveryIPAttempt).where(RecoveryIPAttempt.ip == ip)
            )
            ip_state = result.one_or_none()
            if not ip_state:
                ip_state = RecoveryIPAttempt(
                    ip=ip,
                    attempted_at=now,
                    last_attempt_at=now,
                    attempt_count=0,
                    success=success,
                    username_hint=username,
                )
                session.add(ip_state)
                await session.commit()
                await session.refresh(ip_state)
                return ip_state

            if ip_state.lock_until and ip_state.lock_until > now:
                ip_state.last_attempt_at = now
                ip_state.attempted_at = now
                ip_state.success = success
                ip_state.username_hint = username
                await session.commit()
                return ip_state

            if (
                ip_state.last_attempt_at
                and (now - ip_state.last_attempt_at).total_seconds()
                > self.IP_WINDOW_SECONDS
            ):
                ip_state.attempt_count = 0

            if success:
                ip_state.attempt_count = 0
                ip_state.lock_until = None
            else:
                ip_state.attempt_count += 1
                if ip_state.attempt_count >= self.IP_MAX_ATTEMPTS:
                    ip_state.lock_until = now + timedelta(seconds=self.IP_LOCK_SECONDS)

            ip_state.last_attempt_at = now
            ip_state.attempted_at = now
            ip_state.success = success
            ip_state.username_hint = username
            await session.commit()
            return ip_state

    def _get_backoff_seconds(self, attempts: int) -> float:
        if attempts <= 0:
            return 0.0
        index = min(attempts - 1, len(self.BACKOFF_SCHEDULE_SECONDS) - 1)
        delay = self.BACKOFF_SCHEDULE_SECONDS[index]
        return min(delay, self.BACKOFF_MAX_SECONDS)

    async def _get_latest_batch_id(self, user_id: UUID) -> UUID | None:
        async with self._session_factory() as session:
            result = await session.exec(
                select(RecoveryCode)
                .where(RecoveryCode.user_id == user_id)
                .order_by(RecoveryCode.created_at.desc())
                .limit(1)
            )
            latest = result.first()
            return latest.batch_id if latest else None

    async def verify_code(
        self, username: str, code: str, ip: str
    ) -> RecoveryVerifyResult:
        now = self._now()

        ip_state = await self._get_ip_state(ip)
        if ip_state.lock_until and ip_state.lock_until > now:
            await self._update_ip_attempt(ip, username, False)
            return RecoveryVerifyResult(
                reset_token=None,
                expires_in_seconds=0,
                message=self.ERROR_MESSAGE,
            )

        async with self._session_factory() as session:
            result = await session.exec(select(User).where(User.username == username))
            user = result.one_or_none()
            if not user:
                ip_state = await self._update_ip_attempt(ip, username, False)
                delay = self._get_backoff_seconds(ip_state.attempt_count)
                if delay > 0:
                    await self._sleep(delay)
                return RecoveryVerifyResult(
                    reset_token=None,
                    expires_in_seconds=0,
                    message=self.ERROR_MESSAGE,
                )

            if not user.recovery_codes_viewed_at:
                await self._update_ip_attempt(ip, username, False)
                return RecoveryVerifyResult(
                    reset_token=None,
                    expires_in_seconds=0,
                    message=self.ERROR_MESSAGE,
                )

            if user.recovery_lock_until and user.recovery_lock_until > now:
                await self._update_ip_attempt(ip, username, False)
                return RecoveryVerifyResult(
                    reset_token=None,
                    expires_in_seconds=0,
                    message=self.ERROR_MESSAGE,
                )

            if (
                user.recovery_last_attempt_at
                and (now - user.recovery_last_attempt_at).total_seconds()
                > self.USER_WINDOW_SECONDS
            ):
                user.recovery_failed_attempts = 0

            latest_batch_id = await self._get_latest_batch_id(user.id)
            if not latest_batch_id:
                user.recovery_failed_attempts += 1
                user.recovery_last_attempt_at = now
                if user.recovery_failed_attempts >= self.USER_MAX_ATTEMPTS:
                    user.recovery_lock_until = now + timedelta(
                        seconds=self.USER_LOCK_SECONDS
                    )
                await session.commit()
                ip_state = await self._update_ip_attempt(ip, username, False)
                delay = self._get_backoff_seconds(user.recovery_failed_attempts)
                if delay > 0:
                    await self._sleep(delay)
                return RecoveryVerifyResult(
                    reset_token=None,
                    expires_in_seconds=0,
                    message=self.ERROR_MESSAGE,
                )

            result = await session.exec(
                select(RecoveryCode).where(
                    RecoveryCode.user_id == user.id,
                    RecoveryCode.batch_id == latest_batch_id,
                    RecoveryCode.used_at.is_(None),
                )
            )
            candidates = result.all()

            matched_code: RecoveryCode | None = None
            for candidate in candidates:
                if pwd_context.verify(code, candidate.code_hash):
                    matched_code = candidate
                    break

            if not matched_code:
                user.recovery_failed_attempts += 1
                user.recovery_last_attempt_at = now
                if user.recovery_failed_attempts >= self.USER_MAX_ATTEMPTS:
                    user.recovery_lock_until = now + timedelta(
                        seconds=self.USER_LOCK_SECONDS
                    )
                await session.commit()
                ip_state = await self._update_ip_attempt(ip, username, False)
                delay = self._get_backoff_seconds(user.recovery_failed_attempts)
                if delay > 0:
                    await self._sleep(delay)
                return RecoveryVerifyResult(
                    reset_token=None,
                    expires_in_seconds=0,
                    message=self.ERROR_MESSAGE,
                )

            matched_code.used_at = now
            user.recovery_last_used_at = now
            user.recovery_failed_attempts = 0
            user.recovery_lock_until = None
            user.recovery_last_attempt_at = now
            await session.commit()

            jti = secrets.token_urlsafe(16)
            reset_token = self._create_reset_token(
                username=user.username,
                batch_id=matched_code.batch_id,
                code_id=matched_code.id,
                jti=jti,
            )
            session.add(
                RecoveryResetToken(
                    user_id=user.id,
                    jti=jti,
                    created_at=now,
                    expires_at=now + timedelta(seconds=self.RESET_TOKEN_TTL_SECONDS),
                )
            )
            await session.commit()
            await self._update_ip_attempt(ip, username, True)
            return RecoveryVerifyResult(
                reset_token=reset_token,
                expires_in_seconds=self.RESET_TOKEN_TTL_SECONDS,
                message="ok",
            )

    async def reset_password(self, reset_token: str, new_password: str) -> bool:
        try:
            payload = jwt.decode(
                reset_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
            )
        except JWTError:
            return False

        if payload.get("type") != "recovery_reset":
            return False

        username = payload.get("sub")
        if not username:
            return False
        jti = payload.get("jti")
        if not jti:
            return False

        async with self._session_factory() as session:
            result = await session.exec(select(User).where(User.username == username))
            user = result.one_or_none()
            if not user:
                return False
            result = await session.exec(
                select(RecoveryResetToken).where(
                    RecoveryResetToken.jti == jti,
                    RecoveryResetToken.user_id == user.id,
                )
            )
            token_row = result.one_or_none()
            now = self._now()
            if not token_row:
                return False
            if token_row.used_at is not None:
                return False
            if token_row.expires_at < now:
                return False

            token_row.used_at = now
            user.password_hash = get_password_hash(new_password)
            user.recovery_last_used_at = now
            await session.commit()
            return True

    async def get_status(self, user_id: UUID) -> dict:
        async with self._session_factory() as session:
            user = await session.get(User, user_id)
            if not user:
                return {
                    "confirmed": False,
                    "viewed_at": None,
                    "generated_at": None,
                    "last_used_at": None,
                    "active_codes_count": 0,
                }

            latest_batch_id = await self._get_latest_batch_id(user_id)
            active_count = 0
            if latest_batch_id:
                result = await session.exec(
                    select(RecoveryCode).where(
                        RecoveryCode.user_id == user_id,
                        RecoveryCode.batch_id == latest_batch_id,
                        RecoveryCode.used_at.is_(None),
                    )
                )
                active_count = len(result.all())

            return {
                "confirmed": user.recovery_codes_viewed_at is not None,
                "viewed_at": user.recovery_codes_viewed_at,
                "generated_at": user.recovery_codes_generated_at,
                "last_used_at": user.recovery_last_used_at,
                "active_codes_count": active_count,
            }

    async def confirm_viewed(self, user_id: UUID) -> datetime | None:
        async with self._session_factory() as session:
            user = await session.get(User, user_id)
            if not user:
                return None
            user.recovery_codes_viewed_at = datetime.utcnow()
            await session.commit()
            return user.recovery_codes_viewed_at

    async def confirm_setup(self, setup_token: str) -> bool:
        try:
            payload = jwt.decode(
                setup_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
            )
        except JWTError:
            return False

        if payload.get("type") != "recovery_setup":
            return False

        username = payload.get("sub")
        if not username:
            return False

        async with self._session_factory() as session:
            result = await session.exec(select(User).where(User.username == username))
            user = result.one_or_none()
            if not user:
                return False
            user.recovery_codes_viewed_at = self._now()
            await session.commit()
            return True
