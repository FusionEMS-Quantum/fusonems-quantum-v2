"""
Single Sign-On (SSO) Service
Centralized authentication and token management for all FusonEMS applications.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from core.config import settings
from models.user import User


class RefreshToken:
    """In-memory token store - in production, use Redis or database"""
    _tokens = {}

    @classmethod
    def store(cls, user_id: int, token: str, expires_at: datetime) -> None:
        cls._tokens[token] = {
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
            "revoked": False,
        }

    @classmethod
    def get(cls, token: str) -> Optional[dict]:
        return cls._tokens.get(token)

    @classmethod
    def revoke(cls, token: str) -> None:
        if token in cls._tokens:
            cls._tokens[token]["revoked"] = True

    @classmethod
    def revoke_all_for_user(cls, user_id: int) -> None:
        for token, data in cls._tokens.items():
            if data["user_id"] == user_id:
                data["revoked"] = True

    @classmethod
    def cleanup_expired(cls) -> None:
        now = datetime.now(timezone.utc)
        expired = [
            token for token, data in cls._tokens.items() if data["expires_at"] < now
        ]
        for token in expired:
            del cls._tokens[token]


class SSOService:
    """Centralized SSO service for all applications"""

    @staticmethod
    def create_access_token(
        user: User, app_permissions: list[str] = None, expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create an access token with enhanced claims for SSO.
        
        Token includes:
        - sub: user_id
        - org: organization_id
        - role: user role
        - email: user email
        - name: user full name
        - apps: list of allowed applications
        - iat: issued at timestamp
        - exp: expiration timestamp
        """
        to_encode = {
            "sub": str(user.id),
            "org": user.org_id,
            "role": user.role,
            "email": user.email,
            "name": user.full_name,
            "apps": app_permissions or ["main", "cad", "crewlink", "mdt"],
            "mfa": False,
            "device_trusted": True,
            "on_shift": True,
        }

        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})

        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")

    @staticmethod
    def create_refresh_token(user: User, remember_me: bool = False) -> str:
        """
        Create a refresh token for long-lived sessions.
        
        Refresh tokens:
        - Last 7 days by default
        - Last 30 days with remember_me=True
        - Stored server-side for validation
        - Can be revoked individually or all at once
        """
        token = secrets.token_urlsafe(64)
        expires_delta = timedelta(days=30 if remember_me else 7)
        expires_at = datetime.now(timezone.utc) + expires_delta

        RefreshToken.store(user.id, token, expires_at)
        return token

    @staticmethod
    def verify_access_token(token: str) -> Optional[dict]:
        """Verify and decode an access token"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
            return payload
        except JWTError:
            return None

    @staticmethod
    def verify_refresh_token(token: str, db: Session) -> Optional[User]:
        """
        Verify a refresh token and return the associated user.
        Returns None if token is invalid, expired, or revoked.
        """
        RefreshToken.cleanup_expired()
        token_data = RefreshToken.get(token)

        if not token_data:
            return None

        if token_data["revoked"]:
            return None

        if token_data["expires_at"] < datetime.now(timezone.utc):
            return None

        user = db.query(User).filter(User.id == token_data["user_id"]).first()
        return user

    @staticmethod
    def revoke_token(token: str) -> None:
        """Revoke a single refresh token"""
        RefreshToken.revoke(token)

    @staticmethod
    def revoke_all_tokens(user_id: int) -> None:
        """Revoke all refresh tokens for a user (logout everywhere)"""
        RefreshToken.revoke_all_for_user(user_id)

    @staticmethod
    def create_sso_session(
        user: User, remember_me: bool = False, app_permissions: list[str] = None
    ) -> dict:
        """
        Create a complete SSO session with access and refresh tokens.
        
        Returns:
        {
            "access_token": "...",
            "refresh_token": "...",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {...}
        }
        """
        access_token = SSOService.create_access_token(user, app_permissions)
        refresh_token = SSOService.create_refresh_token(user, remember_me)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "org_id": user.org_id,
            },
        }

    @staticmethod
    def refresh_session(refresh_token: str, db: Session) -> Optional[dict]:
        """
        Refresh an SSO session using a refresh token.
        Returns new access token or None if refresh token is invalid.
        """
        user = SSOService.verify_refresh_token(refresh_token, db)
        if not user:
            return None

        access_token = SSOService.create_access_token(user)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "org_id": user.org_id,
            },
        }

    @staticmethod
    def validate_app_access(token_payload: dict, required_app: str) -> bool:
        """
        Validate that the token has access to a specific application.
        """
        apps = token_payload.get("apps", [])
        return required_app in apps or "main" in apps

    @staticmethod
    def get_public_key() -> str:
        """
        Return the public key for JWT validation (for external apps).
        In production with RS256, this would return the actual public key.
        For HS256, external apps need the shared secret.
        """
        return settings.JWT_SECRET_KEY
