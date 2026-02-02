"""
Tetris-specific game engine implementation.
"""
import asyncio
import logging
from typing import Dict, Any, Optional, List

from backend.app.games import GameFactory
from backend.app.games.base import GameState, TimeControl
from backend.app.services.bot_manager import is_bot_player, schedule_bot_move
from .game_engine import GameEngineInterface, broadcast_state

logger = logging.getLogger(__name__)


class TetrisGameEngine(GameEngineInterface):
    """Dedicated game engine for Tetris games."""

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
            logger.info(f"Removed Tetris game {game_id} from active games")

        # Auto-save game for all authenticated players
        await self._auto_save_finished_game(game_id, game_state)

        # Clear active games for both players
        from backend.app.repositories.user_active_game_repository import UserActiveGameRepository
        for player in game_state.players:
            if player.get('user_id') and not is_bot_player(player):
                await UserActiveGameRepository.clear_active_game(player['user_id'])

        # Update ratings if this was a rated game
        if game_state.rated and game_state.winner is not None:
            from backend.app.ratings import RatingCalculator
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
                        logger.info(f"Updated ratings for bot Tetris game {game_id}: winner={game_state.winner}")
                    except Exception as e:
                        logger.error(f"Failed to update ratings for bot Tetris game {game_id}: {e}")
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
                        logger.info(f"Updated ratings for Tetris game {game_id}: winner={game_state.winner}")
                    except Exception as e:
                        logger.error(f"Failed to convert user IDs to UUID for Tetris ratings update: {e}")

        # Clean up finished game after some time
        asyncio.create_task(self._cleanup_finished_game_after_delay(game_id))

    async def _auto_save_finished_game(self, game_id: str, game_state: GameState):
        """Auto-save finished game for all authenticated players."""
        from backend.app.repositories.saved_game_repository import SavedGameRepository
        from uuid import UUID
        from datetime import datetime

        repo = SavedGameRepository()
        logger.info(f"Auto-saving Tetris game {game_id} for all authenticated players")

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

                    logger.info(f"Saving Tetris game {game_id} for user {player['name']} (ID: {user_id})")

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

                    logger.info(
                        f"Successfully auto-saved Tetris game {game_id} for user {player['name']} with ID {saved_game.id}")

                except Exception as e:
                    logger.error(
                        f"Failed to auto-save Tetris game {game_id} for user {player.get('name', 'unknown')}: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
            else:
                logger.info(f"Skipping auto-save for anonymous player {player.get('name', 'unknown')}")

    async def _cleanup_finished_game_after_delay(self, game_id: str, delay_seconds: int = 300):
        """Clean up finished game after delay to allow saving."""
        await asyncio.sleep(delay_seconds)
        if game_id in self.finished_games:
            del self.finished_games[game_id]
            logger.info(f"Cleaned up finished Tetris game {game_id} after {delay_seconds} seconds")

    async def create_game(self, game_id: str, game_type: str, players: List[Dict[str, Any]],
                          time_control: TimeControl) -> GameState:
        """Create a new Tetris game instance."""
        logic = GameFactory.create_game_logic(game_type)
        game_state = logic.initialize_game(game_id, players, time_control)

        # For Tetris, start immediately in playing mode with falling piece
        game_state.status = 'playing'

        # Set initial time only for the starting player
        game_state.time_remaining[game_state.current_player] = game_state.time_control.increment

        # Create initial falling piece
        from backend.app.games.tetris.board import TetrisBoard
        board = TetrisBoard()
        game_state.board_state = board.start_falling_piece(game_state.board_state)

        self.active_games[game_id] = game_state

        # Set time control string for ratings
        time_control_str = f"tetris_0+{int(game_state.time_control.increment)}"
        game_state.time_control_str = time_control_str

        # Start timer task
        task = asyncio.create_task(self._game_timer(game_id))
        self.game_tasks[game_id] = task

        logger.info(f"Created Tetris game {game_id} with time control {time_control_str} and initial falling piece")
        return game_state

    async def process_move(self, game_id: str, player_id: int, move_data: Dict[str, Any]) -> bool:
        """Process a Tetris move."""
        game_state = self.active_games.get(game_id)
        if not game_state:
            return False

        logic = GameFactory.create_game_logic(game_state.game_type)
        new_state, valid = logic.process_move(game_state, move_data, player_id)

        if valid:
            # Check if player changed (turn switched)
            if new_state.current_player != game_state.current_player:
                # Record the move in history
                from backend.app.games.base import GameMove
                from datetime import datetime
                move = GameMove(
                    player_id=player_id,
                    move_data=move_data,
                    timestamp=datetime.now()
                )
                # Store board state after this completed turn
                move.board_state_after = new_state.board_state
                move.time_remaining_after = new_state.time_remaining.copy()
                new_state.moves_history.append(move)
                # Reset timer for the new current player
                new_state.time_remaining[new_state.current_player] = new_state.time_control.increment
                logger.info(f"Tetris game {game_id} turn switched to player {new_state.current_player}, timer reset")

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
        """Get current Tetris game state."""
        return self.active_games.get(game_id) or self.finished_games.get(game_id)

    async def end_game(self, game_id: str):
        """End a Tetris game and clean up."""
        if game_id in self.active_games:
            del self.active_games[game_id]

        if game_id in self.game_tasks:
            self.game_tasks[game_id].cancel()
            del self.game_tasks[game_id]

        logger.info(f"Ended Tetris game {game_id}")

    async def _game_timer(self, game_id: str):
        """Timer loop for Tetris games."""
        while game_id in self.active_games:
            game_state = self.active_games[game_id]

            # Handle Tetris gameplay
            if game_state.game_type == 'tetris' and game_state.status == 'playing':
                # Start falling piece if none exists
                if not game_state.board_state.get('falling_piece'):
                    from backend.app.games.tetris.board import TetrisBoard
                    board = TetrisBoard()
                    game_state.board_state = board.start_falling_piece(game_state.board_state)
                    logger.info(f"Tetris game {game_id} started falling piece for player {game_state.current_player}")

                # Move falling piece down automatically
                if game_state.board_state.get('falling_piece'):
                    from backend.app.games.tetris.board import TetrisBoard
                    board = TetrisBoard()
                    old_board_state = game_state.board_state
                    game_state.board_state = board.move_falling_piece(game_state.board_state, 'down')

                    # Check for top-out
                    if game_state.board_state.get('top_out'):
                        # Current player loses due to top-out
                        opponent = (game_state.current_player + 1) % len(game_state.players)
                        game_state.winner = game_state.players[opponent]['name']
                        game_state.status = 'finished'
                        logger.info(f"Tetris game {game_id} top-out, player {game_state.current_player} loses")
                        await broadcast_state(game_id, game_state)
                        await self._cleanup_finished_game(game_id, game_state)
                        break

                    if not game_state.board_state.get('falling_piece') and old_board_state.get('falling_piece'):
                        if 'lines_cleared' in game_state.board_state:
                            lines_cleared = game_state.board_state['lines_cleared']
                            if lines_cleared > 0:
                                score = board._calculate_score(lines_cleared)
                                game_state.board_state['scores'][game_state.current_player] += score

                        # Switch to next player
                        next_player = (game_state.current_player + 1) % len(game_state.players)
                        game_state.current_player = next_player

                        # Reset timer only for the new current player
                        game_state.time_remaining[game_state.current_player] = game_state.time_control.increment

                        logger.info(f"Tetris game {game_id} piece placed, switching to player {next_player}")

                        # Start new falling piece for next player
                        game_state.board_state = board.start_falling_piece(game_state.board_state)
                        logger.info(f"Tetris game {game_id} started new piece for player {next_player}")

                        # Broadcast state immediately after turn change
                        await broadcast_state(game_id, game_state)

                        # Schedule bot move if it's bot's turn
                        if any(is_bot_player(player) for player in game_state.players):
                            bot_player = game_state.players[game_state.current_player]
                            if is_bot_player(bot_player):
                                difficulty = bot_player.get("difficulty", 1)
                                asyncio.create_task(schedule_bot_move(game_state, game_id, difficulty, self))

                # Update move timer only if player has a falling piece
                if game_state.board_state.get('falling_piece'):
                    game_state.time_remaining[game_state.current_player] -= 1
                    if game_state.time_remaining[game_state.current_player] <= 0:
                        opponent = (game_state.current_player + 1) % len(game_state.players)
                        game_state.winner = game_state.players[opponent]['name']
                        game_state.status = 'finished'
                        logger.info(f"Tetris game {game_id} timeout, player {game_state.current_player} loses")
                        await broadcast_state(game_id, game_state)
                        await self._cleanup_finished_game(game_id, game_state)
                        break

            await broadcast_state(game_id, game_state)

            if game_state.status == 'finished':
                await self._cleanup_finished_game(game_id, game_state)
                break

            await asyncio.sleep(1)


# Global Tetris game engine instance
tetris_game_engine = TetrisGameEngine()
