"""
Single Sign-On (SSO) Router
Authentication endpoints for unified SSO across all FusonEMS applications.
"""
import secrets
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.security import get_current_user, hash_password, verify_password
from models.user import User
from services.auth.sso_service import SSOService
from utils.rate_limit import check_rate_limit

router = APIRouter(prefix="/api/sso", tags=["SSO"])


class SSOLoginPayload(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    app: str = "main"  # Which app is requesting authentication


class SSORefreshPayload(BaseModel):
    refresh_token: str


class SSOTokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: dict


class SSOValidateResponse(BaseModel):
    valid: bool
    user: Optional[dict] = None
    apps: Optional[list[str]] = None


@router.post("/login", response_model=SSOTokenResponse)
def sso_login(
    payload: SSOLoginPayload,
    db: Session = Depends(get_db),
    request: Request = None,
    response: Response = None,
):
    """
    SSO Login - Authenticate user and create session for all applications.
    
    Features:
    - Single authentication works across all apps
    - Returns access token (short-lived, 1 hour)
    - Returns refresh token (long-lived, 7-30 days)
    - Sets secure HTTP-only cookies
    - Rate limited to prevent brute force
    """
    if not settings.LOCAL_AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="LOCAL_AUTH_DISABLED"
        )

    # Rate limiting
    if request is not None and settings.ENV == "production":
        bucket = f"sso_login:{payload.email}"
        if not check_rate_limit(bucket, settings.AUTH_RATE_LIMIT_PER_MIN):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="RATE_LIMIT"
            )

    # Authenticate user
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    # Create SSO session
    session_data = SSOService.create_sso_session(
        user, remember_me=payload.remember_me
    )

    # Set secure cookies
    if response is not None:
        cookie_max_age = (
            30 * 24 * 60 * 60 if payload.remember_me else 7 * 24 * 60 * 60
        )
        
        response.set_cookie(
            key=settings.SESSION_COOKIE_NAME,
            value=session_data["access_token"],
            httponly=True,
            secure=settings.ENV == "production",
            samesite="lax",
            max_age=session_data["expires_in"],
        )
        
        response.set_cookie(
            key="refresh_token",
            value=session_data["refresh_token"],
            httponly=True,
            secure=settings.ENV == "production",
            samesite="lax",
            max_age=cookie_max_age,
        )
        
        response.set_cookie(
            key=settings.CSRF_COOKIE_NAME,
            value=secrets.token_hex(16),
            httponly=False,
            secure=settings.ENV == "production",
            samesite="lax",
            max_age=cookie_max_age,
        )

    return SSOTokenResponse(**session_data)


@router.post("/refresh", response_model=SSOTokenResponse)
def sso_refresh(
    payload: SSORefreshPayload = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db),
    response: Response = None,
):
    """
    Refresh SSO Token - Get a new access token using refresh token.
    
    Accepts refresh token from:
    1. Request body
    2. HTTP-only cookie (more secure)
    """
    refresh_token = (
        payload.refresh_token if payload else refresh_token_cookie
    )

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    # Refresh session
    new_session = SSOService.refresh_session(refresh_token, db)
    if not new_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Update access token cookie
    if response is not None:
        response.set_cookie(
            key=settings.SESSION_COOKIE_NAME,
            value=new_session["access_token"],
            httponly=True,
            secure=settings.ENV == "production",
            samesite="lax",
            max_age=new_session["expires_in"],
        )

    return SSOTokenResponse(**new_session)


@router.post("/validate", response_model=SSOValidateResponse)
def sso_validate(
    token: str = None,
    app: str = "main",
    request: Request = None,
):
    """
    Validate SSO Token - Check if token is valid and has app access.
    
    Used by external applications (CAD backend, PWAs) to validate tokens
    issued by the main FastAPI backend.
    """
    # Try to get token from Authorization header or cookie
    if not token and request:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            token = request.cookies.get(settings.SESSION_COOKIE_NAME)

    if not token:
        return SSOValidateResponse(valid=False)

    # Verify token
    payload = SSOService.verify_access_token(token)
    if not payload:
        return SSOValidateResponse(valid=False)

    # Check app access
    has_access = SSOService.validate_app_access(payload, app)
    if not has_access:
        return SSOValidateResponse(valid=False)

    return SSOValidateResponse(
        valid=True,
        user={
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "role": payload.get("role"),
            "org_id": payload.get("org"),
        },
        apps=payload.get("apps", []),
    )


@router.post("/logout")
def sso_logout(
    user: User = Depends(get_current_user),
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    response: Response = None,
):
    """
    SSO Logout - End current session.
    
    Revokes the current refresh token and clears cookies.
    """
    # Revoke refresh token if provided
    if refresh_token_cookie:
        SSOService.revoke_token(refresh_token_cookie)

    # Clear cookies
    if response is not None:
        response.delete_cookie(settings.SESSION_COOKIE_NAME)
        response.delete_cookie("refresh_token")
        response.delete_cookie(settings.CSRF_COOKIE_NAME)

    return {"status": "ok", "message": "Logged out successfully"}


@router.post("/logout-all")
def sso_logout_all(
    user: User = Depends(get_current_user),
    response: Response = None,
):
    """
    Logout Everywhere - Revoke all sessions for the current user.
    
    Security feature that allows users to invalidate all active sessions
    across all devices and applications.
    """
    # Revoke all refresh tokens for this user
    SSOService.revoke_all_tokens(user.id)

    # Clear cookies
    if response is not None:
        response.delete_cookie(settings.SESSION_COOKIE_NAME)
        response.delete_cookie("refresh_token")
        response.delete_cookie(settings.CSRF_COOKIE_NAME)

    return {
        "status": "ok",
        "message": "All sessions revoked. Please login again on all devices.",
    }


@router.get("/me")
def sso_me(user: User = Depends(get_current_user), request: Request = None):
    """
    Get Current User - Retrieve authenticated user information.
    
    Returns user details and session metadata.
    """
    payload = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "org_id": user.org_id,
        "auth_provider": user.auth_provider,
    }

    if request:
        payload.update({
            "mfa_verified": bool(getattr(request.state, "mfa_verified", False)),
            "device_trusted": bool(getattr(request.state, "device_trusted", True)),
            "on_shift": bool(getattr(request.state, "on_shift", True)),
            "training_mode": bool(getattr(request.state, "training_mode", False)),
        })

    return {"user": payload}


@router.get("/public-key")
def sso_public_key():
    """
    Get Public Key - For external apps to validate JWT tokens.
    
    In production with RS256, this returns the public key.
    For HS256 (current), external apps need the shared secret.
    """
    if settings.ENV == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Use shared secret configuration for HS256",
        )

    return {
        "algorithm": "HS256",
        "note": "External apps should use JWT_SECRET_KEY from environment",
    }


@router.get("/health")
def sso_health():
    """SSO Service Health Check"""
    return {
        "status": "healthy",
        "service": "sso",
        "features": {
            "local_auth": settings.LOCAL_AUTH_ENABLED,
            "oidc": getattr(settings, "OIDC_ENABLED", False),
        },
    }
