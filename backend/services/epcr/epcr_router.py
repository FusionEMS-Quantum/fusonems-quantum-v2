from datetime import datetime

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.epcr import Patient
from models.user import User, UserRole
from utils.legal import enforce_legal_hold
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot
from utils.tenancy import get_scoped_record, scoped_query


router = APIRouter(
    prefix="/api/epcr",
    tags=["ePCR"],
    dependencies=[Depends(require_module("EPCR"))],
)


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str
    incident_number: str
    vitals: dict = {}
    interventions: list = []
    medications: list = []
    procedures: list = []


class PatientResponse(PatientCreate):
    id: int

    class Config:
        from_attributes = True


@router.post("/patients", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    enforce_legal_hold(db, user.org_id, "epcr_patient", payload.incident_number, "create")
    patient = Patient(**payload.dict(), org_id=user.org_id)
    apply_training_mode(patient, request)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="epcr_patient",
        classification=patient.classification,
        after_state=model_snapshot(patient),
        event_type="PATIENT_CONTACT",
        event_payload={"patient_id": patient.id, "incident_number": patient.incident_number},
    )
    return patient


@router.get("/patients/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    patient = get_scoped_record(db, request, Patient, patient_id, user, resource_label="epcr")
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="read",
        resource="epcr_patient",
        classification=patient.classification,
        after_state=model_snapshot(patient),
        event_type="RECORD_ACCESSED",
        event_payload={"patient_id": patient.id, "resource": "epcr"},
        reason_code="READ",
    )
    return patient


@router.get("/patients", response_model=list[PatientResponse])
def list_patients(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    return scoped_query(db, Patient, user.org_id, request.state.training_mode).order_by(
        Patient.created_at.desc()
    ).all()


@router.post("/patients/{patient_id}/lock")
def lock_chart(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    patient = get_scoped_record(db, request, Patient, patient_id, user, resource_label="epcr")
    enforce_legal_hold(db, user.org_id, "epcr_patient", str(patient.id), "update")
    before = model_snapshot(patient)
    patient.chart_locked = True
    patient.locked_at = datetime.utcnow()
    patient.locked_by = user.email
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="epcr_patient",
        classification=patient.classification,
        before_state=before,
        after_state=model_snapshot(patient),
        event_type="CHART_LOCKED",
        event_payload={"patient_id": patient.id, "locked_by": user.email},
    )
    return {"status": "locked", "patient_id": patient.id}
