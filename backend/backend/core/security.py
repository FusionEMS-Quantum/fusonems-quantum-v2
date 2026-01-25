from __future__ import annotations

from typing import Optional, Callable, Iterable
from datetime import datetime, timedelta, timezone
from functools import wraps

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    # bcrypt has a 72-byte limit; normalize and truncate deterministically
    b = password.encode("utf-8")[:72]
    return pwd_context.hash(b)

def verify_password(password: str, hashed: str) -> bool:
    b = password.encode("utf-8")[:72]
    return pwd_context.verify(b, hashed)

def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    minutes = expires_minutes or settings.JWT_EXPIRES_MINUTES
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {"sub": subject, "exp": exp}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e

# NOTE: this is intentionally minimal. If your repo has User model, replace lookup accordingly.
def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(creds.credentials)
    return {"id": payload.get("sub"), "roles": ["user"], "org_id": None}

def require_roles(*roles: str) -> Callable:
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = kwargs.get("user")
            if not user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            user_roles = set(user.get("roles", []))
            if roles and not (user_roles & set(roles)):
                raise HTTPException(status_code=403, detail="Forbidden")
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_module(module_key: str) -> Callable:
    # placeholder: wire into core/guards.py + org enabled modules when available
    def decorator(fn: Callable) -> Callable:
        return fn
    return decorator
