from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, func

from core.database import Base


class MdtEvent(Base):
    __tablename__ = "mdt_events"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    call_id = Column(Integer, ForeignKey("cad_calls.id"), nullable=True, index=True)
    dispatch_id = Column(Integer, ForeignKey("cad_dispatches.id"), nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("cad_units.id"), nullable=False, index=True)
    status = Column(String, nullable=False)
    notes = Column(String, default="")
    payload = Column(JSON, nullable=False, default=dict)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MdtObdIngest(Base):
    __tablename__ = "mdt_obd_ingests"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    call_id = Column(Integer, ForeignKey("cad_calls.id"), nullable=True, index=True)
    dispatch_id = Column(Integer, ForeignKey("cad_dispatches.id"), nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("cad_units.id"), nullable=False, index=True)
    mileage = Column(Float, nullable=True)
    ignition_on = Column(Boolean, default=False)
    lights_sirens_active = Column(Boolean, default=False)
    raw_payload = Column(JSON, nullable=False, default=dict)
    leg_mileage = Column(Float, default=0.0)
    transport_distance = Column(Float, default=0.0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MdtCadSyncEvent(Base):
    __tablename__ = "mdt_cad_sync_events"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    direction = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    call_id = Column(Integer, ForeignKey("cad_calls.id"), nullable=True, index=True)
    dispatch_id = Column(Integer, ForeignKey("cad_dispatches.id"), nullable=True, index=True)
    unit_id = Column(Integer, ForeignKey("cad_units.id"), nullable=True, index=True)
    payload = Column(JSON, nullable=False, default=dict)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
