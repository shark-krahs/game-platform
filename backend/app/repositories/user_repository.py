"""
User repository for database operations related to users.
"""
from typing import Optional

from app.db.database import async_session
from app.db.models import User
from sqlalchemy.orm import selectinload
from sqlmodel import select

from .base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User operations."""

    def __init__(self):
        super().__init__(User)

    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username with game ratings loaded."""
        async with async_session() as session:
            result = await session.exec(
                select(User).options(selectinload(User.game_ratings)).where(User.username == username)
            )
            return result.one_or_none()

    async def get_by_username_without_ratings(self, username: str) -> Optional[User]:
        """Get user by username without loading game ratings."""
        async with async_session() as session:
            result = await session.exec(
                select(User).where(User.username == username)
            )
            return result.one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        async with async_session() as session:
            result = await session.exec(
                select(User).where(User.email == email)
            )
            return result.one_or_none()

    async def get_by_verification_token(self, token: str) -> Optional[User]:
        """Get user by email verification token."""
        async with async_session() as session:
            result = await session.exec(
                select(User).where(User.email_verification_token == token)
            )
            return result.one_or_none()

    async def get_by_password_reset_token(self, token: str) -> Optional[User]:
        """Get user by password reset token."""
        async with async_session() as session:
            result = await session.exec(
                select(User).where(User.password_reset_token == token)
            )
            return result.one_or_none()

    async def get_by_pending_email_token(self, token: str) -> Optional[User]:
        """Get user by pending email change token."""
        async with async_session() as session:
            result = await session.exec(
                select(User).where(User.pending_email_token == token)
            )
            return result.one_or_none()

    async def authenticate_user(self, username: str, password_hash: str) -> Optional[User]:
        """Authenticate user by username and password hash."""
        user = await self.get_by_username(username)
        if not user or not user.password_hash:
            return None
        if user.password_hash != password_hash:
            return None
        return user

    async def create_user(self, username: str, password_hash: str, email: str, language: Optional[str] = None) -> User:
        """Create new user."""
        user = User(username=username, password_hash=password_hash, email=email)
        if language:
            user.language = language
        return await self.create(user)

    async def clear_expired_verification(self, user: User) -> User:
        """Clear expired verification token on user."""
        user.email_verification_token = None
        user.email_verification_expires_at = None
        return await self.update(user)

    async def clear_expired_password_reset(self, user: User) -> User:
        """Clear expired password reset token on user."""
        user.password_reset_token = None
        user.password_reset_expires_at = None
        return await self.update(user)

    async def clear_expired_pending_email(self, user: User) -> User:
        """Clear expired pending email change token on user."""
        user.pending_email = None
        user.pending_email_token = None
        user.pending_email_expires_at = None
        user.pending_email_confirmed = False
        return await self.update(user)

    async def update_user_profile(self, user: User, **updates) -> User:
        """Update user profile fields."""
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        return await self.update(user)
