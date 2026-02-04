import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from sqlalchemy.engine import URL

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
PROJECT_ROOT = ROOT_DIR.parent

# Load .env (prefer backend/.env; fall back to project root .env if present)
load_dotenv(ROOT_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")


def _build_db_url() -> str:
    db_engine = os.getenv("DB_ENGINE", "postgres").lower()
    if db_engine == "sqlite":
        return "sqlite+aiosqlite:///./game-platform.db"

    explicit_url = os.getenv("DB_URL")
    if explicit_url:
        return explicit_url

    driver = os.getenv("DB_DRIVER", "postgresql+asyncpg")
    user = os.getenv("DB_USER", "")
    password = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "5432"))
    name = os.getenv("DB_NAME", "game_platform")

    query: dict[str, str] = {}
    sslmode = os.getenv("DB_SSLMODE", "")
    if sslmode:
        query["sslmode"] = sslmode

    url = URL.create(
        drivername=driver,
        username=user,
        password=password or None,
        host=host,
        port=port,
        database=name,
        query=query or None,
    )
    return url.render_as_string(hide_password=False)


class Settings(BaseSettings):
    app_name: str = "game-platform"
    db_url: str = _build_db_url()
    db_user: str = os.getenv("DB_USER", "db_owner")
    db_password: str = os.getenv("DB_PASSWORD", "")
    admin_enabled: bool = os.getenv("ADMIN_ENABLED", "true").lower() == "true"
    telegram_token: str = os.getenv("TELEGRAM_TOKEN", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "replace-with-a-secure-secret")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
    )  # 7 days
    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()


def setup_logging():
    """Configure logging for the application"""
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("game_platform.log", encoding="utf-8"),
        ],
    )

    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)

    return logging.getLogger(__name__)
