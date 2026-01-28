from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, func

from core.database import Base


class EpcrHemsRecord(Base):
    __tablename__ = "epcr_hems_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("epcr_records.id"), nullable=False, index=True)
    flight_number = Column(String, default="")
    aircraft_id = Column(String, default="")
    critical_care_interventions = Column(JSON, nullable=False, default=list)
    ventilator_settings = Column(JSON, nullable=False, default=list)
    routing_notes = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
