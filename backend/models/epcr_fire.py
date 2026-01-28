from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, func

from core.database import Base


class EpcrFireRecord(Base):
    __tablename__ = "epcr_fire_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("epcr_records.id"), nullable=False, index=True)
    fire_incident_id = Column(String, default="")
    nfirs_codes = Column(JSON, nullable=False, default=list)
    fire_specific_procedures = Column(JSON, nullable=False, default=list)
    ic_section = Column(String, default="")
    hydrant_needed = Column(String, default="no")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
