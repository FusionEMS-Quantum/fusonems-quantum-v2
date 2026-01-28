from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.epcr_core import EpcrRecord
from models.epcr_ems import EpcrEmsRecord
from models.user import User, UserRole
from utils.tenancy import scoped_query

router = APIRouter(
    prefix="/api/epcr/ems",
    tags=["ePCR EMS"],
    dependencies=[Depends(require_module("EPCR"))],
)


class EmsRecordCreate(BaseModel):
    record_id: int
    transport_mode: str = "911"
    level_of_care: str = "BLS"
    interfacility_transfer: str = "no"
    crew_certifications: List[str] = Field(default_factory=list)
    ems_notes: str = ""


class EmsRecordUpdate(BaseModel):
    transport_mode: Optional[str]
    level_of_care: Optional[str]
    interfacility_transfer: Optional[str]
    crew_certifications: Optional[List[str]]
    ems_notes: Optional[str]


@router.post("/records", status_code=status.HTTP_201_CREATED)
def create_ems_record(
    payload: EmsRecordCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = scoped_query(db, EpcrRecord, user.org_id).filter(EpcrRecord.id == payload.record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base record missing")
    ems_record = EpcrEmsRecord(org_id=user.org_id, **payload.model_dump())
    db.add(ems_record)
    db.commit()
    db.refresh(ems_record)
    return ems_record


@router.get("/records")
def list_ems_records(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return (
        scoped_query(db, EpcrEmsRecord, user.org_id)
        .order_by(EpcrEmsRecord.created_at.desc())
        .all()
    )


@router.get("/records/{ems_id}")
def get_ems_record(
    ems_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = (
        scoped_query(db, EpcrEmsRecord, user.org_id)
        .filter(EpcrEmsRecord.id == ems_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EMS record not found")
    return record


@router.patch("/records/{ems_id}")
def update_ems_record(
    ems_id: int,
    payload: EmsRecordUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = (
        scoped_query(db, EpcrEmsRecord, user.org_id)
        .filter(EpcrEmsRecord.id == ems_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EMS record not found")
    for attr, value in payload.dict(exclude_unset=True).items():
        if hasattr(record, attr):
            setattr(record, attr, value)
    db.commit()
    db.refresh(record)
    return record
