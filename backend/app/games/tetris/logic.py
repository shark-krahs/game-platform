"""
Tetris for two players game logic implementation.
"""
import logging
import random
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from ..base import AbstractGameLogic, GameConfig, GameState, GameMove, TimeControl
from .board import TetrisBoard

logger = logging.getLogger(__name__)


class TetrisGame(AbstractGameLogic):
    """Tetris game logic implementation for two players."""

    def __init__(self):
        self.board = TetrisBoard()
        self.config = GameConfig(
            game_type='tetris',
            name='Tetris for Two',
            description='Place tetris pieces alternately on a shared board. Game ends when a player cannot place their piece.',
            min_players=2,
            max_players=2,
            default_time_control=TimeControl(
                type='move_time',
                initial_time=0,
                increment=10
            ),
            board_config={'width': 10, 'height': 20}
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
                'name': player.get('name', f'Player {i+1}'),
                'color': player.get('color', f'color_{i}'),
                'user_id': player.get('user_id')
            })

        return GameState(
            game_id=game_id,
            game_type='tetris',
            status='waiting',
            players=game_players,
            current_player=random.randint(0, len(players) - 1),
            board_state=self.board.initialize_board(),
            time_remaining={i: float(time_control.increment) for i in range(len(players))},
            winner=None,
            moves_history=[],
            created_at=datetime.now(),
            config=self.config,
            time_control=time_control
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
            created_at=game_state.created_at,
            config=game_state.config,
            time_control=game_state.time_control,
            time_control_str=game_state.time_control_str,
            rated=game_state.rated,
            first_move_timer=game_state.first_move_timer,
            first_move_player=game_state.first_move_player,
            disconnect_timer=game_state.disconnect_timer,
            disconnected_player=game_state.disconnected_player
        )

        # Check if it's the player's turn
        if player_id != new_state.current_player:
            return new_state, False

        action = move.get('action')

        if action == 'move':
            # Handle piece movement
            direction = move.get('direction')
            if direction in ['left', 'right', 'down', 'rotate']:
                new_state.board_state = self.board.move_falling_piece(new_state.board_state, direction)

                # If piece was placed after moving down, switch turns
                if direction == 'down' and not new_state.board_state.get('falling_piece'):
                    # Piece was placed, switch to next player
                    next_player = (new_state.current_player + 1) % len(new_state.players)
                    new_state.current_player = next_player

                    # Check if next player can make a move
                    if not self._can_player_make_move(new_state.board_state, next_player):
                        # Current player wins - opponent cannot place piece
                        new_state.winner = game_state.players[new_state.current_player]['name']
                        new_state.status = 'finished'
                        return new_state, True

                    # Start new falling piece for next player
                    new_state.board_state = self.board.start_falling_piece(new_state.board_state)

                return new_state, True

        elif action == 'lock':
            # Handle hard drop - move down until piece places
            while new_state.board_state.get('falling_piece'):
                new_state.board_state = self.board.move_falling_piece(new_state.board_state, 'down')

                # Check for top-out
                if new_state.board_state.get('top_out'):
                    # Current player loses due to top-out
                    opponent = (new_state.current_player + 1) % len(new_state.players)
                    new_state.winner = game_state.players[opponent]['name']
                    new_state.status = 'finished'
                    return new_state, True

            # Piece has been placed - add score for lines cleared
            if 'lines_cleared' in new_state.board_state:
                lines_cleared = new_state.board_state['lines_cleared']
                if lines_cleared > 0:
                    score = self.board._calculate_score(lines_cleared)
                    new_state.board_state['scores'][new_state.current_player] += score
                    logger.info(f"Tetris manual placement: player {new_state.current_player} scored {score} points for {lines_cleared} lines")

            # Switch to next player
            next_player = (new_state.current_player + 1) % len(new_state.players)
            new_state.current_player = next_player

            # Check if next player can make a move
            if not self._can_player_make_move(new_state.board_state, next_player):
                # Current player wins - opponent cannot place piece
                new_state.winner = game_state.players[new_state.current_player]['name']
                new_state.status = 'finished'
                return new_state, True

            # Start new falling piece for next player
            new_state.board_state = self.board.start_falling_piece(new_state.board_state)

            return new_state, True

        return new_state, False

    def _can_player_make_move(self, board_state: Dict[str, Any], player_id: int) -> bool:
        """Check if a player can make any move with the current next piece."""
        next_pieces = board_state.get('next_pieces', [])
        if not next_pieces:
            return False

        piece_type = next_pieces[0]
        return self._has_valid_moves(board_state, piece_type, player_id)

    def _has_valid_moves(self, board_state: Dict[str, Any], piece_type: str, player_id: int) -> bool:
        """Check if there are any valid moves for a piece."""
        for rotation in range(4):
            piece_shape = self.board.PIECES[piece_type][rotation]

            # Calculate actual bounding box of the piece
            min_x, max_x, min_y, max_y = self._get_piece_bounds(piece_shape)
            actual_width = max_x - min_x + 1
            actual_height = max_y - min_y + 1

            # Check positions where the piece's bounding box fits
            for x in range(self.board.BOARD_WIDTH - actual_width + 1):
                for y in range(self.board.BOARD_HEIGHT - actual_height + 1):
                    move = {'piece_type': piece_type, 'rotation': rotation, 'x': x, 'y': y}
                    if self.board.is_valid_move(board_state, move, player_id):
                        return True
        return False

    def _get_piece_bounds(self, piece_shape: List[List[int]]) -> Tuple[int, int, int, int]:
        """Get the bounding box of a piece shape."""
        min_x, min_y = float('inf'), float('inf')
        max_x, max_y = 0, 0

        for y in range(len(piece_shape)):
            for x in range(len(piece_shape[y])):
                if piece_shape[y][x]:
                    min_x = min(min_x, x)
                    max_x = max(max_x, x)
                    min_y = min(min_y, y)
                    max_y = max(max_y, y)

        return int(min_x), int(max_x), int(min_y), int(max_y)

    def get_valid_moves(self, game_state: GameState, player_id: int) -> List[Dict[str, Any]]:
        """Get all valid moves for a player."""
        moves = []
        next_pieces = game_state.board_state.get('next_pieces', [])
        if not next_pieces:
            return moves

        piece_type = next_pieces[0]
        for rotation in range(4):
            piece_shape = self.board.PIECES[piece_type][rotation]
            for x in range(self.board.BOARD_WIDTH - len(piece_shape[0]) + 1):
                for y in range(self.board.BOARD_HEIGHT - len(piece_shape) + 1):
                    move = {
                        'piece_type': piece_type,
                        'rotation': rotation,
                        'x': x,
                        'y': y
                    }
                    if self.board.is_valid_move(game_state.board_state, move, player_id):
                        moves.append(move)

        return moves

    def check_game_end(self, game_state: GameState) -> Optional[int]:
        """Check if game has ended. Returns winner_id or None."""
        if game_state.status == 'finished':
            return game_state.winner
        return None
