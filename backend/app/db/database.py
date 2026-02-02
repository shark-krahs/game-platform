from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.app.core.config import settings

engine = create_async_engine(settings.db_url, echo=False, future=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    # Для простоты: создаётся синхронно при стартe в dev; для продакшна используйте Alembic
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
