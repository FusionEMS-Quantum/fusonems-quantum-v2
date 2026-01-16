from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base


class ConsentProvenance(Base):
    __tablename__ = "consent_provenance"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="PHI")
    training_mode = Column(Boolean, default=False)
    subject_type = Column(String, nullable=False)
    subject_id = Column(String, nullable=False)
    captured_by = Column(String, nullable=False)
    device_id = Column(String, default="")
    policy_hash = Column(String, default="")
    context = Column(String, default="")
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    server_time = Column(DateTime(timezone=True), server_default=func.now())
