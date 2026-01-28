from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models.hr_personnel import (
    Personnel,
    EmploymentStatus,
    Certification,
    CertificationStatus,
    TimeEntry,
    LeaveRequest,
    LeaveBalance,
    PayrollPeriod,
    Paycheck,
    PayrollStatus,
    EmployeeDocument,
    PerformanceReview,
    DisciplinaryAction,
)
from utils.tenancy import scoped_query


class PersonnelService:
    """Service for managing personnel operations"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def list_personnel(
        self,
        employment_status: Optional[EmploymentStatus] = None,
        department: Optional[str] = None,
        station: Optional[str] = None,
        job_title: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Personnel]:
        """List all personnel with optional filters"""
        query = scoped_query(self.db, Personnel, self.org_id)

        if employment_status:
            query = query.filter(Personnel.employment_status == employment_status)
        if department:
            query = query.filter(Personnel.department == department)
        if station:
            query = query.filter(Personnel.station_assignment == station)
        if job_title:
            query = query.filter(Personnel.job_title.ilike(f"%{job_title}%"))

        return query.offset(skip).limit(limit).all()

    def get_personnel(self, personnel_id: int) -> Optional[Personnel]:
        """Get a single personnel record by ID"""
        return scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == personnel_id
        ).first()

    def get_personnel_by_employee_id(self, employee_id: str) -> Optional[Personnel]:
        """Get personnel by employee ID"""
        return scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employee_id == employee_id
        ).first()

    def create_personnel(self, data: Dict[str, Any]) -> Personnel:
        """Create a new personnel record"""
        personnel = Personnel(
            org_id=self.org_id,
            **data
        )
        self.db.add(personnel)
        self.db.commit()
        self.db.refresh(personnel)
        return personnel

    def update_personnel(self, personnel_id: int, data: Dict[str, Any]) -> Optional[Personnel]:
        """Update personnel record"""
        personnel = self.get_personnel(personnel_id)
        if not personnel:
            return None

        for key, value in data.items():
            if hasattr(personnel, key):
                setattr(personnel, key, value)

        personnel.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(personnel)
        return personnel

    def update_employment_status(
        self,
        personnel_id: int,
        status: EmploymentStatus,
        termination_date: Optional[date] = None,
        termination_reason: Optional[str] = None,
    ) -> Optional[Personnel]:
        """Update employment status"""
        personnel = self.get_personnel(personnel_id)
        if not personnel:
            return None

        personnel.employment_status = status
        if status == EmploymentStatus.TERMINATED:
            personnel.termination_date = termination_date or date.today()
            personnel.termination_reason = termination_reason

        personnel.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(personnel)
        return personnel

    def get_certifications(self, personnel_id: int) -> List[Certification]:
        """Get all certifications for a personnel"""
        return scoped_query(self.db, Certification, self.org_id).filter(
            Certification.personnel_id == personnel_id
        ).all()

    def get_expiring_certifications(
        self, days: int = 30
    ) -> List[Certification]:
        """Get certifications expiring within specified days"""
        expiry_date = date.today() + timedelta(days=days)
        return scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date <= expiry_date,
                Certification.expiration_date >= date.today(),
                Certification.status == CertificationStatus.ACTIVE,
            )
        ).all()

    def check_certification_expirations(self) -> Dict[str, List[Certification]]:
        """Check and categorize expiring certifications"""
        return {
            "30_days": self.get_expiring_certifications(30),
            "60_days": self.get_expiring_certifications(60),
            "90_days": self.get_expiring_certifications(90),
        }

    def update_certification_status(self):
        """Update certification statuses based on expiration dates"""
        today = date.today()
        
        # Mark expired certifications
        expired = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date < today,
                Certification.status != CertificationStatus.EXPIRED,
            )
        )
        expired.update({Certification.status: CertificationStatus.EXPIRED})

        # Mark expiring soon (within 30 days)
        expiring_soon = scoped_query(self.db, Certification, self.org_id).filter(
            and_(
                Certification.expiration_date >= today,
                Certification.expiration_date <= today + timedelta(days=30),
                Certification.status == CertificationStatus.ACTIVE,
            )
        )
        expiring_soon.update({Certification.status: CertificationStatus.EXPIRING_SOON})

        self.db.commit()

    def get_active_personnel_count(self) -> int:
        """Get count of active personnel"""
        return scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        ).count()

    def get_personnel_by_department(self) -> Dict[str, int]:
        """Get personnel count grouped by department"""
        results = (
            scoped_query(self.db, Personnel, self.org_id)
            .filter(Personnel.employment_status == EmploymentStatus.ACTIVE)
            .with_entities(Personnel.department, func.count(Personnel.id))
            .group_by(Personnel.department)
            .all()
        )
        return {dept: count for dept, count in results if dept}

    def search_personnel(self, search_term: str) -> List[Personnel]:
        """Search personnel by name, email, or employee ID"""
        return scoped_query(self.db, Personnel, self.org_id).filter(
            or_(
                Personnel.first_name.ilike(f"%{search_term}%"),
                Personnel.last_name.ilike(f"%{search_term}%"),
                Personnel.email.ilike(f"%{search_term}%"),
                Personnel.employee_id.ilike(f"%{search_term}%"),
            )
        ).all()


class TimeService:
    """Service for time tracking operations"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def get_time_entries(
        self,
        personnel_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TimeEntry]:
        """Get time entries with filters"""
        query = scoped_query(self.db, TimeEntry, self.org_id)

        if personnel_id:
            query = query.filter(TimeEntry.personnel_id == personnel_id)
        if start_date:
            query = query.filter(TimeEntry.shift_date >= start_date)
        if end_date:
            query = query.filter(TimeEntry.shift_date <= end_date)

        return query.order_by(TimeEntry.shift_date.desc()).offset(skip).limit(limit).all()

    def clock_in(
        self,
        personnel_id: int,
        shift_date: date,
        clock_in_time: datetime,
        shift_type: str = "Regular",
    ) -> TimeEntry:
        """Clock in a personnel member"""
        # Check if already clocked in today
        existing = scoped_query(self.db, TimeEntry, self.org_id).filter(
            and_(
                TimeEntry.personnel_id == personnel_id,
                TimeEntry.shift_date == shift_date,
                TimeEntry.clock_out.is_(None),
            )
        ).first()

        if existing:
            raise ValueError("Personnel is already clocked in")

        entry = TimeEntry(
            org_id=self.org_id,
            personnel_id=personnel_id,
            shift_date=shift_date,
            clock_in=clock_in_time,
            shift_type=shift_type,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def clock_out(
        self,
        personnel_id: int,
        clock_out_time: datetime,
    ) -> Optional[TimeEntry]:
        """Clock out a personnel member"""
        entry = scoped_query(self.db, TimeEntry, self.org_id).filter(
            and_(
                TimeEntry.personnel_id == personnel_id,
                TimeEntry.clock_out.is_(None),
            )
        ).order_by(TimeEntry.clock_in.desc()).first()

        if not entry:
            raise ValueError("No active clock-in found")

        entry.clock_out = clock_out_time

        # Calculate hours
        duration = clock_out_time - entry.clock_in
        total_hours = duration.total_seconds() / 3600

        # Simple logic: first 8 hours regular, next 4 overtime, rest double time
        if total_hours <= 8:
            entry.hours_regular = total_hours
        elif total_hours <= 12:
            entry.hours_regular = 8
            entry.hours_overtime = total_hours - 8
        else:
            entry.hours_regular = 8
            entry.hours_overtime = 4
            entry.hours_double_time = total_hours - 12

        entry.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def approve_time_entry(
        self,
        entry_id: int,
        approved_by: str,
    ) -> Optional[TimeEntry]:
        """Approve a time entry"""
        entry = scoped_query(self.db, TimeEntry, self.org_id).filter(
            TimeEntry.id == entry_id
        ).first()

        if not entry:
            return None

        entry.approved = True
        entry.approved_by = approved_by
        entry.approved_at = datetime.utcnow()
        entry.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(entry)
        return entry


class LeaveService:
    """Service for leave management operations"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def get_leave_requests(
        self,
        personnel_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[LeaveRequest]:
        """Get leave requests with filters"""
        query = scoped_query(self.db, LeaveRequest, self.org_id)

        if personnel_id:
            query = query.filter(LeaveRequest.personnel_id == personnel_id)
        if status:
            query = query.filter(LeaveRequest.status == status)

        return query.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()

    def create_leave_request(self, data: Dict[str, Any]) -> LeaveRequest:
        """Create a new leave request"""
        request = LeaveRequest(
            org_id=self.org_id,
            **data
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def approve_leave_request(
        self,
        request_id: int,
        approved_by: str,
    ) -> Optional[LeaveRequest]:
        """Approve a leave request"""
        request = scoped_query(self.db, LeaveRequest, self.org_id).filter(
            LeaveRequest.id == request_id
        ).first()

        if not request:
            return None

        request.status = "approved"
        request.approved_by = approved_by
        request.approval_date = datetime.utcnow()
        request.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(request)

        # Update leave balance
        self._update_leave_balance(request)

        return request

    def deny_leave_request(
        self,
        request_id: int,
        denied_by: str,
        reason: str,
    ) -> Optional[LeaveRequest]:
        """Deny a leave request"""
        request = scoped_query(self.db, LeaveRequest, self.org_id).filter(
            LeaveRequest.id == request_id
        ).first()

        if not request:
            return None

        request.status = "denied"
        request.approved_by = denied_by
        request.denial_reason = reason
        request.approval_date = datetime.utcnow()
        request.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(request)
        return request

    def _update_leave_balance(self, request: LeaveRequest):
        """Update leave balance after approval"""
        year = request.start_date.year
        balance = scoped_query(self.db, LeaveBalance, self.org_id).filter(
            and_(
                LeaveBalance.personnel_id == request.personnel_id,
                LeaveBalance.year == year,
            )
        ).first()

        if not balance:
            balance = LeaveBalance(
                org_id=self.org_id,
                personnel_id=request.personnel_id,
                year=year,
            )
            self.db.add(balance)

        if request.leave_type.lower() == "pto":
            balance.pto_used += request.total_days
            balance.pto_balance = balance.pto_accrued - balance.pto_used
        elif request.leave_type.lower() == "sick":
            balance.sick_used += request.total_days
            balance.sick_balance = balance.sick_accrued - balance.sick_used

        balance.updated_at = datetime.utcnow()
        self.db.commit()

    def get_leave_balance(self, personnel_id: int, year: Optional[int] = None) -> Optional[LeaveBalance]:
        """Get leave balance for personnel"""
        if not year:
            year = date.today().year

        return scoped_query(self.db, LeaveBalance, self.org_id).filter(
            and_(
                LeaveBalance.personnel_id == personnel_id,
                LeaveBalance.year == year,
            )
        ).first()


class PayrollService:
    """Service for payroll operations"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def get_payroll_periods(
        self,
        status: Optional[PayrollStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[PayrollPeriod]:
        """Get payroll periods"""
        query = scoped_query(self.db, PayrollPeriod, self.org_id)

        if status:
            query = query.filter(PayrollPeriod.status == status)

        return query.order_by(PayrollPeriod.period_end.desc()).offset(skip).limit(limit).all()

    def create_payroll_period(
        self,
        period_start: date,
        period_end: date,
        pay_date: date,
    ) -> PayrollPeriod:
        """Create a new payroll period"""
        period = PayrollPeriod(
            org_id=self.org_id,
            period_start=period_start,
            period_end=period_end,
            pay_date=pay_date,
            status=PayrollStatus.PENDING,
        )
        self.db.add(period)
        self.db.commit()
        self.db.refresh(period)
        return period

    def process_payroll(
        self,
        period_id: int,
        processed_by: str,
    ) -> Optional[PayrollPeriod]:
        """Process payroll for a period"""
        period = scoped_query(self.db, PayrollPeriod, self.org_id).filter(
            PayrollPeriod.id == period_id
        ).first()

        if not period:
            return None

        # Get all approved time entries for the period
        time_entries = scoped_query(self.db, TimeEntry, self.org_id).filter(
            and_(
                TimeEntry.shift_date >= period.period_start,
                TimeEntry.shift_date <= period.period_end,
                TimeEntry.approved == True,
            )
        ).all()

        # Group by personnel
        personnel_hours = {}
        for entry in time_entries:
            if entry.personnel_id not in personnel_hours:
                personnel_hours[entry.personnel_id] = {
                    "regular": 0.0,
                    "overtime": 0.0,
                    "double_time": 0.0,
                }
            personnel_hours[entry.personnel_id]["regular"] += entry.hours_regular
            personnel_hours[entry.personnel_id]["overtime"] += entry.hours_overtime
            personnel_hours[entry.personnel_id]["double_time"] += entry.hours_double_time

        # Generate paychecks
        total_gross = 0.0
        total_net = 0.0
        total_hours = 0.0

        for personnel_id, hours in personnel_hours.items():
            personnel = scoped_query(self.db, Personnel, self.org_id).filter(
                Personnel.id == personnel_id
            ).first()

            if not personnel or not personnel.hourly_rate:
                continue

            # Calculate gross pay
            gross_pay = (
                hours["regular"] * personnel.hourly_rate +
                hours["overtime"] * personnel.hourly_rate * 1.5 +
                hours["double_time"] * personnel.hourly_rate * 2.0
            )

            # Simple tax calculation (this should be more sophisticated in production)
            federal_tax = gross_pay * 0.12
            state_tax = gross_pay * 0.05
            social_security = gross_pay * 0.062
            medicare = gross_pay * 0.0145

            net_pay = gross_pay - federal_tax - state_tax - social_security - medicare

            paycheck = Paycheck(
                org_id=self.org_id,
                personnel_id=personnel_id,
                payroll_period_id=period.id,
                hours_regular=hours["regular"],
                hours_overtime=hours["overtime"],
                hours_double_time=hours["double_time"],
                gross_pay=gross_pay,
                federal_tax=federal_tax,
                state_tax=state_tax,
                social_security=social_security,
                medicare=medicare,
                net_pay=net_pay,
                status=PayrollStatus.APPROVED,
                pay_method="Direct Deposit",
            )
            self.db.add(paycheck)

            total_gross += gross_pay
            total_net += net_pay
            total_hours += hours["regular"] + hours["overtime"] + hours["double_time"]

        # Update period
        period.total_gross_pay = total_gross
        period.total_net_pay = total_net
        period.total_hours = total_hours
        period.status = PayrollStatus.APPROVED
        period.processed_at = datetime.utcnow()
        period.processed_by = processed_by

        self.db.commit()
        self.db.refresh(period)
        return period

    def get_paychecks(
        self,
        period_id: Optional[int] = None,
        personnel_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Paycheck]:
        """Get paychecks with filters"""
        query = scoped_query(self.db, Paycheck, self.org_id)

        if period_id:
            query = query.filter(Paycheck.payroll_period_id == period_id)
        if personnel_id:
            query = query.filter(Paycheck.personnel_id == personnel_id)

        return query.order_by(Paycheck.created_at.desc()).offset(skip).limit(limit).all()
