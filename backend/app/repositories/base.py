"""
Base repository class with common database operations.
"""
from typing import Generic, TypeVar, List, Optional, Any
from sqlmodel import select, Session
from app.db.database import async_session

T = TypeVar('T')


class BaseRepository(Generic[T]):
    """Base repository with common CRUD operations."""

    def __init__(self, model_class: type):
        self.model_class = model_class

    async def get_by_id(self, id: Any) -> Optional[T]:
        """Get entity by ID."""
        async with async_session() as session:
            result = await session.exec(
                select(self.model_class).where(self.model_class.id == id)
            )
            return result.first()

    async def get_all(self) -> List[T]:
        """Get all entities."""
        async with async_session() as session:
            result = await session.exec(select(self.model_class))
            return result.all()

    async def create(self, entity: T) -> T:
        """Create new entity."""
        async with async_session() as session:
            session.add(entity)
            await session.commit()
            await session.refresh(entity)
            return entity

    async def update(self, entity: T) -> T:
        """Update existing entity."""
        async with async_session() as session:
            session.add(entity)
            await session.commit()
            await session.refresh(entity)
            return entity

    async def delete(self, entity: T) -> None:
        """Delete entity."""
        async with async_session() as session:
            await session.delete(entity)
            await session.commit()
