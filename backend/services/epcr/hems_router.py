from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.epcr_core import EpcrRecord
from models.epcr_hems import EpcrHemsRecord
from models.user import User, UserRole
from utils.tenancy import scoped_query

router = APIRouter(
    prefix="/api/epcr/hems",
    tags=["ePCR HEMS"],
    dependencies=[Depends(require_module("EPCR"))],
)


class HemsRecordCreate(BaseModel):
    record_id: int
    flight_number: str
    aircraft_id: str
    critical_care_interventions: List[str] = Field(default_factory=list)
    ventilator_settings: List[dict] = Field(default_factory=list)
    routing_notes: str = ""


class HemsRecordUpdate(BaseModel):
    routing_notes: Optional[str]
    critical_care_interventions: Optional[List[str]]
    ventilator_settings: Optional[List[dict]]


@router.post("/records", status_code=status.HTTP_201_CREATED)
def create_hems_record(
    payload: HemsRecordCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = scoped_query(db, EpcrRecord, user.org_id).filter(EpcrRecord.id == payload.record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base record missing")
    hems_record = EpcrHemsRecord(org_id=user.org_id, **payload.model_dump())
    db.add(hems_record)
    db.commit()
    db.refresh(hems_record)
    return hems_record


@router.get("/records")
def list_hems_records(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return (
        scoped_query(db, EpcrHemsRecord, user.org_id)
        .order_by(EpcrHemsRecord.created_at.desc())
        .all()
    )


@router.get("/records/{hems_id}")
def get_hems_record(
    hems_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = (
        scoped_query(db, EpcrHemsRecord, user.org_id)
        .filter(EpcrHemsRecord.id == hems_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HEMS record not found")
    return record


@router.patch("/records/{hems_id}")
def update_hems_record(
    hems_id: int,
    payload: HemsRecordUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = (
        scoped_query(db, EpcrHemsRecord, user.org_id)
        .filter(EpcrHemsRecord.id == hems_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HEMS record not found")
    for attr, value in payload.dict(exclude_unset=True).items():
        if hasattr(record, attr):
            setattr(record, attr, value)
    db.commit()
    db.refresh(record)
    return record
