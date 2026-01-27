"""
Base classes and interfaces for game implementations.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime


@dataclass
class GameMove:
    """Represents a generic game move."""
    player_id: int
    move_data: Dict[str, Any]
    timestamp: datetime


@dataclass
class TimeControl:
    """Time control configuration for games."""
    type: str  # 'classical', 'bullet', 'blitz', 'rapid', 'hourglass'
    initial_time: int  # Initial time in seconds
    increment: int = 0  # Time added per move in seconds
    delay: int = 0  # Delay before time starts counting (Fischer delay)
    moves_to_reset: Optional[int] = None  # Moves before time reset (if applicable)


@dataclass
class GameConfig:
    """Configuration for a game type."""
    game_type: str
    name: str
    description: str
    min_players: int
    max_players: int
    default_time_control: TimeControl
    board_config: Dict[str, Any]


@dataclass
class GameState:
    """Generic game state."""
    game_id: str
    game_type: str
    status: str
    players: List[Dict[str, Any]]
    current_player: int
    board_state: Dict[str, Any]
    time_remaining: Dict[int, float]
    winner: Optional[int]
    moves_history: List[GameMove]
    chat_history: List[Dict[str, Any]]
    created_at: datetime
    config: GameConfig
    time_control: TimeControl
    time_control_str: Optional[str] = None
    first_move_timer: Optional[float] = None
    first_move_player: Optional[int] = None
    rated: bool = True
    # Disconnection handling
    disconnect_timer: Optional[float] = None
    disconnected_player: Optional[int] = None


class AbstractGameBoard(ABC):
    """Abstract base class for game boards."""

    @abstractmethod
    def initialize_board(self) -> Dict[str, Any]:
        """Initialize a new empty board."""
        pass

    @abstractmethod
    def is_valid_move(self, board_state: Dict[str, Any], move: Dict[str, Any], player_id: int) -> bool:
        """Check if a move is valid."""
        pass

    @abstractmethod
    def apply_move(self, board_state: Dict[str, Any], move: Dict[str, Any], player_id: int) -> Dict[str, Any]:
        """Apply a move to the board and return new state."""
        pass

    @abstractmethod
    def check_winner(self, board_state: Dict[str, Any]) -> Optional[int]:
        """Check if there's a winner. Returns player_id or None."""
        pass

    @abstractmethod
    def is_draw(self, board_state: Dict[str, Any]) -> bool:
        """Check if the game is a draw."""
        pass


class AbstractGameLogic(ABC):
    """Abstract base class for game logic."""

    @abstractmethod
    def get_config(self) -> GameConfig:
        """Get game configuration."""
        pass

    @abstractmethod
    def initialize_game(self, game_id: str, players: List[Dict[str, Any]], time_control: TimeControl) -> GameState:
        """Initialize a new game."""
        pass

    @abstractmethod
    def process_move(self, game_state: GameState, move: Dict[str, Any], player_id: int) -> Tuple[GameState, bool]:
        """Process a move. Returns (new_state, move_valid)."""
        pass

    @abstractmethod
    def get_valid_moves(self, game_state: GameState, player_id: int) -> List[Dict[str, Any]]:
        """Get all valid moves for a player."""
        pass

    @abstractmethod
    def check_game_end(self, game_state: GameState) -> Optional[int]:
        """Check if game has ended. Returns winner_id or None."""
        pass


class AbstractGameEngine(ABC):
    """Abstract base class for game engines that manage game lifecycle."""

    @abstractmethod
    async def create_game(self, game_type: str, players: List[Dict[str, Any]], config: Dict[str, Any]) -> str:
        """Create a new game instance."""
        pass

    @abstractmethod
    async def join_game(self, game_id: str, player: Dict[str, Any]) -> bool:
        """Add a player to an existing game."""
        pass

    @abstractmethod
    async def make_move(self, game_id: str, player_id: int, move: Dict[str, Any]) -> bool:
        """Process a move in a game."""
        pass

    @abstractmethod
    async def get_game_state(self, game_id: str) -> Optional[GameState]:
        """Get current state of a game."""
        pass

    @abstractmethod
    async def end_game(self, game_id: str) -> None:
        """End a game and clean up resources."""
        pass


class GameFactory:
    """Factory for creating game instances."""

    _games: Dict[str, type] = {}

    @classmethod
    def register_game(cls, game_type: str, game_class: type) -> None:
        """Register a game implementation."""
        cls._games[game_type] = game_class

    @classmethod
    def create_game_logic(cls, game_type: str) -> AbstractGameLogic:
        """Create a game logic instance."""
        if game_type not in cls._games:
            raise ValueError(f"Unknown game type: {game_type}")
        return cls._games[game_type]()

    @classmethod
    def get_available_games(cls) -> List[str]:
        """Get list of available game types."""
        return list(cls._games.keys())
