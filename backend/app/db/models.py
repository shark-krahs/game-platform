from sqlmodel import SQLModel, Field
from typing import Optional


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    password_hash: Optional[str] = None
    stars: int = 0
    preferred_color: str = '#4287f5'


class Game(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    max_players: int = 2
