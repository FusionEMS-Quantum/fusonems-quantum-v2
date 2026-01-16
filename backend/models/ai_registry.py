from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, func

from core.database import Base


class AiOutputRegistry(Base):
    __tablename__ = "ai_output_registry"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    advisory_level = Column(String, default="ADVISORY")
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    prompt_hash = Column(String, nullable=False)
    config_snapshot = Column(JSON, nullable=False, default=dict)
    input_refs = Column(JSON, nullable=False, default=list)
    output_text = Column(Text, nullable=False)
    acceptance_state = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
