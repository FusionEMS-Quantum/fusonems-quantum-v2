from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, Numeric, String, func

from core.database import Base


class BillingRecord(Base):
    __tablename__ = "billing_records"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    patient_name = Column(String, nullable=False)
    invoice_number = Column(String, nullable=False, index=True)
    payer = Column(String, nullable=False)
    amount_due = Column(Numeric(12, 2), nullable=False)
    status = Column(String, default="Open")
    claim_payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PriorAuthRequest(Base):
    __tablename__ = "prior_auth_requests"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    payer_id = Column(Integer, nullable=True, index=True)
    procedure_code = Column(String, nullable=False)
    auth_number = Column(String, nullable=False, index=True)
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="requested")
    notes = Column(String, default="")
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
