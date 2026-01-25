from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base


class BillingAiInsight(Base):
    __tablename__ = "billing_ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    insight_type = Column(String, nullable=False)
    description = Column(String, default="")
    input_payload = Column(JSON, nullable=False, default=dict)
    output_payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
