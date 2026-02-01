"""
Pentago game logic implementation.
"""
import logging
import random
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from .board import PentagoBoard
from ..base import AbstractGameLogic, GameConfig, GameState, GameMove, TimeControl

logger = logging.getLogger(__name__)


class PentagoGame(AbstractGameLogic):
    """Pentago game logic implementation."""

    def __init__(self):
        self.board = PentagoBoard()
        self.config = GameConfig(
            game_type='pentago',
            name='Pentago',
            description='Connect four pieces in a row by placing and rotating quadrants',
            min_players=2,
            max_players=2,
            default_time_control=TimeControl(
                type='classical',
                initial_time=300,  # 5 minutes
                increment=3  # 3 seconds per move
            ),
            board_config={'size': 8, 'quadrant_size': 4}
        )

    def get_config(self) -> GameConfig:
        """Get game configuration."""
        return self.config

    def initialize_game(self, game_id: str, players: List[Dict[str, Any]], time_control: TimeControl) -> GameState:
        """Initialize a new game."""
        # Initialize players with time
        game_players = []
        for i, player in enumerate(players):
            game_players.append({
                'id': player.get('id', i),
                'name': player.get('name', f'Player {i + 1}'),
                'color': player.get('color', f'color_{i}'),
                'user_id': player.get('user_id')
            })

        time_control_str = f"{time_control.initial_time // 60}+{time_control.increment}"
        return GameState(
            game_id=game_id,
            game_type='pentago',
            status='waiting',
            players=game_players,
            current_player=random.randint(0, len(players) - 1),
            board_state=self.board.initialize_board(),
            time_remaining={i: float(time_control.initial_time) for i in range(len(players))},
            winner=None,
            moves_history=[],
            chat_history=[],
            created_at=datetime.now(),
            config=self.config,
            time_control=time_control,
            time_control_str=time_control_str
        )

    def process_move(self, game_state: GameState, move: Dict[str, Any], player_id: int) -> Tuple[GameState, bool]:
        """Process a move. Returns (new_state, move_valid)."""
        # Create a copy of the current state
        new_state = GameState(
            game_id=game_state.game_id,
            game_type=game_state.game_type,
            status=game_state.status,
            players=game_state.players.copy(),
            current_player=game_state.current_player,
            board_state=game_state.board_state.copy(),
            time_remaining=game_state.time_remaining.copy(),
            winner=game_state.winner,
            moves_history=game_state.moves_history.copy(),
            chat_history=game_state.chat_history.copy(),
            created_at=game_state.created_at,
            config=game_state.config,
            time_control=game_state.time_control,
            time_control_str=getattr(game_state, 'time_control_str', None),
            disconnect_timer=game_state.disconnect_timer,
            disconnected_player=game_state.disconnected_player
        )

        # Check if it's the player's turn
        if player_id != new_state.current_player:
            return new_state, False

        # Validate move
        if not self.board.is_valid_move(new_state.board_state, move, player_id):
            return new_state, False

        # Apply move
        new_state.board_state = self.board.apply_move(new_state.board_state, move, player_id)

        # Add increment to player's time
        increment = new_state.time_control.increment
        new_state.time_remaining[player_id] += increment

        # Record move
        game_move = GameMove(
            player_id=player_id,
            move_data=move,
            timestamp=datetime.now()
        )
        # Store board state after this move for replay reconstruction
        game_move.board_state_after = new_state.board_state
        game_move.time_remaining_after = new_state.time_remaining.copy()
        new_state.moves_history.append(game_move)

        # Handle first move phase
        if new_state.status == 'first_move':
            moves_made = len(new_state.moves_history)
            if moves_made == 1:
                # First move made, set up second player's first move timer
                new_state.first_move_player = (new_state.current_player + 1) % len(new_state.players)
                new_state.first_move_timer = 30.0
                logger.info(
                    f"Game {new_state.game_id} first move made by player {player_id}, giving 30 seconds to player {new_state.first_move_player}")
            elif moves_made == len(new_state.players):
                # Second move made, transition to playing
                new_state.status = 'playing'
                new_state.first_move_timer = None
                new_state.first_move_player = None
                logger.info(f"Game {new_state.game_id} both players made first moves, starting normal play")

        # Check for winner
        winner = self.board.check_winner(new_state.board_state)
        if winner is not None:
            new_state.winner = new_state.players[winner]['name']
            new_state.status = 'finished'
        elif self.board.is_draw(new_state.board_state):
            new_state.winner = None
            new_state.status = 'finished'
        else:
            # Next player's turn (only if game is still ongoing)
            if new_state.status != 'finished':
                new_state.current_player = (new_state.current_player + 1) % len(new_state.players)

        return new_state, True

    def get_valid_moves(self, game_state: GameState, player_id: int) -> List[Dict[str, Any]]:
        """Get all valid moves for a player."""
        moves = []
        grid = game_state.board_state['grid']

        for y in range(len(grid)):
            for x in range(len(grid[y])):
                if grid[y][x] is None:
                    # For each empty cell, all quadrant rotations are valid
                    for quadrant in range(4):
                        for direction in ['clockwise', 'counterclockwise']:
                            moves.append({
                                'x': x,
                                'y': y,
                                'quadrant': quadrant,
                                'direction': direction
                            })

        return moves

    def check_game_end(self, game_state: GameState) -> Optional[int]:
        """Check if game has ended. Returns winner_id or None."""
        if game_state.status == 'finished':
            return game_state.winner
        return None
