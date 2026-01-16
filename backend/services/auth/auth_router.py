from datetime import timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import create_access_token, hash_password, verify_password
from core.modules import MODULE_DEPENDENCIES
from models.module_registry import ModuleRegistry
from models.organization import Organization
from models.user import User, UserRole
from utils.write_ops import audit_and_event, model_snapshot


router = APIRouter(prefix="/api/auth", tags=["Auth"])


class RegisterPayload(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.dispatcher
    organization_name: str


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterPayload, db: Session = Depends(get_db), request: Request = None):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User exists")
    org = db.query(Organization).filter(Organization.name == payload.organization_name).first()
    if not org:
        org = Organization(
            name=payload.organization_name,
            encryption_key=secrets.token_hex(32),
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        for module_key, deps in MODULE_DEPENDENCIES.items():
            db.add(
                ModuleRegistry(
                    org_id=org.id,
                    module_key=module_key,
                    dependencies=deps,
                    enabled=True,
                    kill_switch=False,
                )
            )
        db.commit()
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
        org_id=org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if request is not None:
        audit_and_event(
            db=db,
            request=request,
            user=user,
            action="create",
            resource="user",
            classification="NON_PHI",
            after_state=model_snapshot(user),
            event_type="RECORD_WRITTEN",
            event_payload={"user_id": user.id},
        )
    token = create_access_token({"sub": user.id, "org": user.org_id, "role": user.role})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(
        {"sub": user.id, "org": user.org_id, "role": user.role},
        expires_delta=timedelta(hours=12),
    )
    return TokenResponse(access_token=token)
