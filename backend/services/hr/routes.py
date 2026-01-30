from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module, require_user
from models.hr_personnel import (
    EmploymentStatus,
    CertificationStatus,
    PayrollStatus,
)
from models.user import User
from utils.tenancy import scoped_query

from .personnel_service import PersonnelService, TimeService, LeaveService, PayrollService


router = APIRouter(
    prefix="/api/hr",
    tags=["HR"],
    dependencies=[Depends(require_module("HR"))],
)


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class PersonnelBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    hire_date: date
    job_title: str
    department: Optional[str] = None
    station_assignment: Optional[str] = None
    shift_assignment: Optional[str] = None
    hourly_rate: Optional[float] = None
    salary_annual: Optional[float] = None
    pay_type: Optional[str] = "hourly"


class PersonnelCreate(PersonnelBase):
    employee_id: str
    employment_status: EmploymentStatus = EmploymentStatus.ACTIVE


class PersonnelUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    station_assignment: Optional[str] = None
    shift_assignment: Optional[str] = None
    hourly_rate: Optional[float] = None
    salary_annual: Optional[float] = None
    pay_type: Optional[str] = None


class PersonnelResponse(PersonnelBase):
    id: int
    employee_id: str
    employment_status: EmploymentStatus
    hire_anniversary: Optional[date] = None
    termination_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmploymentStatusUpdate(BaseModel):
    status: EmploymentStatus
    termination_date: Optional[date] = None
    termination_reason: Optional[str] = None


class CertificationResponse(BaseModel):
    id: int
    personnel_id: int
    certification_type: str
    certification_number: Optional[str] = None
    issuing_authority: str
    issue_date: date
    expiration_date: date
    status: CertificationStatus
    days_until_expiry: Optional[int] = None

    class Config:
        from_attributes = True


class TimeClockIn(BaseModel):
    personnel_id: int
    shift_type: str = "Regular"


class TimeClockOut(BaseModel):
    personnel_id: int


class TimeEntryResponse(BaseModel):
    id: int
    personnel_id: int
    shift_date: date
    clock_in: datetime
    clock_out: Optional[datetime] = None
    hours_regular: float
    hours_overtime: float
    hours_double_time: float
    shift_type: Optional[str] = None
    approved: bool
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeaveRequestCreate(BaseModel):
    personnel_id: int
    leave_type: str
    start_date: date
    end_date: date
    total_days: float
    reason: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: int
    personnel_id: int
    leave_type: str
    start_date: date
    end_date: date
    total_days: float
    reason: Optional[str] = None
    status: str
    approved_by: Optional[str] = None
    approval_date: Optional[datetime] = None
    denial_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaveApproval(BaseModel):
    approved: bool
    denial_reason: Optional[str] = None


class LeaveBalanceResponse(BaseModel):
    id: int
    personnel_id: int
    year: int
    pto_accrued: float
    pto_used: float
    pto_balance: float
    sick_accrued: float
    sick_used: float
    sick_balance: float

    class Config:
        from_attributes = True


class PayrollPeriodCreate(BaseModel):
    period_start: date
    period_end: date
    pay_date: date


class PayrollPeriodResponse(BaseModel):
    id: int
    period_start: date
    period_end: date
    pay_date: date
    status: PayrollStatus
    total_gross_pay: float
    total_net_pay: float
    total_hours: float
    processed_at: Optional[datetime] = None
    processed_by: Optional[str] = None

    class Config:
        from_attributes = True


class PayrollProcess(BaseModel):
    period_id: int


class PaycheckResponse(BaseModel):
    id: int
    personnel_id: int
    payroll_period_id: int
    hours_regular: float
    hours_overtime: float
    hours_double_time: float
    gross_pay: float
    federal_tax: float
    state_tax: float
    social_security: float
    medicare: float
    net_pay: float
    status: PayrollStatus

    class Config:
        from_attributes = True


# ============================================================================
# PERSONNEL ENDPOINTS
# ============================================================================

@router.get("/personnel", response_model=List[PersonnelResponse])
def list_personnel(
    employment_status: Optional[EmploymentStatus] = None,
    department: Optional[str] = None,
    station: Optional[str] = None,
    job_title: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """List all personnel with optional filters"""
    service = PersonnelService(db, user.org_id)
    personnel = service.list_personnel(
        employment_status=employment_status,
        department=department,
        station=station,
        job_title=job_title,
        skip=skip,
        limit=limit,
    )
    return personnel


@router.get("/personnel/{personnel_id}", response_model=PersonnelResponse)
def get_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get personnel details by ID"""
    service = PersonnelService(db, user.org_id)
    personnel = service.get_personnel(personnel_id)
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    return personnel


@router.post("/personnel", response_model=PersonnelResponse, status_code=status.HTTP_201_CREATED)
def create_personnel(
    payload: PersonnelCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Create new employee"""
    service = PersonnelService(db, user.org_id)
    
    # Check if employee_id already exists
    existing = service.get_personnel_by_employee_id(payload.employee_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    personnel = service.create_personnel(payload.dict())
    return personnel


@router.put("/personnel/{personnel_id}", response_model=PersonnelResponse)
def update_personnel(
    personnel_id: int,
    payload: PersonnelUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Update employee information"""
    service = PersonnelService(db, user.org_id)
    
    # Filter out None values
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    
    personnel = service.update_personnel(personnel_id, update_data)
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    return personnel


@router.put("/personnel/{personnel_id}/status", response_model=PersonnelResponse)
def update_employment_status(
    personnel_id: int,
    payload: EmploymentStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Update employment status"""
    service = PersonnelService(db, user.org_id)
    personnel = service.update_employment_status(
        personnel_id,
        payload.status,
        payload.termination_date,
        payload.termination_reason,
    )
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    return personnel


@router.get("/personnel/search/{search_term}", response_model=List[PersonnelResponse])
def search_personnel(
    search_term: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Search personnel by name, email, or employee ID"""
    service = PersonnelService(db, user.org_id)
    personnel = service.search_personnel(search_term)
    return personnel


# ============================================================================
# CERTIFICATION ENDPOINTS
# ============================================================================

@router.get("/certifications/expiring", response_model=Dict[str, List[CertificationResponse]])
def get_certifications_expiring(
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get certifications expiring soon (30/60/90 days)"""
    service = PersonnelService(db, user.org_id)
    expiring = service.check_certification_expirations()
    
    # Add days_until_expiry for each certification
    today = date.today()
    response = {}
    for key, certs in expiring.items():
        response[key] = []
        for cert in certs:
            cert_dict = {
                "id": cert.id,
                "personnel_id": cert.personnel_id,
                "certification_type": cert.certification_type,
                "certification_number": cert.certification_number,
                "issuing_authority": cert.issuing_authority,
                "issue_date": cert.issue_date,
                "expiration_date": cert.expiration_date,
                "status": cert.status,
                "days_until_expiry": (cert.expiration_date - today).days,
            }
            response[key].append(cert_dict)
    
    return response


@router.get("/personnel/{personnel_id}/certifications", response_model=List[CertificationResponse])
def get_personnel_certifications(
    personnel_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get all certifications for a personnel"""
    service = PersonnelService(db, user.org_id)
    certifications = service.get_certifications(personnel_id)
    
    today = date.today()
    response = []
    for cert in certifications:
        cert_dict = {
            "id": cert.id,
            "personnel_id": cert.personnel_id,
            "certification_type": cert.certification_type,
            "certification_number": cert.certification_number,
            "issuing_authority": cert.issuing_authority,
            "issue_date": cert.issue_date,
            "expiration_date": cert.expiration_date,
            "status": cert.status,
            "days_until_expiry": (cert.expiration_date - today).days if cert.expiration_date >= today else None,
        }
        response.append(cert_dict)
    
    return response


# ============================================================================
# TIME TRACKING ENDPOINTS
# ============================================================================

@router.get("/time-entries", response_model=List[TimeEntryResponse])
def get_time_entries(
    personnel_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get time clock entries with filters"""
    service = TimeService(db, user.org_id)
    entries = service.get_time_entries(
        personnel_id=personnel_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    return entries


@router.post("/time-entries/clock-in", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
def clock_in(
    payload: TimeClockIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Clock in"""
    service = TimeService(db, user.org_id)
    try:
        entry = service.clock_in(
            personnel_id=payload.personnel_id,
            shift_date=date.today(),
            clock_in_time=datetime.utcnow(),
            shift_type=payload.shift_type,
        )
        return entry
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/time-entries/clock-out", response_model=TimeEntryResponse)
def clock_out(
    payload: TimeClockOut,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Clock out"""
    service = TimeService(db, user.org_id)
    try:
        entry = service.clock_out(
            personnel_id=payload.personnel_id,
            clock_out_time=datetime.utcnow(),
        )
        return entry
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/time-entries/{entry_id}/approve", response_model=TimeEntryResponse)
def approve_time_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Approve time entry"""
    service = TimeService(db, user.org_id)
    entry = service.approve_time_entry(entry_id, user.email)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )
    return entry


# ============================================================================
# LEAVE MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/leave-requests", response_model=List[LeaveRequestResponse])
def get_leave_requests(
    personnel_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get leave requests with filters"""
    service = LeaveService(db, user.org_id)
    requests = service.get_leave_requests(
        personnel_id=personnel_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return requests


@router.post("/leave-requests", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Submit leave request"""
    service = LeaveService(db, user.org_id)
    request = service.create_leave_request(payload.dict())
    return request


@router.put("/leave-requests/{request_id}/approve", response_model=LeaveRequestResponse)
def approve_leave(
    request_id: int,
    payload: LeaveApproval,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Approve or deny leave request"""
    service = LeaveService(db, user.org_id)
    
    if payload.approved:
        request = service.approve_leave_request(request_id, user.email)
    else:
        if not payload.denial_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Denial reason is required"
            )
        request = service.deny_leave_request(request_id, user.email, payload.denial_reason)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    return request


@router.get("/personnel/{personnel_id}/leave-balance", response_model=LeaveBalanceResponse)
def get_leave_balance(
    personnel_id: int,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get leave balance for personnel"""
    service = LeaveService(db, user.org_id)
    balance = service.get_leave_balance(personnel_id, year)
    if not balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave balance not found"
        )
    return balance


# ============================================================================
# PAYROLL ENDPOINTS
# ============================================================================

@router.get("/payroll/periods", response_model=List[PayrollPeriodResponse])
def get_payroll_periods(
    status: Optional[PayrollStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get payroll periods"""
    service = PayrollService(db, user.org_id)
    periods = service.get_payroll_periods(status=status, skip=skip, limit=limit)
    return periods


@router.post("/payroll/periods", response_model=PayrollPeriodResponse, status_code=status.HTTP_201_CREATED)
def create_payroll_period(
    payload: PayrollPeriodCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Create new payroll period"""
    service = PayrollService(db, user.org_id)
    period = service.create_payroll_period(
        payload.period_start,
        payload.period_end,
        payload.pay_date,
    )
    return period


@router.post("/payroll/process", response_model=PayrollPeriodResponse)
def process_payroll(
    payload: PayrollProcess,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Process payroll for a period"""
    service = PayrollService(db, user.org_id)
    period = service.process_payroll(payload.period_id, user.email)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll period not found"
        )
    return period


@router.get("/payroll/paychecks", response_model=List[PaycheckResponse])
def get_paychecks(
    period_id: Optional[int] = None,
    personnel_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get paychecks with filters"""
    service = PayrollService(db, user.org_id)
    paychecks = service.get_paychecks(
        period_id=period_id,
        personnel_id=personnel_id,
        skip=skip,
        limit=limit,
    )
    return paychecks


# ============================================================================
# STATISTICS AND REPORTS
# ============================================================================

@router.get("/statistics/summary")
def get_hr_statistics(
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Get HR statistics summary"""
    service = PersonnelService(db, user.org_id)
    
    return {
        "total_active_personnel": service.get_active_personnel_count(),
        "personnel_by_department": service.get_personnel_by_department(),
        "certifications_expiring_30_days": len(service.get_expiring_certifications(30)),
        "certifications_expiring_60_days": len(service.get_expiring_certifications(60)),
        "certifications_expiring_90_days": len(service.get_expiring_certifications(90)),
    }
