import os
import ssl

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings


def _safe_url_for_logs(db_url: str) -> str:
    try:
        url = make_url(db_url)
        if url.password:
            url = url.set(password="***")
        return str(url)
    except Exception:
        return "<unparseable DB URL>"


def _pop_int(query: dict, key: str) -> int | None:
    raw = query.pop(key, None)
    if raw is None or raw == "":
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _build_engine(db_url: str):
    url = make_url(db_url)
    if url.drivername.startswith("sqlite"):
        return create_async_engine(url, echo=False, future=True)
    if url.drivername in {"postgres", "postgresql"} or (
        url.drivername.startswith("postgresql") and "+asyncpg" not in url.drivername
    ):
        url = url.set(drivername="postgresql+asyncpg")
    query = dict(url.query)

    connect_args = {}

    sslmode = query.pop("sslmode", "") or os.getenv("DB_SSLMODE", "")
    if sslmode:
        sslmode = sslmode.lower()
        if sslmode == "require":
            # libpq semantics: encrypt, but do not verify server cert/hostname
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ctx
        elif sslmode == "verify-ca":
            # verify cert chain, but do not enforce hostname match
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            connect_args["ssl"] = ctx
        elif sslmode == "verify-full":
            # verify cert chain + hostname
            connect_args["ssl"] = ssl.create_default_context()
        elif sslmode in {"disable"}:
            connect_args["ssl"] = False
        elif sslmode in {"prefer", "allow"}:
            # asyncpg has no "optional SSL" negotiation knob; treat as no SSL requirement
            pass

    # asyncpg doesn't support libpq's channel_binding parameter; drop it if present
    query.pop("channel_binding", None)

    # Neon pooler (PgBouncer) часто требует отключить prepared statement cache у asyncpg
    # https://magicstack.github.io/asyncpg/current/api/index.html#asyncpg.connect
    statement_cache_size = _pop_int(query, "statement_cache_size")
    if statement_cache_size is None:
        env_cache = os.getenv("DB_STATEMENT_CACHE_SIZE", "")
        if env_cache.strip():
            try:
                statement_cache_size = int(env_cache)
            except ValueError:
                statement_cache_size = None
    if statement_cache_size is None and url.host and "pooler" in url.host:
        statement_cache_size = 0
    if statement_cache_size is not None:
        connect_args["statement_cache_size"] = statement_cache_size

    connect_timeout = _pop_int(query, "connect_timeout")
    if connect_timeout is not None:
        connect_args["timeout"] = connect_timeout

    url = url.set(query=query)
    return create_async_engine(url, echo=False, future=True, connect_args=connect_args)


engine = _build_engine(settings.db_url)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    # Для простоты: создаётся синхронно при стартe в dev; для продакшна используйте Alembic
    import logging

    logger = logging.getLogger(__name__)
    logger.info("DB connect: %s", _safe_url_for_logs(settings.db_url))
    url = make_url(settings.db_url)
    if url.drivername.startswith("sqlite"):
        db_path = url.database or ""
        if db_path and not os.path.isabs(db_path):
            db_path = os.path.abspath(db_path)
        if db_path and os.path.exists(db_path):
            logger.info("SQLite DB exists, skipping create_all: %s", db_path)
            return
        logger.info("SQLite DB missing, running create_all: %s", db_path or "<memory>")

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
