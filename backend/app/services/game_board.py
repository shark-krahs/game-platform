"""
Game board utilities and logic for the tic-tac-toe game.
"""
import logging

logger = logging.getLogger(__name__)


def _new_board():
    """Create a new empty 8x8 game board."""
    return [[None for _ in range(8)] for __ in range(8)]


def rotate_quadrant(board, quadrant, direction):
    """
    Rotate a 4x4 quadrant of the board.

    Quadrants: 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right
    Direction: 'clockwise' or 'counterclockwise'
    """
    start_row = (quadrant // 2) * 4
    start_col = (quadrant % 2) * 4

    # Extract the 4x4 quadrant
    quadrant_data = []
    for r in range(4):
        row = []
        for c in range(4):
            row.append(board[start_row + r][start_col + c])
        quadrant_data.append(row)

    # Rotate the quadrant
    new_quadrant = [[None for _ in range(4)] for _ in range(4)]
    if direction == 'clockwise':
        for r in range(4):
            for c in range(4):
                new_quadrant[c][3 - r] = quadrant_data[r][c]
    else:  # counterclockwise
        for r in range(4):
            for c in range(4):
                new_quadrant[3 - c][r] = quadrant_data[r][c]

    # Put back into board
    for r in range(4):
        for c in range(4):
            board[start_row + r][start_col + c] = new_quadrant[r][c]


def check_winner(board):
    """
    Check if there's a winner on the board.

    Returns:
        str: Color of the winner, 'draw', or None if game continues
    """
    def check_line(line):
        for i in range(len(line) - 3):
            if line[i] is not None and line[i] == line[i+1] == line[i+2] == line[i+3]:
                return line[i]
        return None

    # Check rows
    for row in board:
        winner = check_line(row)
        if winner:
            return winner

    # Check columns
    for col in range(8):
        column = [board[row][col] for row in range(8)]
        winner = check_line(column)
        if winner:
            return winner

    # Check diagonals
    # Main diagonals
    for start_row in range(5):
        for start_col in range(5):
            diagonal = []
            for step in range(4):
                diagonal.append(board[start_row + step][start_col + step])
            winner = check_line(diagonal)
            if winner:
                return winner

    # Anti-diagonals
    for start_row in range(5):
        for start_col in range(3, 8):
            diagonal = []
            for step in range(4):
                diagonal.append(board[start_row + step][start_col - step])
            winner = check_line(diagonal)
            if winner:
                return winner

    # Check for draw
    for r in board:
        for c in r:
            if c is None:
                return None
    return 'draw'
