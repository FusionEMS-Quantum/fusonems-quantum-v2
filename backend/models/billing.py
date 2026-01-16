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
