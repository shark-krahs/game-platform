from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4
import json


class User(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    username: str
    password_hash: Optional[str] = None
    email: Optional[str] = None
    email_verified: bool = False
    email_verification_token: Optional[str] = None
    email_verification_expires_at: Optional[datetime] = None
    email_verification_sent_at: Optional[datetime] = None
    password_reset_token: Optional[str] = None
    password_reset_expires_at: Optional[datetime] = None
    pending_email: Optional[str] = None
    pending_email_token: Optional[str] = None
    pending_email_expires_at: Optional[datetime] = None
    pending_email_confirmed: bool = False
    stars: int = 0
    preferred_color: str = '#4287f5'
    language: str = 'en'
    active_game_id: Optional[str] = None  # ID of currently active game
    # Relationship to game ratings
    game_ratings: List["GameRating"] = Relationship(back_populates="user")
    saved_games: List["SavedGame"] = Relationship(back_populates="user")


class Game(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    max_players: int = 2


class GameRating(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    game_type: str
    rating: float = 1500.0
    rd: float = 350.0
    volatility: float = 0.06
    last_played: Optional[datetime] = None
    games_played: int = 0
    # Back relationship to user
    user: Optional["User"] = Relationship(back_populates="game_ratings")


class SavedGame(SQLModel, table=True):
    """Model for saving game states for later analysis or continuation."""
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    game_id: str  # Original game ID
    game_type: str
    title: str  # User-defined title
    description: Optional[str] = None
    status: str  # 'ongoing', 'finished', 'abandoned'
    board_state: str  # JSON string of board state
    players: str  # JSON string of players
    current_player: int
    time_remaining: str  # JSON string of time remaining dict
    winner: Optional[int] = None
    moves_history: str  # JSON string of moves history
    chat_history: Optional[str] = None  # JSON string of chat messages
    time_control: str  # JSON string of time control
    rated: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    # Back relationship to user
    user: Optional["User"] = Relationship(back_populates="saved_games")
    # Relationship to game history moves
    moves: List["GameHistory"] = Relationship(back_populates="saved_game")

    def set_board_state(self, board_state: dict):
        self.board_state = json.dumps(board_state)

    def get_board_state(self) -> dict:
        return json.loads(self.board_state) if self.board_state else {}

    def set_players(self, players: list):
        self.players = json.dumps(players)

    def get_players(self) -> list:
        return json.loads(self.players) if self.players else []

    def set_time_remaining(self, time_remaining: dict):
        self.time_remaining = json.dumps(time_remaining)

    def get_time_remaining(self) -> dict:
        return json.loads(self.time_remaining) if self.time_remaining else {}

    def set_moves_history(self, moves_history: list):
        self.moves_history = json.dumps(moves_history)

    def get_moves_history(self) -> list:
        return json.loads(self.moves_history) if self.moves_history else []

    def set_chat_history(self, chat_history: list):
        self.chat_history = json.dumps(chat_history)

    def get_chat_history(self) -> list:
        return json.loads(self.chat_history) if self.chat_history else []

    def set_time_control(self, time_control: dict):
        self.time_control = json.dumps(time_control)

    def get_time_control(self) -> dict:
        return json.loads(self.time_control) if self.time_control else {}


class GameHistory(SQLModel, table=True):
    """Model for storing individual moves for game analysis."""
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    saved_game_id: UUID = Field(foreign_key="savedgame.id")
    move_number: int
    player_id: int
    move_data: str  # JSON string of move data
    board_state_after: str  # JSON string of board state after move
    timestamp: datetime
    time_spent: float  # Time spent on this move in seconds
    # Back relationship to saved game
    saved_game: Optional["SavedGame"] = Relationship(back_populates="moves")
