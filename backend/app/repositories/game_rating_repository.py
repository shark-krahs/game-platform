"""
Game rating repository for database operations related to game ratings.
"""
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from sqlmodel import select
from app.db.database import async_session
from app.db.models import GameRating
from .base import BaseRepository


class GameRatingRepository(BaseRepository[GameRating]):
    """Repository for GameRating operations."""

    def __init__(self):
        super().__init__(GameRating)

    async def get_or_create_rating(self, user_id: UUID, game_type: str) -> GameRating:
        """Get existing game rating or create new one with defaults."""
        async with async_session() as session:
            result = await session.exec(
                select(GameRating).where(
                    GameRating.user_id == user_id,
                    GameRating.game_type == game_type,
                )
            )
            rating = result.first()

            if not rating:
                rating = GameRating(
                    user_id=user_id,
                    game_type=game_type,
                    rating=1500.0,
                    rd=350.0,
                    volatility=0.06,
                    games_played=0
                )
                session.add(rating)
                await session.commit()
                await session.refresh(rating)

            return rating

    async def get_game_rating(self, user_id: UUID, game_type: str) -> Optional[GameRating]:
        """Get game rating for user, returns None if not found."""
        async with async_session() as session:
            result = await session.exec(
                select(GameRating).where(
                    GameRating.user_id == user_id,
                    GameRating.game_type == game_type,
                )
            )
            return result.first()

    async def update_rating_after_game(self, rating: GameRating) -> GameRating:
        """Update rating after game completion."""
        rating.last_played = datetime.now()
        rating.games_played += 1
        return await self.update(rating)

    async def get_user_ratings(self, user_id: UUID) -> List[GameRating]:
        """Get all game ratings for a user."""
        async with async_session() as session:
            result = await session.exec(
                select(GameRating).where(GameRating.user_id == user_id)
            )
            return result.all()
