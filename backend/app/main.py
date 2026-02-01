import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from app.api import auth
from app.api import games
from app.core.config import setup_logging
from app.db import database
from app.db.database import init_db
from app.matchmaking import matchmaking_loop
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Make sure backend package is importable when running from project root
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Setup logging
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    try:
        await init_db()

        # Register game types
        from app.games.base import GameFactory
        from app.games.pentago.logic import PentagoGame
        from app.games.tetris.logic import TetrisGame

        GameFactory.register_game('pentago', PentagoGame)
        GameFactory.register_game('tetris', TetrisGame)

        logger.info(f"Registered games: {GameFactory.get_available_games()}")

        import asyncio
        asyncio.create_task(matchmaking_loop())
    except Exception as e:
        logger.error(f"Startup error: {e}")
        # fail silently; DB may be managed externally
        pass
    yield
    # shutdown (если нужно что-то закрыть, например соединение с БД)
    # await db.close()


app = FastAPI(title="Game Platform", lifespan=lifespan)

# Настройка CORS
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://192.168.31.224:5173")
origins = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутеры
app.include_router(games.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
