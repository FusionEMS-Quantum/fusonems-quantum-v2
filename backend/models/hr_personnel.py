from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date
from enum import Enum
from core.database import Base


class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    RETIRED = "retired"


class CertificationStatus(str, Enum):
    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    REVOKED = "revoked"


class PayrollStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    DISPUTED = "disputed"


# ============================================================================
# PERSONNEL MANAGEMENT
# ============================================================================

class Personnel(Base):
    __tablename__ = "personnel"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, nullable=False, index=True)
    
    # Basic Info
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String)
    date_of_birth = Column(Date)
    
    # Employment
    hire_date = Column(Date, nullable=False)
    employment_status = Column(SQLEnum(EmploymentStatus), default=EmploymentStatus.ACTIVE)
    job_title = Column(String, nullable=False)
    department = Column(String)
    station_assignment = Column(String)
    shift_assignment = Column(String)
    supervisor_id = Column(Integer, ForeignKey("personnel.id"))
    
    # Payroll
    hourly_rate = Column(Float)
    salary_annual = Column(Float)
    pay_type = Column(String)  # hourly, salary, per_diem
    bank_account_last_four = Column(String)
    
    # Metadata
    hire_anniversary = Column(Date)
    termination_date = Column(Date, nullable=True)
    termination_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Certification(Base):
    __tablename__ = "certifications"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    certification_type = Column(String, nullable=False)  # EMT, Paramedic, RN, ACLS, PALS, etc.
    certification_number = Column(String)
    issuing_authority = Column(String, nullable=False)
    
    issue_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=False)
    
    status = Column(SQLEnum(CertificationStatus), default=CertificationStatus.ACTIVE)
    
    # Document tracking
    document_path = Column(String)
    verification_date = Column(Date)
    verified_by = Column(String)
    
    # Reminders
    reminder_90_days_sent = Column(Boolean, default=False)
    reminder_60_days_sent = Column(Boolean, default=False)
    reminder_30_days_sent = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    document_type = Column(String, nullable=False)  # I9, W4, License, Background Check, etc.
    document_name = Column(String, nullable=False)
    document_path = Column(String, nullable=False)
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String)
    
    expiration_date = Column(Date, nullable=True)
    confidential = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    review_date = Column(Date, nullable=False)
    review_period_start = Column(Date)
    review_period_end = Column(Date)
    
    reviewer_id = Column(Integer, ForeignKey("personnel.id"))
    
    overall_rating = Column(Float)
    technical_skills_rating = Column(Float)
    communication_rating = Column(Float)
    teamwork_rating = Column(Float)
    professionalism_rating = Column(Float)
    
    strengths = Column(Text)
    areas_for_improvement = Column(Text)
    goals = Column(Text)
    
    employee_signature_date = Column(Date)
    supervisor_signature_date = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class DisciplinaryAction(Base):
    __tablename__ = "disciplinary_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    incident_date = Column(Date, nullable=False)
    action_date = Column(Date, nullable=False)
    
    action_type = Column(String, nullable=False)  # Verbal Warning, Written Warning, Suspension, Termination
    severity = Column(String)  # Low, Medium, High, Critical
    
    description = Column(Text, nullable=False)
    corrective_action = Column(Text)
    
    issued_by = Column(String, nullable=False)
    acknowledged_by_employee = Column(Boolean, default=False)
    acknowledgment_date = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================================
# PAYROLL
# ============================================================================

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    shift_date = Column(Date, nullable=False)
    clock_in = Column(DateTime, nullable=False)
    clock_out = Column(DateTime)
    
    hours_regular = Column(Float, default=0.0)
    hours_overtime = Column(Float, default=0.0)
    hours_double_time = Column(Float, default=0.0)
    
    shift_type = Column(String)  # Regular, Overtime, Callback, Standby
    pay_code = Column(String)
    
    approved = Column(Boolean, default=False)
    approved_by = Column(String)
    approved_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PayrollPeriod(Base):
    __tablename__ = "payroll_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    pay_date = Column(Date, nullable=False)
    
    status = Column(SQLEnum(PayrollStatus), default=PayrollStatus.PENDING)
    
    total_gross_pay = Column(Float, default=0.0)
    total_net_pay = Column(Float, default=0.0)
    total_hours = Column(Float, default=0.0)
    
    processed_at = Column(DateTime)
    processed_by = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class Paycheck(Base):
    __tablename__ = "paychecks"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    payroll_period_id = Column(Integer, ForeignKey("payroll_periods.id"), nullable=False)
    
    hours_regular = Column(Float, default=0.0)
    hours_overtime = Column(Float, default=0.0)
    hours_double_time = Column(Float, default=0.0)
    
    gross_pay = Column(Float, nullable=False)
    
    # Deductions
    federal_tax = Column(Float, default=0.0)
    state_tax = Column(Float, default=0.0)
    social_security = Column(Float, default=0.0)
    medicare = Column(Float, default=0.0)
    retirement_401k = Column(Float, default=0.0)
    health_insurance = Column(Float, default=0.0)
    dental_insurance = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    
    net_pay = Column(Float, nullable=False)
    
    pay_method = Column(String)  # Direct Deposit, Check
    
    status = Column(SQLEnum(PayrollStatus), default=PayrollStatus.PENDING)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    leave_type = Column(String, nullable=False)  # PTO, Sick, FMLA, Bereavement, Unpaid
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Float, nullable=False)
    
    reason = Column(Text)
    
    status = Column(String, default="pending")  # pending, approved, denied, cancelled
    
    approved_by = Column(String)
    approval_date = Column(DateTime)
    denial_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    year = Column(Integer, nullable=False)
    
    pto_accrued = Column(Float, default=0.0)
    pto_used = Column(Float, default=0.0)
    pto_balance = Column(Float, default=0.0)
    
    sick_accrued = Column(Float, default=0.0)
    sick_used = Column(Float, default=0.0)
    sick_balance = Column(Float, default=0.0)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShiftDifferential(Base):
    __tablename__ = "shift_differentials"
    
    id = Column(Integer, primary_key=True, index=True)
    
    differential_name = Column(String, nullable=False)
    differential_type = Column(String, nullable=False)  # Night, Weekend, Holiday, Hazard
    
    rate_type = Column(String, nullable=False)  # Percentage, Flat Rate
    rate_amount = Column(Float, nullable=False)
    
    start_time = Column(String)
    end_time = Column(String)
    
    days_of_week = Column(JSON)  # ["Monday", "Tuesday", ...]
    
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
