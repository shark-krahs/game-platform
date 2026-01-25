import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from jose import JWTError, jwt

from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.db.models import User
from app.db.database import async_session

logger = logging.getLogger(__name__)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class UserCreate(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UserUpdate(BaseModel):
    old_password: Optional[str] = None
    new_password: Optional[str] = None
    preferred_color: Optional[str] = None
    language: Optional[str] = None


# Repository instance
user_repo = UserRepository()


async def get_user_by_username(username: str) -> Optional[User]:
    """Get user by username with game ratings loaded."""
    return await user_repo.get_by_username(username)


async def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate user by username and password."""
    user = await user_repo.get_by_username(username)
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


@router.post("/auth/register", response_model=Token)
async def register(user_in: UserCreate):
    """Register new user."""
    existing = await user_repo.get_by_username_without_ratings(user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="username already registered")

    password_hash = get_password_hash(user_in.password)
    user = await user_repo.create_user(user_in.username, password_hash)

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token({"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/login", response_model=Token)
async def login(form_data: UserCreate):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token({"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await get_user_by_username(token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_user_from_token(token: str) -> User | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        if not username:
            return None
        return await get_user_by_username(username)
    except JWTError:
        return None


@router.get("/auth/me")
async def read_current_user(current_user: User = Depends(get_current_user)):
    ratings_dict = {r.game_type: {
        "rating": r.rating,
        "rd": r.rd,
        "games_played": r.games_played
    } for r in current_user.game_ratings}
    return {
        "id": current_user.id,
        "username": current_user.username,
        "ratings": ratings_dict,
        "preferred_color": current_user.preferred_color,
        "language": current_user.language
    }


@router.put("/auth/me")
async def update_current_user(user_update: UserUpdate, current_user: User = Depends(get_current_user)):
    """Update current user profile."""
    updates = {}

    if user_update.new_password:
        if not user_update.old_password:
            raise HTTPException(status_code=400, detail="old password required to change password")
        if not verify_password(user_update.old_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="old password incorrect")
        updates['password_hash'] = get_password_hash(user_update.new_password)

    if user_update.preferred_color is not None:
        updates['preferred_color'] = user_update.preferred_color

    if user_update.language is not None:
        updates['language'] = user_update.language

    if updates:
        updated_user = await user_repo.update_user_profile(current_user, **updates)

    return {
        "id": current_user.id,
        "username": current_user.username,
        "preferred_color": current_user.preferred_color,
        "language": current_user.language
    }


@router.get("/auth/me/active-game")
async def get_active_game(current_user: User = Depends(get_current_user)):
    """Get user's active game ID if any."""
    from app.repositories.user_active_game_repository import UserActiveGameRepository
    active_game_id = await UserActiveGameRepository.get_active_game(str(current_user.id))
    return {"active_game_id": active_game_id}
