import logging
from datetime import timedelta, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from backend.app.db.models import User
from backend.app.repositories.user_repository import UserRepository
from backend.app.services.recovery_service import RecoveryService

logger = logging.getLogger(__name__)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class UserCreate(BaseModel):
    username: str
    password: str
    language: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    message: str
    recovery_codes: list[str] | None = None
    recovery_setup_token: str | None = None
    codes_available_until: datetime | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserUpdate(BaseModel):
    preferred_color: Optional[str] = None
    language: Optional[str] = None


class RecoveryVerifyRequest(BaseModel):
    username: str
    code: str


class RecoveryVerifyResponse(BaseModel):
    reset_token: str | None
    expires_in_seconds: int
    message: str


class RecoveryResetRequest(BaseModel):
    reset_token: str
    new_password: str


class RecoverySetupConfirmRequest(BaseModel):
    setup_token: str


class RecoveryRegenerateRequest(BaseModel):
    password: str


# Repository instance
user_repo = UserRepository()
recovery_service = RecoveryService()


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


@router.post("/auth/register", response_model=RegisterResponse)
async def register(user_in: UserCreate):
    """Register new user."""
    existing = await user_repo.get_by_username_without_ratings(user_in.username)
    if existing:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "auth.username_taken",
                "message": "username already registered",
            },
        )

    password_hash = get_password_hash(user_in.password)
    user = await user_repo.create_user(
        user_in.username, password_hash, user_in.language
    )
    recovery_codes, _hashes = await recovery_service.generate_codes(user.id)
    setup_token = recovery_service.create_setup_token(user.username)
    return {
        "message": "registered",
        "recovery_codes": recovery_codes,
        "recovery_setup_token": setup_token,
        "codes_available_until": datetime.utcnow() + timedelta(minutes=10),
    }


@router.post("/auth/login", response_model=Token)
async def login(form_data: LoginRequest):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "auth.invalid_credentials",
                "message": "Incorrect username or password",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        {"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "code": "auth.invalid_credentials",
            "message": "Could not validate credentials",
        },
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
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
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        username: str = payload.get("sub")
        if not username:
            return None
        return await get_user_by_username(username)
    except JWTError:
        return None


@router.get("/auth/me")
async def read_current_user(current_user: User = Depends(get_current_user)):
    ratings_dict = {
        r.game_type: {"rating": r.rating, "rd": r.rd, "games_played": r.games_played}
        for r in current_user.game_ratings
    }
    return {
        "id": current_user.id,
        "username": current_user.username,
        "ratings": ratings_dict,
        "preferred_color": current_user.preferred_color,
        "language": current_user.language,
    }


@router.put("/auth/me")
async def update_current_user(
    user_update: UserUpdate, current_user: User = Depends(get_current_user)
):
    """Update current user profile."""
    updates = {}
    if not current_user.recovery_codes_viewed_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth.recovery_setup_required",
                "message": "recovery setup required",
            },
        )

    if user_update.preferred_color is not None:
        updates["preferred_color"] = user_update.preferred_color

    if user_update.language is not None:
        updates["language"] = user_update.language

    if updates:
        updated_user = await user_repo.update_user_profile(current_user, **updates)

    return {
        "id": current_user.id,
        "username": current_user.username,
        "preferred_color": current_user.preferred_color,
        "language": current_user.language,
    }


@router.post("/auth/recovery/verify", response_model=RecoveryVerifyResponse)
async def verify_recovery_code(payload: RecoveryVerifyRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    result = await recovery_service.verify_code(
        username=payload.username, code=payload.code, ip=client_ip
    )
    return {
        "reset_token": result.reset_token,
        "expires_in_seconds": result.expires_in_seconds,
        "message": result.message,
    }


@router.post("/auth/recovery/reset-password")
async def reset_password_recovery(payload: RecoveryResetRequest):
    await recovery_service.reset_password(payload.reset_token, payload.new_password)
    return {"message": "password reset"}


@router.post("/me/security/recovery/regenerate")
async def regenerate_recovery_codes(
    payload: RecoveryRegenerateRequest, current_user: User = Depends(get_current_user)
):
    if not current_user.recovery_codes_viewed_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth.recovery_setup_required",
                "message": "recovery setup required",
            },
        )
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "auth.old_password_incorrect",
                "message": "old password incorrect",
            },
        )
    codes, _hashes = await recovery_service.regenerate(current_user.id)
    recovery_service.cache_plain_codes(current_user.id, codes)
    status = await recovery_service.get_status(current_user.id)
    return {
        "generated_at": status.get("generated_at"),
        "codes_available_until": (
            status.get("generated_at") + timedelta(minutes=10)
            if status.get("generated_at")
            else None
        ),
    }


@router.get("/me/security/recovery/status")
async def recovery_status(current_user: User = Depends(get_current_user)):
    return await recovery_service.get_status(current_user.id)


@router.post("/me/security/recovery/confirm-viewed")
async def recovery_confirm_viewed(current_user: User = Depends(get_current_user)):
    viewed_at = await recovery_service.confirm_viewed(current_user.id)
    return {"viewed_at": viewed_at}


@router.post("/auth/recovery/confirm-setup")
async def recovery_confirm_setup(payload: RecoverySetupConfirmRequest):
    ok = await recovery_service.confirm_setup(payload.setup_token)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "auth.invalid_token",
                "message": "invalid token",
            },
        )
    return {"message": "confirmed"}


@router.get("/me/security/recovery/codes")
async def recovery_codes(current_user: User = Depends(get_current_user)):
    status = await recovery_service.get_status(current_user.id)
    generated_at = status.get("generated_at")
    if status.get("confirmed"):
        raise HTTPException(status_code=410, detail="codes already confirmed")
    if not generated_at:
        raise HTTPException(status_code=404, detail="codes not found")
    if datetime.utcnow() - generated_at > timedelta(minutes=10):
        raise HTTPException(status_code=410, detail="codes expired")
    codes = recovery_service.pop_cached_codes(current_user.id)
    if not codes:
        raise HTTPException(status_code=404, detail="codes not found")
    return {"codes": codes}


@router.get("/auth/me/active-game")
async def get_active_game(current_user: User = Depends(get_current_user)):
    """Get user's active game ID if any."""
    from backend.app.repositories.user_active_game_repository import (
        UserActiveGameRepository,
    )

    active_game_id = await UserActiveGameRepository.get_active_game(
        str(current_user.id)
    )
    return {"active_game_id": active_game_id}
