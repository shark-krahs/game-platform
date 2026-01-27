"""
Saved game repository for database operations related to saved games.
"""
from typing import List, Optional
from uuid import UUID
from sqlmodel import select
from sqlalchemy.orm import selectinload
from app.db.database import async_session
from app.db.models import SavedGame, GameHistory, User
from .base import BaseRepository
import json


class SavedGameRepository(BaseRepository[SavedGame]):
    """Repository for SavedGame operations."""

    def __init__(self):
        super().__init__(SavedGame)

    async def get_by_user_id(self, user_id: UUID) -> List[SavedGame]:
        """Get all saved games for a user with moves loaded."""
        async with async_session() as session:
            result = await session.exec(
                select(SavedGame)
                .options(selectinload(SavedGame.moves), selectinload(SavedGame.user))
                .where(SavedGame.user_id == user_id)
                .order_by(SavedGame.created_at.desc())
            )
            return result.all()

    async def get_by_id_with_moves(self, game_id: UUID) -> Optional[SavedGame]:
        """Get saved game by ID with moves and user loaded."""
        async with async_session() as session:
            result = await session.exec(
                select(SavedGame)
                .options(selectinload(SavedGame.moves), selectinload(SavedGame.user))
                .where(SavedGame.id == game_id)
            )
            return result.first()

    async def create_saved_game(self, user_id: UUID, game_id: str, game_type: str, title: str,
                               game_state: dict, players: list, current_player: int,
                               time_remaining: dict, winner: Optional[int], moves_history: list,
                               time_control: dict, rated: bool = False,
                               chat_history: Optional[list] = None) -> SavedGame:
        """Create a new saved game."""
        saved_game = SavedGame(
            user_id=user_id,
            game_id=game_id,
            game_type=game_type,
            title=title,
            status='ongoing' if winner is None else 'finished',
            current_player=current_player,
            winner=winner,
            rated=rated
        )

        # Set JSON fields
        saved_game.set_board_state(game_state)
        saved_game.set_players(players)
        saved_game.set_time_remaining(time_remaining)
        saved_game.set_moves_history(moves_history)
        saved_game.set_chat_history(chat_history or [])
        saved_game.set_time_control(time_control)

        return await self.create(saved_game)

    async def update_saved_game(self, saved_game: SavedGame, **updates) -> SavedGame:
        """Update saved game fields."""
        for key, value in updates.items():
            if hasattr(saved_game, key):
                setattr(saved_game, key, value)
        return await self.update(saved_game)

    async def add_game_move(self, saved_game_id: UUID, move_number: int, player_id: int,
                           move_data: dict, board_state_after: dict, timestamp, time_spent: float) -> GameHistory:
        """Add a move to the game history."""
        move = GameHistory(
            saved_game_id=saved_game_id,
            move_number=move_number,
            player_id=player_id,
            move_data=json.dumps(move_data),
            board_state_after=json.dumps(board_state_after),
            timestamp=timestamp,
            time_spent=time_spent
        )
        async with async_session() as session:
            session.add(move)
            await session.commit()
            await session.refresh(move)
            return move
