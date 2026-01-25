from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base


class BillingClaim(Base):
    __tablename__ = "billing_claims"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    status = Column(String, default="draft")
    payer_name = Column(String, default="")
    payer_type = Column(String, default="private")
    denial_reason = Column(String, default="")
    denial_risk_flags = Column(JSON, nullable=False, default=list)
    total_charge_cents = Column(Integer, nullable=True)
    exported_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    office_ally_batch_id = Column(String, default="")
    demographics_snapshot = Column(JSON, nullable=False, default=dict)
    medical_necessity_snapshot = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BillingAssistResult(Base):
    __tablename__ = "billing_assist_results"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    snapshot_json = Column(JSON, nullable=False, default=dict)
    input_payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BillingClaimExportSnapshot(Base):
    __tablename__ = "billing_claim_export_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    claim_id = Column(Integer, ForeignKey("billing_claims.id"), nullable=False, index=True)
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    export_format = Column(String, default="office_ally")
    office_ally_batch_id = Column(String, default="")
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    ack_status = Column(String, default="pending")
    ack_payload = Column(JSON, nullable=False, default=dict)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
