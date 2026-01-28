from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.epcr_core import EpcrRecord
from models.epcr_fire import EpcrFireRecord
from models.user import User, UserRole
from utils.tenancy import scoped_query

router = APIRouter(
    prefix="/api/epcr/fire",
    tags=["ePCR Fire"],
    dependencies=[Depends(require_module("EPCR"))],
)


class FireRecordCreate(BaseModel):
    record_id: int
    fire_incident_id: str
    nfirs_codes: List[str] = Field(default_factory=list)
    fire_specific_procedures: List[str] = Field(default_factory=list)
    ic_section: str = ""
    hydrant_needed: str = "no"
    metadata: Dict[str, str] = Field(default_factory=dict)


class FireRecordUpdate(BaseModel):
    nfirs_codes: Optional[List[str]]
    fire_specific_procedures: Optional[List[str]]
    ic_section: Optional[str]
    hydrant_needed: Optional[str]


@router.post("/records", status_code=status.HTTP_201_CREATED)
def create_fire_record(
    payload: FireRecordCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = scoped_query(db, EpcrRecord, user.org_id).filter(EpcrRecord.id == payload.record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base record missing")
    fire_record = EpcrFireRecord(org_id=user.org_id, **payload.model_dump())
    db.add(fire_record)
    db.commit()
    db.refresh(fire_record)
    return fire_record


@router.get("/records")
def list_fire_records(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return (
        scoped_query(db, EpcrFireRecord, user.org_id)
        .order_by(EpcrFireRecord.created_at.desc())
        .all()
    )


@router.get("/records/{fire_id}")
def get_fire_record(
    fire_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    fire_record = (
        scoped_query(db, EpcrFireRecord, user.org_id)
        .filter(EpcrFireRecord.id == fire_id)
        .first()
    )
    if not fire_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fire record not found")
    return fire_record


@router.patch("/records/{fire_id}")
def update_fire_record(
    fire_id: int,
    payload: FireRecordUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    fire_record = (
        scoped_query(db, EpcrFireRecord, user.org_id)
        .filter(EpcrFireRecord.id == fire_id)
        .first()
    )
    if not fire_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fire record not found")
    for attr, value in payload.dict(exclude_unset=True).items():
        if hasattr(fire_record, attr):
            setattr(fire_record, attr, value)
    db.commit()
    db.refresh(fire_record)
    return fire_record
