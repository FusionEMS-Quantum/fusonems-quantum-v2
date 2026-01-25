from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base

from models.telehealth import TelehealthSession


class DataExportManifest(Base):
    __tablename__ = "data_export_manifests"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="LEGAL_HOLD")
    training_mode = Column(Boolean, default=False)
    manifest = Column(JSON, nullable=False, default=dict)
    export_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OrphanRepairAction(Base):
    __tablename__ = "orphan_repair_actions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    orphan_type = Column(String, nullable=False)
    orphan_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CarefusionExportSnapshot(Base):
    __tablename__ = "carefusion_export_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    epcr_patient_id = Column(Integer, ForeignKey("epcr_patients.id"), nullable=True, index=True)
    telehealth_session_uuid = Column(
        String,
        ForeignKey(TelehealthSession.session_uuid),
        nullable=True,
        index=True,
    )
    classification = Column(String, default="BILLING_SENSITIVE")
    training_mode = Column(Boolean, default=False)
    payload = Column(JSON, nullable=False, default=dict)
    exported_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
