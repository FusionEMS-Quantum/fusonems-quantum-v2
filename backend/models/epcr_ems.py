from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, func

from core.database import Base


class EpcrEmsRecord(Base):
    __tablename__ = "epcr_ems_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("epcr_records.id"), nullable=False, index=True)
    transport_mode = Column(String, default="911")
    level_of_care = Column(String, default="BLS")
    interfacility_transfer = Column(String, default="no")
    crew_certifications = Column(JSON, nullable=False, default=list)
    ems_notes = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
