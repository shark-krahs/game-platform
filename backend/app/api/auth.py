from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, validator
from sqlmodel import select
from jose import JWTError, jwt

from app.db.database import async_session
from app.db.models import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings

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


async def get_user_by_username(username: str) -> Optional[User]:
    async with async_session() as session:
        result = await session.exec(select(User).where(User.username == username))
        return result.one_or_none()


async def authenticate_user(username: str, password: str) -> Optional[User]:
    user = await get_user_by_username(username)
    if not user:
        return None
    if not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


@router.post("/auth/register", response_model=Token)
async def register(user_in: UserCreate):
    existing = await get_user_by_username(user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="username already registered")
    password_hash = get_password_hash(user_in.password)
    user = User(username=user_in.username, password_hash=password_hash)
    async with async_session() as session:
        session.add(user)
        await session.commit()
        await session.refresh(user)
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


@router.get("/auth/me")
async def read_current_user(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "stars": current_user.stars, "preferred_color": current_user.preferred_color}


@router.put("/auth/me")
async def update_current_user(user_update: UserUpdate, current_user: User = Depends(get_current_user)):
    if user_update.new_password:
        if not user_update.old_password:
            raise HTTPException(status_code=400, detail="old password required to change password")
        if not verify_password(user_update.old_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="old password incorrect")
        current_user.password_hash = get_password_hash(user_update.new_password)
    if user_update.preferred_color is not None:
        current_user.preferred_color = user_update.preferred_color
    async with async_session() as session:
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)
    return {"id": current_user.id, "username": current_user.username, "stars": current_user.stars, "preferred_color": current_user.preferred_color}
