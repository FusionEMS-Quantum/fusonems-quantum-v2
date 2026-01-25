from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.billing import PriorAuthRequest
from models.user import User, UserRole
from services.billing.prior_auth_service import PriorAuthService
from utils.tenancy import get_scoped_record


router = APIRouter(
    prefix="/api/billing/prior-auth",
    tags=["Billing", "PriorAuth"],
    dependencies=[Depends(require_module("BILLING"))],
)


class PriorAuthCreateRequest(BaseModel):
    epcr_patient_id: int
    payer_id: Optional[int] = None
    procedure_code: str
    auth_number: str
    expiration_date: Optional[str] = None
    status: str = "requested"
    notes: str | None = None
    payload: dict[str, Any] = {}


class PriorAuthStatusUpdate(BaseModel):
    status: str = "expired"


def _require_request_service(db: Session, user: User) -> PriorAuthService:
    return PriorAuthService(db=db, org_id=user.org_id)


@router.post("/request")
def request_prior_auth(
    payload: PriorAuthCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    service = PriorAuthService(db, user.org_id)
    auth = service.request_prior_auth(request, user, payload.dict())
    return model_to_dict(auth)


@router.get("/status/{epcr_patient_id}")
def get_prior_auth_status(
    epcr_patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    records = (
        db.query(PriorAuthRequest)
        .filter(
            PriorAuthRequest.org_id == user.org_id,
            PriorAuthRequest.epcr_patient_id == epcr_patient_id,
        )
        .order_by(PriorAuthRequest.created_at.desc())
        .all()
    )
    return [model_to_dict(record) for record in records]


@router.delete("/{auth_id}")
def update_prior_auth(
    auth_id: int,
    payload: PriorAuthStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    service = PriorAuthService(db, user.org_id)
    try:
        record = service.update_status(request, user, auth_id, payload.status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="auth_not_found")
    return model_to_dict(record)


def model_to_dict(record: PriorAuthRequest) -> dict[str, Any]:
    return {
        "id": record.id,
        "epcr_patient_id": record.epcr_patient_id,
        "procedure_code": record.procedure_code,
        "payer_id": record.payer_id,
        "auth_number": record.auth_number,
        "expiration_date": record.expiration_date.isoformat() if record.expiration_date else None,
        "status": record.status,
        "notes": record.notes,
        "payload": record.payload,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }
