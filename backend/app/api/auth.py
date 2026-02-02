import logging
from datetime import timedelta, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.db.models import User
from backend.app.repositories.user_repository import UserRepository
from backend.app.services.email_service import (
    generate_token,
    build_confirm_link,
    build_password_reset_link,
    build_email_change_link,
    build_verification_email,
    build_password_reset_email,
    build_email_change_email,
    send_email,
    mask_email,
)

logger = logging.getLogger(__name__)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    language: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    message: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserUpdate(BaseModel):
    old_password: Optional[str] = None
    new_password: Optional[str] = None
    preferred_color: Optional[str] = None
    language: Optional[str] = None
    email: Optional[str] = None


class EmailRequest(BaseModel):
    username: str


class EmailChangeResendRequest(BaseModel):
    token: str


class ResendCooldownResponse(BaseModel):
    message: str
    seconds_remaining: int


class TokenRequest(BaseModel):
    token: str


class EmailChangeConfirmRequest(BaseModel):
    token: str
    new_email: Optional[str] = None


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str


class ChangeEmailRequest(BaseModel):
    confirm: bool = True


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

    existing_email = await user_repo.get_by_email(user_in.email)
    if existing_email:
        if not existing_email.email_verified:
            if existing_email.email_verification_expires_at and existing_email.email_verification_expires_at < datetime.utcnow():
                await user_repo.delete(existing_email)
            else:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "auth.email_unverified_pending",
                        "message": "email already registered but not verified",
                    },
                )
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "auth.email_taken",
                    "message": "email already registered",
                },
            )

    password_hash = get_password_hash(user_in.password)
    user = await user_repo.create_user(user_in.username, password_hash, user_in.email, user_in.language)

    token = generate_token()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.email_verification_expire_minutes)
    user.email_verification_token = token
    user.email_verification_expires_at = expires_at
    user.email_verification_sent_at = datetime.utcnow()
    await user_repo.update(user)

    confirm_link = build_confirm_link(token)
    email_payload = build_verification_email(user.username, confirm_link, user.language)
    email_payload.to_address = user.email
    send_email(email_payload)

    return {"message": "verification sent"}


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
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth.email_not_verified",
                "message": "email not verified",
            },
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token({"sub": user.username}, expires_delta=access_token_expires)
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
        "email": current_user.email,
        "email_verified": current_user.email_verified,
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
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "auth.old_password_required",
                    "message": "old password required to change password",
                },
            )
        if not verify_password(user_update.old_password, current_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "auth.old_password_incorrect",
                    "message": "old password incorrect",
                },
            )
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
        "email": current_user.email,
        "email_verified": current_user.email_verified,
        "preferred_color": current_user.preferred_color,
        "language": current_user.language
    }


@router.post("/auth/confirm-email")
async def confirm_email(payload: TokenRequest):
    user = await user_repo.get_by_verification_token(payload.token)
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.invalid_token", "message": "invalid token"},
        )
    if not user.email_verification_expires_at or user.email_verification_expires_at < datetime.utcnow():
        await user_repo.delete(user)
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.token_expired", "message": "token expired"},
        )
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    await user_repo.update(user)
    return {"message": "email confirmed"}


@router.post("/auth/resend-confirmation")
async def resend_confirmation(payload: EmailRequest):
    user = await user_repo.get_by_username_without_ratings(payload.username)
    if not user or not user.email:
        raise HTTPException(
            status_code=404,
            detail={"code": "auth.user_not_found", "message": "user not found"},
        )
    if user.email_verification_sent_at:
        elapsed = (datetime.utcnow() - user.email_verification_sent_at).total_seconds()
        if elapsed < settings.email_verification_resend_cooldown_seconds:
            remaining = int(settings.email_verification_resend_cooldown_seconds - elapsed)
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "auth.resend_cooldown",
                    "message": "resend cooldown",
                    "seconds_remaining": remaining,
                },
            )
    if user.email_verified:
        return {"message": "email already verified"}
    token = generate_token()
    user.email_verification_sent_at = datetime.utcnow()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.email_verification_expire_minutes)
    user.email_verification_token = token
    user.email_verification_expires_at = expires_at
    await user_repo.update(user)

    confirm_link = build_confirm_link(token)
    email_payload = build_verification_email(user.username, confirm_link, user.language)
    email_payload.to_address = user.email
    send_email(email_payload)
    return {"message": "confirmation sent"}


@router.post("/auth/request-password-reset")
async def request_password_reset(payload: EmailRequest):
    user = await user_repo.get_by_username_without_ratings(payload.username)
    if not user or not user.email:
        raise HTTPException(
            status_code=404,
            detail={"code": "auth.user_not_found", "message": "user not found"},
        )
    token = generate_token()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.password_reset_expire_minutes)
    user.password_reset_token = token
    user.password_reset_expires_at = expires_at
    await user_repo.update(user)

    reset_link = build_password_reset_link(token)
    email_payload = build_password_reset_email(user.username, reset_link, user.language)
    email_payload.to_address = user.email
    send_email(email_payload)
    return {"message": "reset sent", "masked_email": mask_email(user.email)}


@router.post("/auth/resend-password-reset")
async def resend_password_reset(payload: EmailRequest):
    user = await user_repo.get_by_username_without_ratings(payload.username)
    if not user or not user.email:
        raise HTTPException(
            status_code=404,
            detail={"code": "auth.user_not_found", "message": "user not found"},
        )
    token = generate_token()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.password_reset_expire_minutes)
    user.password_reset_token = token
    user.password_reset_expires_at = expires_at
    await user_repo.update(user)

    reset_link = build_password_reset_link(token)
    email_payload = build_password_reset_email(user.username, reset_link, user.language)
    email_payload.to_address = user.email
    send_email(email_payload)
    return {"message": "reset resent", "masked_email": mask_email(user.email)}


@router.post("/auth/request-email-change")
async def request_email_change(payload: ChangeEmailRequest, current_user: User = Depends(get_current_user)):
    token = generate_token()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.email_change_expire_minutes)
    current_user.pending_email = None
    current_user.pending_email_token = token
    current_user.pending_email_expires_at = expires_at
    current_user.pending_email_confirmed = False
    await user_repo.update(current_user)

    confirm_link = build_email_change_link(token)
    email_payload = build_email_change_email(current_user.username, confirm_link, current_user.language)
    email_payload.to_address = current_user.email
    send_email(email_payload)
    return {"message": "confirmation sent", "masked_email": mask_email(current_user.email)}


@router.post("/auth/reset-password")
async def reset_password(payload: PasswordResetRequest):
    user = await user_repo.get_by_password_reset_token(payload.token)
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.invalid_token", "message": "invalid token"},
        )
    if not user.password_reset_expires_at or user.password_reset_expires_at < datetime.utcnow():
        await user_repo.clear_expired_password_reset(user)
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.token_expired", "message": "token expired"},
        )
    user.password_hash = get_password_hash(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    await user_repo.update(user)
    return {"message": "password reset"}


@router.post("/auth/confirm-email-change")
async def confirm_email_change(payload: EmailChangeConfirmRequest):
    user = await user_repo.get_by_pending_email_token(payload.token)
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.invalid_token", "message": "invalid token"},
        )
    if not user.pending_email_expires_at or user.pending_email_expires_at < datetime.utcnow():
        await user_repo.clear_expired_pending_email(user)
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.token_expired", "message": "token expired"},
        )
    if not user.pending_email_confirmed:
        if user.pending_email:
            # If the new email is already stored, treat this as the final confirmation step
            user.email = user.pending_email
            user.pending_email = None
            user.pending_email_token = None
            user.pending_email_expires_at = None
            user.pending_email_confirmed = False
            user.email_verified = True
            await user_repo.update(user)
            return {"message": "email updated"}

        if not payload.new_email:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "auth.new_email_required",
                    "message": "new email required",
                },
            )
        if payload.new_email == user.email:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "auth.email_already_set",
                    "message": "email already set",
                },
            )
        existing_email = await user_repo.get_by_email(payload.new_email)
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "auth.email_taken",
                    "message": "email already registered",
                },
            )
        token = generate_token()
        expires_at = datetime.utcnow() + timedelta(minutes=settings.email_change_expire_minutes)
        user.pending_email = payload.new_email
        user.pending_email_token = token
        user.pending_email_expires_at = expires_at
        user.pending_email_confirmed = True
        await user_repo.update(user)

        confirm_link = build_email_change_link(token)
        email_payload = build_email_change_email(user.username, confirm_link, user.language)
        email_payload.to_address = user.pending_email
        send_email(email_payload)
        return {"message": "new email confirmation sent"}

    user.email = user.pending_email
    user.pending_email = None
    user.pending_email_token = None
    user.pending_email_expires_at = None
    user.pending_email_confirmed = False
    user.email_verified = True
    await user_repo.update(user)
    return {"message": "email updated"}


@router.post("/auth/resend-email-change")
async def resend_email_change(payload: EmailChangeResendRequest):
    user = await user_repo.get_by_pending_email_token(payload.token)
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.invalid_token", "message": "invalid token"},
        )
    if not user.pending_email:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "auth.pending_email_missing",
                "message": "pending email missing",
            },
        )
    if not user.pending_email_expires_at or user.pending_email_expires_at < datetime.utcnow():
        await user_repo.clear_expired_pending_email(user)
        raise HTTPException(
            status_code=400,
            detail={"code": "auth.token_expired", "message": "token expired"},
        )
    if not user.pending_email_confirmed:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "auth.new_email_not_confirmed",
                "message": "new email not confirmed yet",
            },
        )

    confirm_link = build_email_change_link(payload.token)
    email_payload = build_email_change_email(user.username, confirm_link, user.language)
    email_payload.to_address = user.pending_email
    send_email(email_payload)
    return {"message": "email change resent", "masked_email": mask_email(user.pending_email)}


@router.get("/auth/me/active-game")
async def get_active_game(current_user: User = Depends(get_current_user)):
    """Get user's active game ID if any."""
    from backend.app.repositories.user_active_game_repository import UserActiveGameRepository
    active_game_id = await UserActiveGameRepository.get_active_game(str(current_user.id))
    return {"active_game_id": active_game_id}
