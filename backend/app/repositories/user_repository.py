"""
User repository for database operations related to users.
"""

from typing import Optional

from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.db.database import async_session
from app.db.models import User
from .base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User operations."""

    def __init__(self):
        super().__init__(User)

    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username with game ratings loaded."""
        async with async_session() as session:
            result = await session.exec(
                select(User)
                .options(selectinload(User.game_ratings))
                .where(User.username == username)
            )
            return result.one_or_none()

    async def get_by_username_without_ratings(self, username: str) -> Optional[User]:
        """Get user by username without loading game ratings."""
        async with async_session() as session:
            result = await session.exec(select(User).where(User.username == username))
            return result.one_or_none()


    async def authenticate_user(
        self, username: str, password_hash: str
    ) -> Optional[User]:
        """Authenticate user by username and password hash."""
        user = await self.get_by_username(username)
        if not user or not user.password_hash:
            return None
        if user.password_hash != password_hash:
            return None
        return user

    async def create_user(
        self,
        username: str,
        password_hash: str,
        language: Optional[str] = None,
    ) -> User:
        """Create new user."""
        user = User(username=username, password_hash=password_hash)
        if language:
            user.language = language
        return await self.create(user)

    async def update_user_profile(self, user: User, **updates) -> User:
        """Update user profile fields."""
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        return await self.update(user)
