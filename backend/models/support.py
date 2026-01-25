from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base


class SupportSession(Base):
    __tablename__ = "support_sessions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_device_id = Column(String, nullable=True)
    purpose = Column(String, nullable=False, default="mirror")
    status = Column(String, default="pending")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consent_required = Column(Boolean, default=False)
    consented_at = Column(DateTime(timezone=True), nullable=True)
    consent_token_hash = Column(String, default="")
    session_token_hash = Column(String, default="")
    consent_requested_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)


class SupportMirrorEvent(Base):
    __tablename__ = "support_mirror_events"

    id = Column(Integer, primary_key=True, index=True)
    support_session_id = Column(Integer, ForeignKey("support_sessions.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    payload_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SupportInteraction(Base):
    __tablename__ = "support_interactions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    channel = Column(String, nullable=False)
    direction = Column(String, nullable=True)
    from_number = Column(String, nullable=True)
    to_number = Column(String, nullable=True)
    payload = Column(JSON, nullable=False, default=dict)
    resolved_flag = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
