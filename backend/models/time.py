from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from core.database import Base


class DeviceClockDrift(Base):
    __tablename__ = "device_clock_drifts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    device_id = Column(String, nullable=False)
    drift_seconds = Column(Integer, nullable=False)
    device_time = Column(DateTime(timezone=True), nullable=True)
    server_time = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
