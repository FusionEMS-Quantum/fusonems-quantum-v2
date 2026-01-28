from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, func

from core.database import FireBase


class FireScheduleShift(FireBase):
    __tablename__ = "fire_schedule_shifts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    
    shift_id = Column(String, unique=True, nullable=False, index=True)
    shift_type = Column(String, nullable=False)
    shift_name = Column(String, nullable=False)
    
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_hours = Column(Integer, default=0)
    
    station_id = Column(String, nullable=False)
    station_name = Column(String, nullable=False)
    
    capacity = Column(Integer, default=0)
    assigned_personnel = Column(JSON, nullable=False, default=list)
    
    status = Column(String, default="Open")
    recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String, default="")
    
    notes = Column(Text, default="")
    created_by = Column(String, default="")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FireScheduleAssignment(FireBase):
    __tablename__ = "fire_schedule_assignments"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    
    assignment_id = Column(String, unique=True, nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("fire_schedule_shifts.id"), nullable=False)
    shift_identifier = Column(String, nullable=False)
    
    personnel_id = Column(Integer, nullable=False)
    personnel_name = Column(String, nullable=False)
    
    role = Column(String, default="Firefighter")
    status = Column(String, default="Assigned")
    
    confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    
    notes = Column(Text, default="")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FireScheduleRequest(FireBase):
    __tablename__ = "fire_schedule_requests"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    
    request_id = Column(String, unique=True, nullable=False, index=True)
    personnel_id = Column(Integer, nullable=False)
    personnel_name = Column(String, nullable=False)
    
    request_type = Column(String, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    reason = Column(String, nullable=False)
    status = Column(String, default="Pending")
    
    approved_by = Column(String, default="")
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    notes = Column(Text, default="")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FireScheduleTimeline(FireBase):
    __tablename__ = "fire_schedule_timeline"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    
    shift_id = Column(Integer, ForeignKey("fire_schedule_shifts.id"), nullable=True)
    shift_identifier = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    notes = Column(Text, default="")
    event_data = Column(JSON, nullable=False, default=dict)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
