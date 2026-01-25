"""
Game system initialization.
"""
from .base import GameFactory, GameConfig, GameState, GameMove
from .pentago import PentagoGame
from .tetris import TetrisGame

# Register available games
GameFactory.register_game('pentago', PentagoGame)
GameFactory.register_game('tetris', TetrisGame)

__all__ = ['GameFactory', 'GameConfig', 'GameState', 'GameMove']
