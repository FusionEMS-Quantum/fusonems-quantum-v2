from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base


class TelnyxCallSummary(Base):
    __tablename__ = "telnyx_call_summaries"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    call_sid = Column(String, default="")
    caller_number = Column(String, default="")
    intent = Column(String, default="unknown")
    transcript = Column(JSON, nullable=False, default=dict)
    ai_model = Column(String, default="")
    ai_response = Column(JSON, nullable=False, default=dict)
    resolution = Column(String, default="")
    call_metadata = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TelnyxFaxRecord(Base):
    __tablename__ = "telnyx_fax_records"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    fax_sid = Column(String, default="")
    sender_number = Column(String, default="")
    status = Column(String, default="received")
    fax_metadata = Column("metadata", JSON, nullable=False, default=dict)
    parsed_facesheet = Column(JSON, nullable=False, default=dict)
    matched_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=True)
    notification_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
