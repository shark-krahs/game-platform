"""
Tetris for two players board implementation.
"""

import logging
import random
from copy import deepcopy
from typing import Dict, Any, Optional, List, Tuple

from ..base import AbstractGameBoard

logger = logging.getLogger(__name__)


class TetrisBoard(AbstractGameBoard):
    """Tetris board for two players implementation."""

    BOARD_WIDTH = 10
    BOARD_HEIGHT = 20

    # Tetris pieces (tetrominoes)
    PIECES = {
        "I": [
            [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
            [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
            [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
        ],
        "O": [
            [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
        ],
        "T": [
            [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
            [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
        ],
        "S": [
            [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
            [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
            [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
        ],
        "Z": [
            [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
            [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
            [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
        ],
        "J": [
            [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
            [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
        ],
        "L": [
            [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
            [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
            [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
        ],
    }

    def initialize_board(self) -> Dict[str, Any]:
        """Initialize a new empty tetris board."""
        return {
            "grid": [
                [0 for _ in range(self.BOARD_WIDTH)] for _ in range(self.BOARD_HEIGHT)
            ],
            "width": self.BOARD_WIDTH,
            "height": self.BOARD_HEIGHT,
            "next_pieces": [self._generate_next_piece()],  # Start with one piece
            "scores": [0, 0],  # scores for player 0 and 1
            "falling_piece": None,  # current falling piece: {'type': 'I', 'x': 3, 'y': 0, 'rotation': 0}
            "current_player_piece": None,  # the piece the current player is placing
        }

    def _generate_next_piece(self) -> str:
        """Generate a single next piece using bag system."""
        if not hasattr(self, "_piece_bag") or not self._piece_bag:
            # Create bag with all pieces
            self._piece_bag = list(self.PIECES.keys())
            random.shuffle(self._piece_bag)

        # Take next piece from bag
        piece = self._piece_bag.pop()
        return piece

    def is_valid_move(
        self, board_state: Dict[str, Any], move: Dict[str, Any], player_id: int
    ) -> bool:
        """Check if a move is valid."""
        piece_type = move.get("piece_type")
        rotation = move.get("rotation", 0)
        x = move.get("x", 0)
        y = move.get("y", 0)

        if piece_type not in self.PIECES:
            return False

        if not (0 <= rotation < 4):
            return False

        piece_shape = self.PIECES[piece_type][rotation]
        return self._can_place_piece(board_state["grid"], piece_shape, x, y)

    def apply_move(
        self, board_state: Dict[str, Any], move: Dict[str, Any], player_id: int
    ) -> Dict[str, Any]:
        """Apply a move to the board."""
        new_board_state = deepcopy(board_state)
        grid = new_board_state["grid"]

        piece_type = move["piece_type"]
        rotation = move.get("rotation", 0)
        x = move["x"]
        y = move["y"]

        piece_shape = self.PIECES[piece_type][rotation]

        # Place the piece
        for py in range(len(piece_shape)):
            for px in range(len(piece_shape[py])):
                if piece_shape[py][px]:
                    grid[y + py][x + px] = player_id + 1  # 1 or 2 for players

        # Clear full lines and add score
        lines_cleared = self._clear_full_lines(grid)
        new_board_state["scores"][player_id] += self._calculate_score(lines_cleared)

        # Remove used piece from next_pieces (simplified)
        if new_board_state["next_pieces"]:
            new_board_state["next_pieces"].pop(0)

        return new_board_state

    def _can_place_piece(
        self, grid: List[List[int]], piece_shape: List[List[int]], x: int, y: int
    ) -> bool:
        """Check if a piece can be placed at given position."""
        for py in range(len(piece_shape)):
            for px in range(len(piece_shape[py])):
                if piece_shape[py][px]:
                    gx = x + px
                    gy = y + py
                    if not (0 <= gx < self.BOARD_WIDTH and 0 <= gy < self.BOARD_HEIGHT):
                        return False
                    if grid[gy][gx] != 0:
                        return False
        return True

    def _clear_full_lines(self, grid: List[List[int]]) -> int:
        """Clear full lines and return number of lines cleared."""
        lines_cleared = 0
        y = self.BOARD_HEIGHT - 1
        while y >= 0:
            row = grid[y]
            is_full = all(cell != 0 for cell in row)
            if is_full:
                # Remove the line
                del grid[y]
                # Add empty line at top
                grid.insert(0, [0] * self.BOARD_WIDTH)
                lines_cleared += 1
            else:
                y -= 1
        return lines_cleared

    def _calculate_score(self, lines_cleared: int) -> int:
        """Calculate score based on lines cleared."""
        # Standard Tetris scoring: 40, 100, 300, 1200 for 1,2,3,4 lines
        scores = [0, 40, 100, 300, 1200]  # Test scoring - 10 points even for 0 lines
        return scores[min(lines_cleared, 4)]

    def start_falling_piece(self, board_state: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new falling piece for the current player."""
        new_board_state = deepcopy(board_state)

        if not new_board_state["next_pieces"]:
            return new_board_state

        piece_type = new_board_state["next_pieces"][0]

        # Create falling piece at top center
        new_board_state["falling_piece"] = {
            "type": piece_type,
            "x": self.BOARD_WIDTH // 2 - 2,  # Center horizontally
            "y": 0,
            "rotation": 0,
        }

        # Set current player piece
        new_board_state["current_player_piece"] = piece_type

        return new_board_state

    def move_falling_piece(
        self, board_state: Dict[str, Any], direction: str
    ) -> Dict[str, Any]:
        """Move the falling piece (left, right, down, rotate)."""
        new_board_state = deepcopy(board_state)

        if not new_board_state.get("falling_piece"):
            return new_board_state

        piece = new_board_state["falling_piece"]
        new_piece = piece.copy()

        if direction == "left":
            new_piece["x"] -= 1
        elif direction == "right":
            new_piece["x"] += 1
        elif direction == "down":
            new_piece["y"] += 1
        elif direction == "rotate":
            new_piece["rotation"] = (new_piece["rotation"] + 1) % 4

        # Check if new position is valid
        if self._can_place_falling_piece(new_board_state["grid"], new_piece):
            new_board_state["falling_piece"] = new_piece
        elif direction == "down":
            # Piece can't move down, place it
            new_board_state, _ = self._place_falling_piece(new_board_state)

        return new_board_state

    def _can_place_falling_piece(
        self, grid: List[List[int]], piece: Dict[str, Any]
    ) -> bool:
        """Check if falling piece can be placed at its current position."""
        piece_type = piece["type"]
        rotation = piece["rotation"]
        x = piece["x"]
        y = piece["y"]

        if piece_type not in self.PIECES:
            return False

        piece_shape = self.PIECES[piece_type][rotation]
        return self._can_place_piece(grid, piece_shape, x, y)

    def _place_falling_piece(
        self, board_state: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], int]:
        """Place the falling piece on the board."""
        new_board_state = deepcopy(board_state)

        if not new_board_state.get("falling_piece"):
            return new_board_state, 0

        piece = new_board_state["falling_piece"]
        grid = new_board_state["grid"]

        piece_type = piece["type"]
        rotation = piece["rotation"]
        x = piece["x"]
        y = piece["y"]

        piece_shape = self.PIECES[piece_type][rotation]

        # Check if piece can be placed (bounds and collision)
        if not self._can_place_piece(grid, piece_shape, x, y):
            # Cannot place - this is a top-out condition
            new_board_state["top_out"] = True
            return new_board_state, 0

        # Place the piece
        for py in range(len(piece_shape)):
            for px in range(len(piece_shape[py])):
                if piece_shape[py][px]:
                    grid[y + py][
                        x + px
                    ] = 3  # Use 3 for placed pieces (different from player pieces)

        # Clear full lines and add score
        lines_cleared = self._clear_full_lines(grid)
        # Store lines cleared for engine to add score
        new_board_state["lines_cleared"] = lines_cleared

        # Remove used piece and generate next one
        if new_board_state["next_pieces"]:
            new_board_state["next_pieces"].pop(0)
        # Generate next piece for the next player
        new_board_state["next_pieces"].append(self._generate_next_piece())

        # Remove the falling piece
        new_board_state["falling_piece"] = None
        new_board_state["current_player_piece"] = None

        return new_board_state, lines_cleared

    def check_winner(self, board_state: Dict[str, Any]) -> Optional[int]:
        """Check if there's a winner. Returns player_id or None."""
        # Game ends when a player cannot place their piece
        # This is checked in logic when trying to make a move
        return None

    def is_draw(self, board_state: Dict[str, Any]) -> bool:
        """Check if the game is a draw."""
        # Tetris typically doesn't have draws
        return False
