from enum import Enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)

from core.database import Base


class InsuranceVerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    MANUAL_REVIEW = "manual_review"
    EXPIRED = "expired"


class InsuranceCoverageType(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    TERTIARY = "tertiary"


class MetriportSyncStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class FHIRDocumentType(str, Enum):
    C_CDA = "C-CDA"
    CONSOLIDATED_CDA = "Consolidated-CDA"
    DIAGNOSTIC_REPORT = "DiagnosticReport"
    DOCUMENT_REFERENCE = "DocumentReference"


class PatientInsurance(Base):
    """Stores insurance information for patients"""
    __tablename__ = "patient_insurance"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id"), nullable=True, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=True, index=True)
    
    # Insurance Details
    coverage_type = Column(SQLEnum(InsuranceCoverageType), default=InsuranceCoverageType.PRIMARY, index=True)
    payer_name = Column(String, nullable=False)
    payer_id = Column(String, default="")
    member_id = Column(String, nullable=False, index=True)
    group_number = Column(String, default="")
    plan_name = Column(String, default="")
    
    # Verification
    verification_status = Column(SQLEnum(InsuranceVerificationStatus), default=InsuranceVerificationStatus.PENDING, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_source = Column(String, default="metriport")
    
    # Coverage Details
    is_active = Column(Boolean, default=False)
    coverage_start_date = Column(DateTime(timezone=True), nullable=True)
    coverage_end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Copay and Deductible
    copay_amount = Column(String, default="")
    deductible_amount = Column(String, default="")
    deductible_met = Column(String, default="")
    out_of_pocket_max = Column(String, default="")
    out_of_pocket_met = Column(String, default="")
    
    # Additional Information
    policy_holder_name = Column(String, default="")
    policy_holder_dob = Column(String, default="")
    relationship_to_patient = Column(String, default="self")
    
    # Raw Data
    raw_eligibility_response = Column(JSON, nullable=False, default=dict)
    
    # Metadata
    classification = Column(String, default="PHI")
    training_mode = Column(Boolean, default=False)
    notes = Column(Text, default="")
    last_verification_attempt = Column(DateTime(timezone=True), nullable=True)
    verification_error = Column(Text, default="")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MetriportPatientMapping(Base):
    """Maps local patients to Metriport patient IDs"""
    __tablename__ = "metriport_patient_mapping"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id"), nullable=True, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=True, index=True)
    
    # Metriport IDs
    metriport_patient_id = Column(String, nullable=False, unique=True, index=True)
    metriport_facility_id = Column(String, default="")
    
    # Patient Demographics at time of mapping
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(String, nullable=False)
    gender = Column(String, default="")
    phone = Column(String, default="")
    address = Column(JSON, nullable=False, default=dict)
    
    # Mapping Metadata
    mapping_confidence = Column(Integer, default=100)
    mapping_source = Column(String, default="automatic")
    mapping_verified = Column(Boolean, default=False)
    
    # Sync Status
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(SQLEnum(MetriportSyncStatus), default=MetriportSyncStatus.PENDING, index=True)
    
    # Metadata
    classification = Column(String, default="PHI")
    training_mode = Column(Boolean, default=False)
    meta_data = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MetriportWebhookEvent(Base):
    """Logs all webhook events from Metriport"""
    __tablename__ = "metriport_webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Webhook Details
    event_type = Column(String, nullable=False, index=True)
    webhook_id = Column(String, default="")
    metriport_patient_id = Column(String, default="", index=True)
    
    # Payload
    raw_payload = Column(JSON, nullable=False, default=dict)
    
    # Processing Status
    processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    processing_error = Column(Text, default="")
    retry_count = Column(Integer, default=0)
    
    # Metadata
    received_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MetriportDocumentSync(Base):
    """Tracks medical document syncs from Metriport"""
    __tablename__ = "metriport_document_sync"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    metriport_patient_id = Column(String, nullable=False, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id"), nullable=True, index=True)
    
    # Document Details
    document_id = Column(String, nullable=False, unique=True, index=True)
    document_type = Column(SQLEnum(FHIRDocumentType), default=FHIRDocumentType.C_CDA)
    document_title = Column(String, default="")
    document_description = Column(Text, default="")
    
    # Document Metadata
    document_date = Column(DateTime(timezone=True), nullable=True)
    facility_name = Column(String, default="")
    facility_npi = Column(String, default="")
    
    # Storage
    file_url = Column(String, default="")
    local_storage_path = Column(String, default="")
    file_size_bytes = Column(Integer, default=0)
    file_hash = Column(String, default="")
    
    # FHIR Data
    fhir_bundle = Column(JSON, nullable=False, default=dict)
    parsed_data = Column(JSON, nullable=False, default=dict)
    
    # Sync Status
    sync_status = Column(SQLEnum(MetriportSyncStatus), default=MetriportSyncStatus.PENDING, index=True)
    downloaded_at = Column(DateTime(timezone=True), nullable=True)
    parsed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, default="")
    
    # Metadata
    classification = Column(String, default="PHI")
    training_mode = Column(Boolean, default=False)
    meta_data = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InsuranceVerificationLog(Base):
    """Audit log for all insurance verification attempts"""
    __tablename__ = "insurance_verification_log"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    patient_insurance_id = Column(Integer, ForeignKey("patient_insurance.id"), nullable=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id"), nullable=True, index=True)
    
    # Verification Details
    verification_type = Column(String, default="eligibility")
    verification_status = Column(SQLEnum(InsuranceVerificationStatus), default=InsuranceVerificationStatus.PENDING)
    
    # Request/Response
    request_payload = Column(JSON, nullable=False, default=dict)
    response_payload = Column(JSON, nullable=False, default=dict)
    
    # Results
    is_eligible = Column(Boolean, nullable=True)
    eligibility_message = Column(Text, default="")
    error_message = Column(Text, default="")
    
    # Actor
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timing
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
