from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_on_shift, require_roles, require_trusted_device
from models.epcr import Patient
from models.epcr_core import (
    EpcrAssessment,
    EpcrIntervention,
    EpcrMedication,
    EpcrNarrative,
    EpcrRecord,
    EpcrRecordStatus,
    EpcrTimeline,
    EpcrVitals,
    NEMSISValidationResult,
    NEMSISValidationStatus,
)
from models.user import User, UserRole
from utils.tenancy import scoped_query

from .ai_suggestions import AISuggestions
from .billing_sync import BillingSyncService
from .cad_sync import CADSyncService
from .hospital_notifications import HospitalNotificationService
from .nemsis_export import NEMSISExporter
from .offline_sync import OfflineSyncManager
from .ocr_service import OCRService
from .rule_engine import RuleEngine
from .voice_service import VoiceService

router = APIRouter(
    prefix="/api/epcr",
    tags=["ePCR"],
    dependencies=[Depends(require_module("EPCR"))],
)


class RecordCreate(BaseModel):
    patient_id: int
    incident_number: str
    record_number: Optional[str] = None
    chief_complaint: Optional[str] = ""
    dispatch_datetime: Optional[datetime] = None
    scene_arrival_datetime: Optional[datetime] = None
    hospital_arrival_datetime: Optional[datetime] = None
    patient_destination: Optional[str] = ""
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    nemsis_state: str = "WI"
    training_mode: bool = False


class RecordUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    patient_destination: Optional[str] = None
    scene_departure_datetime: Optional[datetime] = None
    hospital_arrival_datetime: Optional[datetime] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    status: Optional[EpcrRecordStatus] = None


class RecordResponse(BaseModel):
    id: int
    patient_id: int
    incident_number: str
    record_number: str
    status: EpcrRecordStatus
    chief_complaint: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class VitalEntry(BaseModel):
    values: Dict[str, Any]
    recorded_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "manual"
    notes: str = ""
    provider_id: Optional[int] = None


class AssessmentEntry(BaseModel):
    assessment_summary: str
    clinical_impression: Optional[str] = ""
    plan: Optional[str] = ""
    chief_complaint: Optional[str] = ""


class InterventionEntry(BaseModel):
    procedure_name: str
    description: Optional[str] = ""
    performed_at: Optional[datetime] = None
    location: Optional[str] = "scene"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MedicationEntry(BaseModel):
    medication_name: str
    ndc: Optional[str] = ""
    dose: Optional[str] = ""
    units: Optional[str] = ""
    route: Optional[str] = ""
    administration_time: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NarrativeEntry(BaseModel):
    narrative_text: Optional[str] = ""
    structured_data: Dict[str, Any] = Field(default_factory=dict)
    voice_transcription: Optional[str] = None
    origin: str = "manual"


class OCRSnapshotEntry(BaseModel):
    device_type: str
    device_name: str = ""
    fields: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    captured_at: Optional[datetime] = None
    raw_text: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TimelineEvent(BaseModel):
    event_type: str
    description: str
    timestamp: datetime
    metadata: Dict[str, Any]


class ValidationStatusResponse(BaseModel):
    status: str
    validator_version: str
    errors: List[Dict[str, Any]]
    missing_fields: List[str]
    validation_timestamp: datetime

    class Config:
        orm_mode = True


def _get_record(db: Session, user: User, record_id: int) -> EpcrRecord:
    record = scoped_query(db, EpcrRecord, user.org_id).filter(EpcrRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ePCR record not found")
    return record


def _append_timeline(db: Session, record: EpcrRecord, event_type: str, description: str, metadata: Dict[str, Any] | None = None):
    entry = EpcrTimeline(
        org_id=record.org_id,
        record_id=record.id,
        event_type=event_type,
        description=description,
        timestamp=datetime.now(timezone.utc),
        metadata=metadata or {},
    )
    db.add(entry)
    db.commit()


@router.post("/records", response_model=RecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: RecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
    _: User = Depends(require_on_shift),
    __: User = Depends(require_trusted_device),
):
    patient = scoped_query(db, Patient, user.org_id).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    record = EpcrRecord(
        org_id=user.org_id,
        patient_id=payload.patient_id,
        record_number=payload.record_number or f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        incident_number=payload.incident_number,
        chief_complaint=payload.chief_complaint,
        dispatch_datetime=payload.dispatch_datetime,
        scene_arrival_datetime=payload.scene_arrival_datetime,
        hospital_arrival_datetime=payload.hospital_arrival_datetime,
        patient_destination=payload.patient_destination,
        custom_fields=payload.custom_fields,
        nemsis_state=payload.nemsis_state,
        training_mode=payload.training_mode,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    _append_timeline(db, record, "record.created", "Record created", {"created_by": user.id, "incident_number": record.incident_number})
    return record


@router.get("/records", response_model=List[RecordResponse])
def list_records(
    status_filter: Optional[EpcrRecordStatus] = None,
    patient_id: Optional[int] = None,
    limit: int = 25,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    query = scoped_query(db, EpcrRecord, user.org_id)
    if status_filter:
        query = query.filter(EpcrRecord.status == status_filter)
    if patient_id:
        query = query.filter(EpcrRecord.patient_id == patient_id)
    records = query.order_by(EpcrRecord.created_at.desc()).offset(offset).limit(limit).all()
    return records


@router.get("/records/{record_id}", response_model=RecordResponse)
def get_record(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    return record


@router.patch("/records/{record_id}", response_model=RecordResponse)
def update_record(
    record_id: int,
    payload: RecordUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    updates = payload.dict(exclude_unset=True)
    for attr, value in updates.items():
        if hasattr(record, attr):
            setattr(record, attr, value)
    db.commit()
    db.refresh(record)
    _append_timeline(db, record, "record.updated", "Record updated", {"updates": updates, "updated_by": user.id})
    return record


@router.post("/records/{record_id}/vitals", status_code=status.HTTP_201_CREATED)
def add_vitals(
    record_id: int,
    payload: VitalEntry,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    vitals = EpcrVitals(
        org_id=user.org_id,
        record_id=record.id,
        values=payload.values,
        recorded_at=payload.recorded_at,
        source=payload.source,
        provider_id=payload.provider_id,
        notes=payload.notes,
    )
    db.add(vitals)
    db.commit()
    rule_payload = RuleEngine.validate_record(db, record)
    _append_timeline(db, record, "vitals.recorded", "Vitals recorded", {"values": payload.values, "rule_status": rule_payload["status"]})
    return {"status": rule_payload["status"], "errors": rule_payload.get("errors", [])}


@router.post("/records/{record_id}/assessment", status_code=status.HTTP_201_CREATED)
def add_assessment(
    record_id: int,
    payload: AssessmentEntry,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    assessment = EpcrAssessment(
        org_id=user.org_id,
        record_id=record.id,
        assessment_summary=payload.assessment_summary,
        clinical_impression=payload.clinical_impression,
        plan=payload.plan,
        chief_complaint=payload.chief_complaint or record.chief_complaint,
    )
    db.add(assessment)
    db.commit()
    _append_timeline(db, record, "assessment.logged", "Assessment captured", payload.dict())
    return {"id": assessment.id}


@router.post("/records/{record_id}/intervention", status_code=status.HTTP_201_CREATED)
def add_intervention(
    record_id: int,
    payload: InterventionEntry,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    intervention = EpcrIntervention(
        org_id=user.org_id,
        record_id=record.id,
        procedure_name=payload.procedure_name,
        description=payload.description,
        performed_at=payload.performed_at,
        location=payload.location,
        metadata=payload.metadata,
    )
    db.add(intervention)
    db.commit()
    _append_timeline(db, record, "intervention.logged", payload.procedure_name, payload.metadata)
    BillingSyncService.map_to_billing(record, intervention)
    return {"id": intervention.id}


@router.post("/records/{record_id}/medication", status_code=status.HTTP_201_CREATED)
def add_medication(
    record_id: int,
    payload: MedicationEntry,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    medication = EpcrMedication(
        org_id=user.org_id,
        record_id=record.id,
        medication_name=payload.medication_name,
        ndc=payload.ndc,
        dose=payload.dose,
        units=payload.units,
        route=payload.route,
        administration_time=payload.administration_time,
        metadata=payload.metadata,
    )
    db.add(medication)
    db.commit()
    BillingSyncService.map_to_billing(record, medication)
    _append_timeline(db, record, "medication.administered", payload.medication_name, payload.metadata)
    return {"id": medication.id}


@router.post("/records/{record_id}/narrative", status_code=status.HTTP_201_CREATED)
def add_narrative(
    record_id: int,
    payload: NarrativeEntry,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    patient = scoped_query(db, Patient, user.org_id).filter(Patient.id == record.patient_id).first()
    raw_transcription = payload.voice_transcription or payload.narrative_text or ""
    refined_text = raw_transcription
    if payload.voice_transcription:
        refined_text = VoiceService.refine_transcription(raw_transcription, patient)
        refined_text = VoiceService.generate_narrative_from_voice(refined_text, patient, payload.structured_data)

    narrative = EpcrNarrative(
        org_id=user.org_id,
        record_id=record.id,
        narrative_text=payload.narrative_text or refined_text,
        ai_refined_text=refined_text,
        generation_source=payload.origin,
        metadata={"structured_data": payload.structured_data},
    )
    db.add(narrative)
    db.commit()
    AISuggestions.log_suggestion(record, narrative)
    _append_timeline(db, record, "narrative.generated", "Narrative recorded", {"source": payload.origin})
    return {"id": narrative.id}


@router.post("/records/{record_id}/ocr", status_code=status.HTTP_201_CREATED)
def add_ocr_snapshot(
    record_id: int,
    payload: OCRSnapshotEntry,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    snapshot = OCRService.ingest_snapshot(db, record, payload.model_dump())
    _append_timeline(db, record, "ocr.ingested", "OCR snapshot stored", {"device": payload.device_type})
    return {"id": snapshot.id, "confidence": snapshot.confidence}


@router.post("/records/{record_id}/post", status_code=status.HTTP_200_OK)
def finalize_record(
    record_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
    _: User = Depends(require_on_shift),
    __: User = Depends(require_trusted_device),
):
    record = _get_record(db, user, record_id)
    validation = RuleEngine.validate_record(db, record)
    status_value = validation.get("status", "fail")
    try:
        status_enum = NEMSISValidationStatus(status_value)
    except ValueError:
        status_enum = NEMSISValidationStatus.FAIL
    validation_entry = NEMSISValidationResult(
        org_id=user.org_id,
        epcr_patient_id=record.patient_id,
        status=status_enum,
        missing_fields=validation.get("missing_fields", []),
        validation_errors=validation.get("errors", []),
        validator_version="rule-engine-1.0",
    )
    record.status = EpcrRecordStatus.FINALIZED
    record.finalized_at = datetime.now(timezone.utc)
    record.finalized_by = user.id
    db.add(validation_entry)
    db.commit()
    AISuggestions.suggest_protocol(record)
    NEMSISExporter.export_record_to_nemsis(record)
    OfflineSyncManager.queue_record(db, record)
    HospitalNotificationService.queue_notification(db, record)
    CADSyncService.sync_incident(db, record)
    _append_timeline(db, record, "record.finalized", "Record posted", {"validation": validation})
    return {"record_id": record.id, "validation": validation}


@router.get("/records/{record_id}/timeline", response_model=List[TimelineEvent])
def get_timeline(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    events = db.query(EpcrTimeline).filter(EpcrTimeline.record_id == record.id).order_by(EpcrTimeline.timestamp.asc()).all()
    return events


@router.get("/records/{record_id}/validation", response_model=ValidationStatusResponse)
def get_validation_status(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = _get_record(db, user, record_id)
    validation = (
        db.query(NEMSISValidationResult)
        .filter(NEMSISValidationResult.epcr_patient_id == record.patient_id)
        .order_by(NEMSISValidationResult.validation_timestamp.desc())
        .first()
    )
    if not validation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No validation results yet")
    return validation
