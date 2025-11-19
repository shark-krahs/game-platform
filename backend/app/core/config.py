from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "tg-game-bot"
    db_url: str = "sqlite+aiosqlite:///./tg_game_bot.db"
    telegram_token: str = ""
    jwt_secret: str = "replace-with-a-secure-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    class Config:
        env_file = "../../.env"  # root .env


settings = Settings()
