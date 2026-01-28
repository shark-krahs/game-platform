"""
Base game engine interfaces and shared functionality.
"""
import logging
import asyncio
import json
from typing import Dict, Any, Optional, List, Protocol
from datetime import datetime
from abc import ABC, abstractmethod

from app.games import GameFactory
from app.games.base import GameState, TimeControl
from app.services.bot_manager import is_bot_player, schedule_bot_move

logger = logging.getLogger(__name__)


class GameEngineInterface(Protocol):
    """Protocol for game engine implementations."""

    async def create_game(self, game_id: str, game_type: str, players: List[Dict[str, Any]], time_control: TimeControl) -> GameState:
        """Create a new game instance."""
        ...

    async def process_move(self, game_id: str, player_id: int, move_data: Dict[str, Any]) -> bool:
        """Process a move in the game."""
        ...

    def get_game_state(self, game_id: str) -> Optional[GameState]:
        """Get current game state."""
        ...

    async def end_game(self, game_id: str):
        """End a game and clean up."""
        ...


async def broadcast_state(game_id: str, game_state: GameState):
    """
    Broadcast current game state to all players in the game.

    Args:
        game_id: The game identifier
        game_state: GameState object
    """
    from app.services.game_state import broadcast_to_game

    state = {
        'type': 'state',
        'game_type': game_state.game_type,
        'players': [
            {
                'id': p['id'],
                'name': p.get('name'),
                'color': p.get('color'),
                'remaining': game_state.time_remaining[i]
            } for i, p in enumerate(game_state.players)
        ],
        'status': game_state.status,
        'current_player': game_state.current_player,
        'winner': game_state.winner,
    }

    # Handle board data differently for different games
    if game_state.game_type == 'pentago':
        # For pentago, send board as the grid directly
        state['board'] = game_state.board_state.get('grid', []) if game_state.board_state else []
    elif game_state.game_type == 'tetris':
        # For tetris, send both board and board_state
        state['board'] = game_state.board_state.get('grid', []) if game_state.board_state else []
        state['board_state'] = game_state.board_state
    else:
        # Default: send board_state
        state['board_state'] = game_state.board_state

    # Handle first move timer
    if game_state.status == 'first_move':
        state['first_move_timer'] = game_state.first_move_timer or 0
        state['first_move_player'] = game_state.first_move_player or 0

    # Handle move timer for Tetris (send current player's remaining time as first_move_timer)
    elif game_state.game_type == 'tetris' and game_state.status == 'playing':
        state['first_move_timer'] = game_state.time_remaining[game_state.current_player]
        state['first_move_player'] = game_state.current_player

    # Handle disconnection timer (only for non-Tetris games)
    if game_state.status == 'disconnect_wait' and game_state.game_type != 'tetris':
        state['disconnect_timer'] = game_state.disconnect_timer or 0
        state['disconnected_player'] = game_state.disconnected_player

    await broadcast_to_game(game_id, state)


class GameEngine:
    """Engine for managing games using the game factory."""

    def __init__(self):
        self.active_games: Dict[str, GameState] = {}
        self.finished_games: Dict[str, GameState] = {}  # Keep finished games for saving
        self.game_tasks: Dict[str, asyncio.Task] = {}

    async def _cleanup_finished_game(self, game_id: str, game_state: GameState):
        """Clean up a finished game - clear active games, update ratings, and auto-save."""
        # Move game to finished games for potential saving
        self.finished_games[game_id] = game_state

        # Remove from active games to stop the timer loop
        if game_id in self.active_games:
            del self.active_games[game_id]
            logger.info(f"Removed game {game_id} from active games")

        # Auto-save game for all authenticated players
        await self._auto_save_finished_game(game_id, game_state)

        # Clear active games for both players
        from app.repositories.user_active_game_repository import UserActiveGameRepository
        for player in game_state.players:
            logger.info(f"Clearing active game for player {player['name']}")
            if player.get('user_id') and not is_bot_player(player):
                await UserActiveGameRepository.clear_active_game(player['user_id'])
                logger.info(f"Cleared active game for player {player['name']}")
            else:
                logger.info(f"No user ID found for player {player['name']}")

        # Update ratings if this was a rated game
        if game_state.rated and game_state.winner is not None:
            from app.ratings import RatingCalculator
            from uuid import UUID
            player1_id_str = game_state.players[0]['user_id']
            player2_id_str = game_state.players[1]['user_id']

            winner_code = 0  # draw
            if game_state.winner == game_state.players[0]['name']:
                winner_code = 1  # player1 won
            elif game_state.winner == game_state.players[1]['name']:
                winner_code = 2  # player2 won

            if player1_id_str and player2_id_str:
                if is_bot_player(game_state.players[0]) or is_bot_player(game_state.players[1]):
                    try:
                        human_player = (
                            game_state.players[0]
                            if not is_bot_player(game_state.players[0])
                            else game_state.players[1]
                        )
                        human_player_id = UUID(human_player['user_id'])
                        human_winner_code = 1 if game_state.winner == human_player['name'] else 2
                        await RatingCalculator.update_ratings_after_bot_game(
                            game_state.game_type,
                            game_state.time_control_str,
                            human_player_id,
                            human_winner_code,
                        )
                        logger.info(f"Updated ratings for bot game {game_id}: winner={game_state.winner}")
                    except Exception as e:
                        logger.error(f"Failed to update ratings for bot game {game_id}: {e}")
                else:
                    try:
                        player1_uuid = UUID(player1_id_str)
                        player2_uuid = UUID(player2_id_str)
                        # Update ratings synchronously to ensure they're saved before user returns to lobby
                        await RatingCalculator.update_ratings_after_game(
                            game_state.game_type,
                            game_state.time_control_str,
                            player1_uuid, player2_uuid, winner_code
                        )
                        logger.info(f"Updated ratings for game {game_id}: winner={game_state.winner}")
                    except Exception as e:
                        logger.error(f"Failed to convert user IDs to UUID for ratings update: {e}")

        # Clean up finished game after some time
        asyncio.create_task(self._cleanup_finished_game_after_delay(game_id))

    async def _auto_save_finished_game(self, game_id: str, game_state: GameState):
        """Auto-save finished game for all authenticated players."""
        from app.repositories.saved_game_repository import SavedGameRepository
        from uuid import UUID
        from datetime import datetime

        repo = SavedGameRepository()
        logger.info(f"Auto-saving game {game_id} for all authenticated players")

        for player in game_state.players:
            if player.get('user_id') and not is_bot_player(player):
                try:
                    user_id = UUID(player['user_id'])
                    title = f"{game_state.game_type.title()} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

                    # Convert time_remaining dict to proper format
                    time_remaining = {}
                    for i, time_left in game_state.time_remaining.items():
                        time_remaining[i] = float(time_left)

                    # Convert winner from name to index
                    winner_index = None
                    if game_state.winner:
                        for i, player_info in enumerate(game_state.players):
                            if player_info['name'] == game_state.winner:
                                winner_index = i
                                break

                    logger.info(f"Saving game {game_id} for user {player['name']} (ID: {user_id})")

                    # Create saved game
                    saved_game = await repo.create_saved_game(
                        user_id=user_id,
                        game_id=game_id,
                        game_type=game_state.game_type,
                        title=title,
                        game_state=game_state.board_state,
                        players=game_state.players,
                        current_player=game_state.current_player,
                        time_remaining=time_remaining,
                        winner=winner_index,
                        moves_history=[],  # Will be populated from moves_history if available
                        time_control={
                            'type': game_state.time_control.type,
                            'initial_time': game_state.time_control.initial_time,
                            'increment': game_state.time_control.increment
                        },
                        rated=game_state.rated,
                        chat_history=getattr(game_state, 'chat_history', [])
                    )

                    # Add moves history if available - save board state after each move
                    if hasattr(game_state, 'moves_history') and game_state.moves_history:
                        move_number = 1
                        for move in game_state.moves_history:
                            await repo.add_game_move(
                                saved_game_id=saved_game.id,
                                move_number=move_number,
                                player_id=move.player_id,
                                move_data=move.move_data,
                                board_state_after=getattr(move, 'board_state_after', game_state.board_state),
                                time_remaining_after=getattr(move, 'time_remaining_after', game_state.time_remaining),
                                timestamp=move.timestamp,
                                time_spent=0.0  # Not tracked currently
                            )
                            move_number += 1

                    logger.info(f"Successfully auto-saved game {game_id} for user {player['name']} with ID {saved_game.id}")

                except Exception as e:
                    logger.error(f"Failed to auto-save game {game_id} for user {player.get('name', 'unknown')}: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
            else:
                logger.info(f"Skipping auto-save for anonymous player {player.get('name', 'unknown')}")

    async def _cleanup_finished_game_after_delay(self, game_id: str, delay_seconds: int = 300):
        """Clean up finished game after delay to allow saving."""
        await asyncio.sleep(delay_seconds)
        if game_id in self.finished_games:
            del self.finished_games[game_id]
            logger.info(f"Cleaned up finished game {game_id} after {delay_seconds} seconds")

    async def create_game(self, game_id: str, game_type: str, players: List[Dict[str, Any]], time_control: TimeControl) -> GameState:
        """Create a new game instance."""
        logic = GameFactory.create_game_logic(game_type)
        game_state = logic.initialize_game(game_id, players, time_control)

        # Set time control string for ratings
        time_control_str = f"{game_state.time_control.initial_time // 60}+{game_state.time_control.increment}"
        game_state.time_control_str = time_control_str
        game_state.first_move_count = 0

        self.active_games[game_id] = game_state

        # Start timer task
        task = asyncio.create_task(self._game_timer(game_id))
        self.game_tasks[game_id] = task

        logger.info(f"Created {game_type} game {game_id} with time control {time_control_str}")
        return game_state

    async def process_move(self, game_id: str, player_id: int, move_data: Dict[str, Any]) -> bool:
        """Process a move in the game."""
        game_state = self.active_games.get(game_id)
        if not game_state:
            return False

        logic = GameFactory.create_game_logic(game_state.game_type)
        old_current_player = game_state.current_player
        new_state, valid = logic.process_move(game_state, move_data, player_id)

        if valid:
            # Handle first move phase for Pentago (each player must make one move before starting main timer)
            if new_state.status == 'first_move':
                # Increment move count for first move phase
                if not hasattr(new_state, 'first_move_count'):
                    new_state.first_move_count = 0
                new_state.first_move_count += 1
                logger.info(f"Game {game_id} first move phase: move {new_state.first_move_count}/2 completed")

                # Check if both players have made their first moves
                if new_state.first_move_count >= 2:  # Both players made their moves
                    new_state.status = 'playing'
                    new_state.first_move_timer = None
                    new_state.first_move_player = None
                    logger.info(f"Game {game_id} both players made first moves, transitioned to playing mode")

            # Record move in history only when player changes (turn completed) - but not during first_move phase
            if new_state.current_player != old_current_player and new_state.status != 'first_move':
                from app.games.base import GameMove
                from datetime import datetime
                move = GameMove(
                    player_id=old_current_player,  # Use the player who completed the turn
                    move_data={'type': 'turn_completed'},  # Generic turn completion marker
                    timestamp=datetime.now()
                )
                # Store board state after this completed turn
                move.board_state_after = new_state.board_state
                move.time_remaining_after = new_state.time_remaining.copy()
                new_state.moves_history.append(move)
                logger.info(f"Game {game_id} turn completed by player {old_current_player}, recorded in history")

            self.active_games[game_id] = new_state
            await broadcast_state(game_id, new_state)

            # Schedule bot move if it's bot's turn
            if any(is_bot_player(player) for player in new_state.players):
                bot_player = new_state.players[new_state.current_player]
                if is_bot_player(bot_player):
                    difficulty = bot_player.get("difficulty", 1)
                    asyncio.create_task(schedule_bot_move(new_state, game_id, difficulty, self))

        return valid

    def get_game_state(self, game_id: str) -> Optional[GameState]:
        """Get current game state."""
        return self.active_games.get(game_id) or self.finished_games.get(game_id)

    async def end_game(self, game_id: str):
        """End a game and clean up."""
        if game_id in self.active_games:
            del self.active_games[game_id]

        if game_id in self.game_tasks:
            self.game_tasks[game_id].cancel()
            del self.game_tasks[game_id]

        logger.info(f"Ended game {game_id}")

    async def _game_timer(self, game_id: str):
        """Timer loop for a game."""
        while game_id in self.active_games:
            game_state = self.active_games[game_id]
            logger.info(f"Game {game_id} timer tick - status: {game_state.status}, game_type: {game_state.game_type}, current_player: {game_state.current_player}")

            # Handle first move initialization
            if game_state.status == 'waiting' and len(game_state.players) == 2:
                if game_state.game_type == 'tetris':
                    # For Tetris, start directly in playing mode
                    game_state.status = 'playing'
                    logger.info(f"Game {game_id} Tetris started directly in playing mode")
                else:
                    # For other games, use first_move phase
                    game_state.status = 'first_move'
                    game_state.first_move_player = game_state.current_player
                    game_state.first_move_timer = 30.0
                    logger.info(f"Game {game_id} first move initialized for player {game_state.first_move_player}")

            # Handle first move timer (only for non-Tetris games)
            if game_state.status == 'first_move':
                game_state.first_move_timer -= 1
                if game_state.first_move_timer <= 0:
                    # First move timeout - current player loses
                    opponent = (game_state.current_player + 1) % len(game_state.players)
                    game_state.winner = game_state.players[opponent]['name']
                    game_state.status = 'finished'
                    logger.info(f"Game {game_id} first move timeout, player {game_state.first_move_player} loses")
                    await broadcast_state(game_id, game_state)
                    await self._cleanup_finished_game(game_id, game_state)
                    break
                await broadcast_state(game_id, game_state)

            # Handle playing mode games (Pentago timer)
            elif game_state.status in ['playing', 'disconnect_wait'] and game_state.game_type != 'tetris':
                # Only for non-Tetris games
                logger.info(
                    f"Game {game_id} ENTERING PENTAGO TIMER BLOCK - status: {game_state.status}, game_type: {game_state.game_type}, current_player: {game_state.current_player}"
                )

                if game_state.current_player < len(game_state.time_remaining):
                    old_time = game_state.time_remaining[game_state.current_player]
                    game_state.time_remaining[game_state.current_player] -= 1
                    new_time = game_state.time_remaining[game_state.current_player]
                    logger.info(
                        f"Game {game_id} PENTAGO TIMER: player {game_state.current_player} time {old_time} -> {new_time}"
                    )

                    # Broadcast updated state so frontend sees timer changes
                    await broadcast_state(game_id, game_state)

                    if game_state.time_remaining[game_state.current_player] <= 0:
                        # Time out - current player loses
                        opponent = (game_state.current_player + 1) % len(game_state.players)
                        game_state.winner = game_state.players[opponent]['name']
                        game_state.status = 'finished'
                        logger.info(
                            f"Game {game_id} PENTAGO TIMEOUT - player {game_state.current_player} loses"
                        )
                        await broadcast_state(game_id, game_state)
                        await self._cleanup_finished_game(game_id, game_state)
                        break
                else:
                    logger.error(
                        f"Game {game_id} PENTAGO TIMER ERROR - invalid current_player {game_state.current_player}, time_remaining length: {len(game_state.time_remaining)}"
                    )

            # Handle Tetris falling piece
            elif game_state.game_type == 'tetris' and game_state.status == 'playing':
                # Start falling piece if none exists (when player's turn begins)
                if not game_state.board_state.get('falling_piece'):
                    from app.games.tetris.board import TetrisBoard
                    board = TetrisBoard()
                    game_state.board_state = board.start_falling_piece(game_state.board_state)
                    logger.info(f"Game {game_id} started falling piece for player {game_state.current_player}")

                # Move falling piece down automatically
                if game_state.board_state.get('falling_piece'):
                    from app.games.tetris.board import TetrisBoard
                    board = TetrisBoard()
                    old_board_state = game_state.board_state
                    game_state.board_state = board.move_falling_piece(game_state.board_state, 'down')

                    # If piece was placed (no longer falling), switch turns
                    if not game_state.board_state.get('falling_piece') and old_board_state.get('falling_piece'):
                        # Piece was placed, switch to next player
                        next_player = (game_state.current_player + 1) % len(game_state.players)
                        game_state.current_player = next_player

                        # Reset timer for new player (use increment if available, otherwise initial time)
                        if game_state.time_control.increment > 0:
                            game_state.time_remaining[game_state.current_player] = game_state.time_control.increment

                        logger.info(f"Game {game_id} piece placed, switching to player {next_player}, timer reset to {game_state.time_remaining[game_state.current_player]}")

                        # Check if next player can place a piece
                        if not game_state.board_state.get('next_pieces'):
                            # No more pieces, current player wins
                            game_state.winner = game_state.players[game_state.current_player]['name']
                            game_state.status = 'finished'
                            logger.info(f"Game {game_id} ended - no more pieces")
                        else:
                            # Start new falling piece for next player
                            game_state.board_state = board.start_falling_piece(game_state.board_state)
                            logger.info(f"Game {game_id} started new piece for player {next_player}")

                # Update move timer
                game_state.time_remaining[game_state.current_player] -= 1
                if game_state.time_remaining[game_state.current_player] <= 0:
                    # Time out - current player loses
                    opponent = (game_state.current_player + 1) % len(game_state.players)
                    game_state.winner = game_state.players[opponent]['name']
                    game_state.status = 'finished'
                    logger.info(f"Game {game_id} timeout, player {game_state.current_player} loses")

            # Handle disconnection timer (only for non-Tetris games)
            if (
                game_state.status != 'finished'
                and hasattr(game_state, 'disconnect_timer')
                and game_state.disconnect_timer
                and game_state.disconnect_timer > 0
                and game_state.game_type != 'tetris'
            ):
                game_state.disconnect_timer -= 1

                if game_state.disconnect_timer <= 0:
                    # Disconnection timeout - disconnected player loses
                    winner_index = (game_state.disconnected_player + 1) % len(game_state.players)
                    game_state.winner = game_state.players[winner_index]['name']
                    game_state.status = 'finished'
                    logger.info(
                        f"Game {game_id} disconnection timeout, player {game_state.disconnected_player} loses"
                    )
                    # Clear disconnection fields
                    game_state.disconnect_timer = None
                    game_state.disconnected_player = None
                await broadcast_state(game_id, game_state)

            # Check if game finished and clean up
            if game_state.status == 'finished':
                await self._cleanup_finished_game(game_id, game_state)
                break

            await asyncio.sleep(1)


# Global instance
game_engine = GameEngine()
