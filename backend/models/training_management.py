from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Date, Enum as SQLEnum, func
from sqlalchemy.orm import relationship
from datetime import datetime, date
from enum import Enum
from core.database import Base


class CourseStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrainingStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


# ============================================================================
# TRAINING MANAGEMENT
# ============================================================================

class TrainingCourse(Base):
    __tablename__ = "training_courses"
    
    id = Column(Integer, primary_key=True, index=True)
    
    course_code = Column(String, unique=True, nullable=False, index=True)
    course_name = Column(String, nullable=False)
    course_description = Column(Text)
    
    course_category = Column(String, nullable=False)  # Clinical, Operations, Leadership, Compliance, Safety
    
    # Requirements
    duration_hours = Column(Float, nullable=False)
    max_students = Column(Integer)
    prerequisites = Column(JSON)  # ["EMT-B", "ACLS"]
    
    # CEU/CME
    ceu_credits = Column(Float, default=0.0)
    cme_credits = Column(Float, default=0.0)
    
    # Certification
    grants_certification = Column(Boolean, default=False)
    certification_name = Column(String)
    certification_valid_months = Column(Integer)
    
    # Content
    course_materials_path = Column(String)
    online_available = Column(Boolean, default=False)
    hands_on_required = Column(Boolean, default=False)
    
    # Compliance
    mandatory = Column(Boolean, default=False)
    recurrence_months = Column(Integer)  # Auto-schedule every X months
    
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class CredentialRecord(Base):
    __tablename__ = "credential_records"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    credential_type = Column(String, nullable=False)
    issuer = Column(String, default="")
    license_number = Column(String, default="")
    status = Column(String, default="active")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SkillCheckoff(Base):
    __tablename__ = "skill_checkoffs"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_name = Column(String, nullable=False)
    evaluator = Column(String, default="")
    status = Column(String, default="pending")
    score = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CERecord(Base):
    __tablename__ = "ce_records"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, default="state")
    hours = Column(Integer, default=0)
    status = Column(String, default="pending")
    cycle = Column(String, default="2024")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


