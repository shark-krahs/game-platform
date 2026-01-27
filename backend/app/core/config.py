import logging
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Load .env from backend/.env or root .env if present
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")


class Settings(BaseSettings):
    app_name: str = "game-platform"
    db_url: str = os.getenv("DB_URL", "sqlite+aiosqlite:///./game-platform.db")
    telegram_token: str = os.getenv("TELEGRAM_TOKEN", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "replace-with-a-secure-secret")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    smtp_use_ssl: bool = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    smtp_timeout_seconds: int = int(os.getenv("SMTP_TIMEOUT_SECONDS", "30"))
    smtp_debug: bool = os.getenv("SMTP_DEBUG", "false").lower() == "true"
    smtp_force_ipv4: bool = os.getenv("SMTP_FORCE_IPV4", "false").lower() == "true"
    mail_from_name: str = os.getenv("MAIL_FROM_NAME", "Game Platform")
    mail_from_address: str = os.getenv("MAIL_FROM_ADDRESS", "")
    frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    email_verification_expire_minutes: int = int(os.getenv("EMAIL_VERIFICATION_EXPIRE_MINUTES", "60"))
    email_verification_resend_cooldown_seconds: int = int(os.getenv("EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS", "60"))
    password_reset_expire_minutes: int = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30"))
    email_change_expire_minutes: int = int(os.getenv("EMAIL_CHANGE_EXPIRE_MINUTES", "60"))

settings = Settings()


def setup_logging():
    """Configure logging for the application"""
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('game_platform.log', encoding='utf-8')
        ]
    )

    # Set specific loggers
    logging.getLogger('uvicorn').setLevel(logging.WARNING)
    logging.getLogger('fastapi').setLevel(logging.WARNING)

    return logging.getLogger(__name__)
