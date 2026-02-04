"""
Repository for managing user active games.
"""

import logging
from typing import Optional
from uuid import UUID

from backend.app.db.database import async_session
from backend.app.db.models import User

logger = logging.getLogger(__name__)


class UserActiveGameRepository:
    """Repository for managing user active games."""

    @staticmethod
    async def set_active_game(user_id: str, game_id: str) -> bool:
        """Set active game for user."""
        try:
            user_uuid = UUID(user_id)
            async with async_session() as session:
                user = await session.get(User, user_uuid)
                if user:
                    user.active_game_id = game_id
                    session.add(user)
                    await session.commit()
                    logger.info(f"Set active game {game_id} for user {user_uuid}")
                    return True
                return False
        except Exception as e:
            logger.error(f"Failed to set active game for user {user_id}: {e}")
            return False

    @staticmethod
    async def get_active_game(user_id: str) -> Optional[str]:
        """Get active game ID for user."""
        try:
            user_uuid = UUID(user_id)
            async with async_session() as session:
                user = await session.get(User, user_uuid)
                return user.active_game_id if user else None
        except Exception as e:
            logger.error(f"Failed to get active game for user {user_id}: {e}")
            return None

    @staticmethod
    async def clear_active_game(user_id: str) -> bool:
        """Clear active game for user."""
        try:
            user_uuid = UUID(user_id)
            async with async_session() as session:
                user = await session.get(User, user_uuid)
                if user:
                    user.active_game_id = None
                    session.add(user)
                    await session.commit()
                    logger.info(f"Cleared active game for user {user_uuid}")
                    return True
                return False
        except Exception as e:
            logger.error(f"Failed to clear active game for user {user_id}: {e}")
            return False
