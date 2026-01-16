from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from utils.audit import record_audit
from models.time import DeviceClockDrift
from models.organization import Organization
from models.user import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    request: Request = None,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        token_org = payload.get("org")
        if user_id is None:
            raise credentials_exception
        try:
            user_id = int(user_id)
        except (TypeError, ValueError) as exc:
            raise credentials_exception from exc
    except JWTError as exc:
        raise credentials_exception from exc
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    if user.org_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization missing")
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization missing")
    if request is not None:
        request.state.org_lifecycle = org.lifecycle_state
        request.state.training_mode = (
            org.training_mode == "ENABLED" or getattr(user, "training_mode", False)
        )
    lifecycle = org.lifecycle_state or "ACTIVE"
    if lifecycle == "TERMINATED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ORG_TERMINATED")
    if lifecycle == "SUSPENDED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ORG_SUSPENDED")
    if lifecycle in {"PAST_DUE", "READ_ONLY"} and request is not None:
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ORG_READ_ONLY")
        if token_org is not None and str(user.org_id) != str(token_org):
            if request is not None:
                record_audit(
                    db=db,
                    request=request,
                    user=user,
                    action="token-org-mismatch",
                    resource="auth",
                    outcome="Blocked",
                    classification="NON_PHI",
                    training_mode=getattr(request.state, "training_mode", False),
                    reason_code="TOKEN_ORG_MISMATCH",
                )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Org mismatch")
    if request is not None:
        request.state.user = user
        device_id = request.headers.get("x-device-id", "")
        drift_seconds = getattr(request.state, "drift_seconds", 0)
        drifted = getattr(request.state, "drifted", False)
        device_time = getattr(request.state, "device_time", None)
        server_time = getattr(request.state, "server_time", None)
        if device_id and drifted:
            db.add(
                DeviceClockDrift(
                    org_id=user.org_id,
                    device_id=device_id,
                    drift_seconds=drift_seconds,
                    device_time=device_time,
                    server_time=server_time,
                )
            )
            db.commit()
    return user


def require_roles(*roles: UserRole):
    def _require(user: User = Depends(get_current_user)) -> User:
        allowed = {role.value for role in roles}
        if roles and user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _require
