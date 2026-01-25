"""
Game configuration constants and settings.
"""
import random
from typing import Tuple

# Time control constants (in seconds)
BULLET_TOTAL = 3 * 60
BULLET_INC = 0
BLITZ_TOTAL = 5 * 60
BLITZ_INC = 3
RAPID_TOTAL = 15 * 60
RAPID_INC = 10

# Game status constants
STATUS_WAITING = 'waiting'
STATUS_FIRST_MOVE = 'first_move'
STATUS_PLAYING = 'playing'
STATUS_FINISHED = 'finished'

# Preset game IDs
PRESET_IDS = {'bullet', 'blitz', 'rapid'}


def get_settings(game_id: str) -> Tuple[int, int]:
    """
    Get time control settings for a game ID.

    Args:
        game_id: The game identifier

    Returns:
        Tuple of (total_time, increment) in seconds
    """
    if game_id == 'bullet':
        return BULLET_TOTAL, BULLET_INC
    if game_id == 'blitz':
        return BLITZ_TOTAL, BLITZ_INC
    if game_id == 'rapid':
        return RAPID_TOTAL, RAPID_INC
    if game_id.startswith('custom'):
        # Parse from id, assume 'custom{total_min * 60 + inc}'
        try:
            val = int(game_id[6:])
            total = val // 60
            inc = val % 60
            if total < 1 or inc < 0:
                raise ValueError
            return total, inc
        except:
            return 10 * 60, 10  # fallback
    return 10 * 60, 10  # default


def generate_player_color() -> str:
    """Generate a random player color."""
    return "#%06X" % random.randint(0, 0xFFFFFF)
