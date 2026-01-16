from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func

from core.database import Base


class LegalHold(Base):
    __tablename__ = "legal_holds"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="LEGAL_HOLD")
    training_mode = Column(Boolean, default=False)
    scope_type = Column(String, nullable=False)
    scope_id = Column(String, nullable=False)
    reason = Column(Text, default="")
    status = Column(String, default="Active")
    created_by = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    released_at = Column(DateTime(timezone=True), nullable=True)


class Addendum(Base):
    __tablename__ = "addenda"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="LEGAL_HOLD")
    training_mode = Column(Boolean, default=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    author = Column(String, default="")
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OverrideRequest(Base):
    __tablename__ = "override_requests"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="LEGAL_HOLD")
    training_mode = Column(Boolean, default=False)
    override_type = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    reason_code = Column(String, nullable=False)
    notes = Column(Text, default="")
    status = Column(String, default="Pending")
    created_by = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(String, default="")
    approved_at = Column(DateTime(timezone=True), nullable=True)
