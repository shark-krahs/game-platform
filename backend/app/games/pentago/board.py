"""
Pentago game board implementation.
"""

import logging
from typing import Dict, Any, Optional, List

from ..base import AbstractGameBoard

logger = logging.getLogger(__name__)


class PentagoBoard(AbstractGameBoard):
    """Pentago game board implementation."""

    BOARD_SIZE = 8
    QUADRANT_SIZE = 4

    def initialize_board(self) -> Dict[str, Any]:
        """Create a new empty 8x8 game board."""
        return {
            "grid": [
                [None for _ in range(self.BOARD_SIZE)] for _ in range(self.BOARD_SIZE)
            ],
            "size": self.BOARD_SIZE,
        }

    def is_valid_move(
        self, board_state: Dict[str, Any], move: Dict[str, Any], player_id: int
    ) -> bool:
        """Check if a move is valid."""
        grid = board_state["grid"]
        x, y = move.get("x"), move.get("y")
        quadrant = move.get("quadrant")
        direction = move.get("direction")

        # Check coordinates
        if not (0 <= x < self.BOARD_SIZE and 0 <= y < self.BOARD_SIZE):
            return False

        # Check if cell is empty
        if grid[y][x] is not None:
            return False

        # Check quadrant and direction
        if not (0 <= quadrant < 4):
            return False

        if direction not in ["clockwise", "counterclockwise"]:
            return False

        return True

    def apply_move(
        self, board_state: Dict[str, Any], move: Dict[str, Any], player_id: int
    ) -> Dict[str, Any]:
        """Apply a move to the board."""
        new_board_state = {
            "grid": [row[:] for row in board_state["grid"]],  # Deep copy
            "size": board_state["size"],
        }

        grid = new_board_state["grid"]
        x, y = move["x"], move["y"]
        quadrant = move["quadrant"]
        direction = move["direction"]

        # Place piece
        grid[y][x] = player_id

        # Rotate quadrant
        self._rotate_quadrant(grid, quadrant, direction)

        return new_board_state

    def check_winner(self, board_state: Dict[str, Any]) -> Optional[int]:
        """Check if there's a winner. Returns player_id or None."""
        grid = board_state["grid"]

        def check_line(line: List[Optional[int]]) -> Optional[int]:
            for i in range(len(line) - 3):
                if (
                    line[i] is not None
                    and line[i] == line[i + 1] == line[i + 2] == line[i + 3]
                ):
                    return line[i]
            return None

        # Check rows
        for row in grid:
            winner = check_line(row)
            if winner is not None:
                return winner

        # Check columns
        for col in range(self.BOARD_SIZE):
            column = [grid[row][col] for row in range(self.BOARD_SIZE)]
            winner = check_line(column)
            if winner is not None:
                return winner

        # Check diagonals
        for start_row in range(self.BOARD_SIZE - 3):
            for start_col in range(self.BOARD_SIZE - 3):
                # Main diagonal
                diagonal = [
                    grid[start_row + step][start_col + step] for step in range(4)
                ]
                winner = check_line(diagonal)
                if winner is not None:
                    return winner

                # Anti-diagonal
                anti_diagonal = [
                    grid[start_row + step][start_col + 3 - step] for step in range(4)
                ]
                winner = check_line(anti_diagonal)
                if winner is not None:
                    return winner

        return None

    def is_draw(self, board_state: Dict[str, Any]) -> bool:
        """Check if the game is a draw."""
        grid = board_state["grid"]
        for row in grid:
            for cell in row:
                if cell is None:
                    return False
        return True

    def _rotate_quadrant(
        self, grid: List[List[Optional[int]]], quadrant: int, direction: str
    ) -> None:
        """Rotate a 4x4 quadrant of the board."""
        start_row = (quadrant // 2) * self.QUADRANT_SIZE
        start_col = (quadrant % 2) * self.QUADRANT_SIZE

        # Extract the 4x4 quadrant
        quadrant_data = []
        for r in range(self.QUADRANT_SIZE):
            row = []
            for c in range(self.QUADRANT_SIZE):
                row.append(grid[start_row + r][start_col + c])
            quadrant_data.append(row)

        # Rotate the quadrant
        rotated = [
            [None for _ in range(self.QUADRANT_SIZE)] for _ in range(self.QUADRANT_SIZE)
        ]
        if direction == "clockwise":
            for r in range(self.QUADRANT_SIZE):
                for c in range(self.QUADRANT_SIZE):
                    rotated[c][self.QUADRANT_SIZE - 1 - r] = quadrant_data[r][c]
        else:  # counterclockwise
            for r in range(self.QUADRANT_SIZE):
                for c in range(self.QUADRANT_SIZE):
                    rotated[self.QUADRANT_SIZE - 1 - c][r] = quadrant_data[r][c]

        # Put back into grid
        for r in range(self.QUADRANT_SIZE):
            for c in range(self.QUADRANT_SIZE):
                grid[start_row + r][start_col + c] = rotated[r][c]
