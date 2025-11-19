import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import games
from app.api import auth
from app.db.database import init_db

# Make sure backend package is importable when running from project root
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    # load .env from backend folder if present (optional; requires python-dotenv)
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '../.env')
except Exception:
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    try:
        await init_db()
    except Exception:
        # fail silently; DB may be managed externally
        pass
    yield
    # shutdown (если нужно что-то закрыть, например соединение с БД)
    # await db.close()


app = FastAPI(title="TG Game Bot - Backend", lifespan=lifespan)

# Настройка CORS
origins = [
    "http://localhost:5173",  # твой фронт
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутеры
app.include_router(games.router)
app.include_router(auth.router)