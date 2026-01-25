from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func, Text, Enum as SQLEnum
from enum import Enum

from core.database import Base


class PatientStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    LOCKED = "locked"
    BILLING_READY = "billing_ready"


class NEMSISValidationStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARN = "warn"


class Patient(Base):
    __tablename__ = "epcr_patients"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="PHI")
    training_mode = Column(Boolean, default=False)
    nemsis_version = Column(String, default="3.5.1")
    nemsis_state = Column(String, default="WI")
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(String, nullable=False)
    phone = Column(String, default="")
    address = Column(String, default="")
    incident_number = Column(String, nullable=False, index=True)
    vitals = Column(JSON, nullable=False, default=dict)
    interventions = Column(JSON, nullable=False, default=list)
    medications = Column(JSON, nullable=False, default=list)
    procedures = Column(JSON, nullable=False, default=list)
    labs = Column(JSON, nullable=False, default=list)
    cct_interventions = Column(JSON, nullable=False, default=list)
    ocr_snapshots = Column(JSON, nullable=False, default=list)
    narrative = Column(String, default="")
    chart_locked = Column(Boolean, default=False)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String, default="")
    status = Column(SQLEnum(PatientStatus), default=PatientStatus.DRAFT, index=True)
    qa_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MasterPatient(Base):
    __tablename__ = "master_patients"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="PHI")
    training_mode = Column(Boolean, default=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(String, nullable=False)
    phone = Column(String, default="")
    address = Column(String, default="")
    merged_into_id = Column(Integer, ForeignKey("master_patients.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MasterPatientLink(Base):
    __tablename__ = "master_patient_links"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id"), nullable=False, index=True)
    provenance = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MasterPatientMerge(Base):
    __tablename__ = "master_patient_merges"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    from_id = Column(Integer, ForeignKey("master_patients.id"), nullable=False)
    to_id = Column(Integer, ForeignKey("master_patients.id"), nullable=False)
    reason = Column(String, default="")
    actor = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NEMSISValidationResult(Base):
    __tablename__ = "nemsis_validation_results"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    
    validation_timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    nemsis_version = Column(String, default="3.5.1")
    status = Column(SQLEnum(NEMSISValidationStatus), default=NEMSISValidationStatus.FAIL)
    
    missing_fields = Column(JSON, nullable=False, default=list)
    validation_errors = Column(JSON, nullable=False, default=list)
    validator_version = Column(String, default="1.0.0")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PatientStateTimeline(Base):
    __tablename__ = "patient_state_timeline"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    
    from_status = Column(SQLEnum(PatientStatus), default=PatientStatus.DRAFT)
    to_status = Column(SQLEnum(PatientStatus), default=PatientStatus.DRAFT)
    transition_reason = Column(String, default="")
    
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    payload = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class NarrativeVersion(Base):
    __tablename__ = "narrative_versions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    
    version_number = Column(Integer, default=1)
    narrative_text = Column(Text, default="")
    generation_source = Column(String, default="manual")
    generation_metadata = Column(JSON, nullable=False, default=dict)
    
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_current = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
