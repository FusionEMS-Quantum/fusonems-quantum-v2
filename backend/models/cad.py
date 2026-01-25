from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import relationship

from core.database import Base


class Call(Base):
    __tablename__ = "cad_calls"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    caller_name = Column(String, nullable=False)
    caller_phone = Column(String, nullable=False)
    location_address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    priority = Column(String, default="Routine")
    status = Column(String, default="Pending")
    eta_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dispatches = relationship("Dispatch", back_populates="call")


class Unit(Base):
    __tablename__ = "cad_units"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    unit_identifier = Column(String, unique=True, nullable=False, index=True)
    unit_type = Column(String, default="BLS")
    status = Column(String, default="Available")
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    last_update = Column(DateTime(timezone=True), server_default=func.now())

    dispatches = relationship("Dispatch", back_populates="unit")


class Dispatch(Base):
    __tablename__ = "cad_dispatches"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    call_id = Column(Integer, ForeignKey("cad_calls.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("cad_units.id"), nullable=False)
    status = Column(String, default="Dispatched")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    call = relationship("Call", back_populates="dispatches")
    unit = relationship("Unit", back_populates="dispatches")


class CADIncident(Base):
    __tablename__ = "cad_incidents"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    requesting_facility = Column(String, nullable=False)
    receiving_facility = Column(String, nullable=False)
    transport_type = Column(String, nullable=False)
    priority = Column(String, default="Routine")
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="pending")
    transport_link_trip_id = Column(Integer, ForeignKey("transport_trips.id"), nullable=True, index=True)
    assigned_unit_id = Column(Integer, ForeignKey("cad_units.id"), nullable=True, index=True)
    eta_minutes = Column(Integer, nullable=True)
    distance_meters = Column(Float, nullable=True)
    route_geometry = Column(JSON, nullable=False, default=list)
    notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    assigned_unit = relationship("Unit", backref="incident_assignments")
    timeline_entries = relationship("CADIncidentTimeline", back_populates="incident")
    crewlink_messages = relationship("CrewLinkPage", back_populates="incident")


class CADIncidentTimeline(Base):
    __tablename__ = "cad_incident_timelines"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("cad_incidents.id"), nullable=False, index=True)
    status = Column(String, nullable=False)
    notes = Column(Text, default="")
    payload = Column(JSON, nullable=False, default=dict)
    recorded_by_id = Column(Integer, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("CADIncident", back_populates="timeline_entries")


class CrewLinkPage(Base):
    __tablename__ = "crewlink_pages"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    cad_incident_id = Column(Integer, ForeignKey("cad_incidents.id"), nullable=True, index=True)
    event_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("CADIncident", back_populates="crewlink_messages")
