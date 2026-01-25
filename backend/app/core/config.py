import logging
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "game-platform"
    db_url: str = "sqlite+aiosqlite:///./game-platform.db"
    telegram_token: str = ""
    jwt_secret: str = "replace-with-a-secure-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    log_level: str = "INFO"

    class Config:
        env_file = "../../.env"  # root .env


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
