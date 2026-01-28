"""
Enhanced Payroll Service
Comprehensive payroll processing, calculations, and reporting
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from collections import defaultdict

from models.hr_personnel import (
    PayrollPeriod,
    Paycheck,
    PayrollStatus,
    TimeEntry,
    Personnel,
    EmploymentStatus,
    ShiftDifferential
)
from utils.tenancy import scoped_query


class PayrollService:
    """Enhanced service for comprehensive payroll operations"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    # =========================================================================
    # PAYROLL PERIODS
    # =========================================================================

    async def get_payroll_periods(
        self,
        status: Optional[PayrollStatus] = None,
        year: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PayrollPeriod]:
        """Get payroll periods with filters"""
        query = scoped_query(self.db, PayrollPeriod, self.org_id)

        if status:
            query = query.filter(PayrollPeriod.status == status)
        if year:
            query = query.filter(func.extract('year', PayrollPeriod.period_start) == year)

        return query.order_by(PayrollPeriod.period_end.desc()).offset(skip).limit(limit).all()

    async def get_payroll_period_by_id(self, period_id: int) -> Optional[PayrollPeriod]:
        """Get a single payroll period"""
        return scoped_query(self.db, PayrollPeriod, self.org_id).filter(
            PayrollPeriod.id == period_id
        ).first()

    async def create_payroll_period(
        self,
        period_start: date,
        period_end: date,
        pay_date: date
    ) -> PayrollPeriod:
        """Create a new payroll period"""
        # Check for overlapping periods
        existing = scoped_query(self.db, PayrollPeriod, self.org_id).filter(
            or_(
                and_(
                    PayrollPeriod.period_start <= period_start,
                    PayrollPeriod.period_end >= period_start
                ),
                and_(
                    PayrollPeriod.period_start <= period_end,
                    PayrollPeriod.period_end >= period_end
                )
            )
        ).first()

        if existing:
            raise ValueError("Payroll period overlaps with existing period")

        period = PayrollPeriod(
            org_id=self.org_id,
            period_start=period_start,
            period_end=period_end,
            pay_date=pay_date,
            status=PayrollStatus.PENDING
        )
        self.db.add(period)
        self.db.commit()
        self.db.refresh(period)
        return period

    async def generate_bi_weekly_periods(self, year: int) -> List[PayrollPeriod]:
        """
        Generate all bi-weekly payroll periods for a year
        Starts from first Monday of the year
        """
        # Find first Monday of year
        start_date = date(year, 1, 1)
        while start_date.weekday() != 0:  # 0 = Monday
            start_date += timedelta(days=1)

        periods = []
        current_start = start_date

        while current_start.year == year:
            period_end = current_start + timedelta(days=13)  # 2 weeks - 1 day
            pay_date = period_end + timedelta(days=7)  # Pay one week after period ends

            period = await self.create_payroll_period(current_start, period_end, pay_date)
            periods.append(period)

            current_start = period_end + timedelta(days=1)

        return periods

    # =========================================================================
    # PAYROLL PROCESSING
    # =========================================================================

    async def process_payroll(
        self,
        period_id: int,
        processed_by: str
    ) -> Optional[PayrollPeriod]:
        """
        Process payroll for a period
        Generates paychecks for all personnel with approved time entries
        """
        period = await self.get_payroll_period_by_id(period_id)
        if not period:
            return None

        if period.status != PayrollStatus.PENDING:
            raise ValueError("Payroll period is not in pending status")

        # Get all approved time entries for the period
        time_entries = scoped_query(self.db, TimeEntry, self.org_id).filter(
            and_(
                TimeEntry.shift_date >= period.period_start,
                TimeEntry.shift_date <= period.period_end,
                TimeEntry.approved == True
            )
        ).all()

        # Group by personnel
        personnel_hours = defaultdict(lambda: {
            "regular": 0.0,
            "overtime": 0.0,
            "double_time": 0.0,
            "entries": []
        })

        for entry in time_entries:
            personnel_hours[entry.personnel_id]["regular"] += entry.hours_regular
            personnel_hours[entry.personnel_id]["overtime"] += entry.hours_overtime
            personnel_hours[entry.personnel_id]["double_time"] += entry.hours_double_time
            personnel_hours[entry.personnel_id]["entries"].append(entry)

        # Generate paychecks
        total_gross = 0.0
        total_net = 0.0
        total_hours = 0.0

        for personnel_id, hours_data in personnel_hours.items():
            paycheck = await self._generate_paycheck(
                period.id,
                personnel_id,
                hours_data
            )
            
            if paycheck:
                total_gross += paycheck.gross_pay
                total_net += paycheck.net_pay
                total_hours += (
                    paycheck.hours_regular +
                    paycheck.hours_overtime +
                    paycheck.hours_double_time
                )

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

    async def _generate_paycheck(
        self,
        period_id: int,
        personnel_id: int,
        hours_data: Dict[str, Any]
    ) -> Optional[Paycheck]:
        """Generate a single paycheck for a personnel member"""
        personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == personnel_id
        ).first()

        if not personnel:
            return None

        # Determine pay rate
        if personnel.pay_type == "hourly" and personnel.hourly_rate:
            base_rate = personnel.hourly_rate
        elif personnel.pay_type == "salary" and personnel.salary_annual:
            # Convert annual salary to hourly (assuming 2080 hours/year)
            base_rate = personnel.salary_annual / 2080
        else:
            return None  # No valid pay rate

        # Calculate gross pay with shift differentials
        gross_regular = await self._calculate_pay_with_differentials(
            personnel,
            hours_data["entries"],
            hours_data["regular"],
            base_rate
        )
        
        gross_overtime = hours_data["overtime"] * base_rate * 1.5
        gross_double_time = hours_data["double_time"] * base_rate * 2.0
        gross_pay = gross_regular + gross_overtime + gross_double_time

        # Calculate deductions
        deductions = self._calculate_deductions(personnel, gross_pay)

        net_pay = gross_pay - sum(deductions.values())

        # Create paycheck
        paycheck = Paycheck(
            org_id=self.org_id,
            personnel_id=personnel_id,
            payroll_period_id=period_id,
            hours_regular=hours_data["regular"],
            hours_overtime=hours_data["overtime"],
            hours_double_time=hours_data["double_time"],
            gross_pay=gross_pay,
            federal_tax=deductions["federal_tax"],
            state_tax=deductions["state_tax"],
            social_security=deductions["social_security"],
            medicare=deductions["medicare"],
            retirement_401k=deductions.get("retirement_401k", 0.0),
            health_insurance=deductions.get("health_insurance", 0.0),
            dental_insurance=deductions.get("dental_insurance", 0.0),
            other_deductions=deductions.get("other_deductions", 0.0),
            net_pay=net_pay,
            pay_method="Direct Deposit",
            status=PayrollStatus.APPROVED
        )

        self.db.add(paycheck)
        self.db.commit()
        self.db.refresh(paycheck)
        return paycheck

    async def _calculate_pay_with_differentials(
        self,
        personnel: Personnel,
        time_entries: List[TimeEntry],
        regular_hours: float,
        base_rate: float
    ) -> float:
        """
        Calculate pay including shift differentials
        Differentials are applied based on shift times and types
        """
        total_pay = regular_hours * base_rate

        # Get active shift differentials
        differentials = scoped_query(self.db, ShiftDifferential, self.org_id).filter(
            ShiftDifferential.active == True
        ).all()

        # Apply differentials to each time entry
        for entry in time_entries:
            for diff in differentials:
                if self._entry_qualifies_for_differential(entry, diff):
                    if diff.rate_type == "Percentage":
                        additional = entry.hours_regular * base_rate * (diff.rate_amount / 100)
                    else:  # Flat Rate
                        additional = entry.hours_regular * diff.rate_amount
                    total_pay += additional

        return total_pay

    def _entry_qualifies_for_differential(
        self,
        entry: TimeEntry,
        differential: ShiftDifferential
    ) -> bool:
        """Check if a time entry qualifies for a shift differential"""
        # Check shift type
        if differential.differential_type == "Night":
            # Check if shift is during night hours
            clock_in_hour = entry.clock_in.hour
            if differential.start_time and differential.end_time:
                # Simple hour check (could be more sophisticated)
                start_hour = int(differential.start_time.split(':')[0])
                end_hour = int(differential.end_time.split(':')[0])
                if not (start_hour <= clock_in_hour <= end_hour):
                    return False

        elif differential.differential_type == "Weekend":
            # Check if shift is on weekend
            if entry.shift_date.weekday() < 5:  # 0-4 = Mon-Fri
                return False

        elif differential.differential_type == "Holiday":
            # Would need holiday calendar integration
            pass

        # Check days of week if specified
        if differential.days_of_week:
            day_name = entry.shift_date.strftime("%A")
            if day_name not in differential.days_of_week:
                return False

        return True

    def _calculate_deductions(
        self,
        personnel: Personnel,
        gross_pay: float
    ) -> Dict[str, float]:
        """
        Calculate all payroll deductions
        Note: These are simplified calculations - real-world would use tax tables
        """
        deductions = {}

        # Federal tax (simplified progressive)
        if gross_pay <= 1000:
            deductions["federal_tax"] = gross_pay * 0.10
        elif gross_pay <= 2000:
            deductions["federal_tax"] = 100 + (gross_pay - 1000) * 0.12
        else:
            deductions["federal_tax"] = 220 + (gross_pay - 2000) * 0.22

        # State tax (simplified flat rate - varies by state)
        deductions["state_tax"] = gross_pay * 0.05

        # Social Security (6.2% up to wage base limit)
        deductions["social_security"] = min(gross_pay * 0.062, 160200 * 0.062 / 26)

        # Medicare (1.45%)
        deductions["medicare"] = gross_pay * 0.0145

        # Additional deductions would be personnel-specific
        # These would come from employee benefit elections
        deductions["retirement_401k"] = 0.0
        deductions["health_insurance"] = 0.0
        deductions["dental_insurance"] = 0.0
        deductions["other_deductions"] = 0.0

        return deductions

    # =========================================================================
    # PAYCHECK OPERATIONS
    # =========================================================================

    async def get_paychecks(
        self,
        period_id: Optional[int] = None,
        personnel_id: Optional[int] = None,
        status: Optional[PayrollStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Paycheck]:
        """Get paychecks with filters"""
        query = scoped_query(self.db, Paycheck, self.org_id)

        if period_id:
            query = query.filter(Paycheck.payroll_period_id == period_id)
        if personnel_id:
            query = query.filter(Paycheck.personnel_id == personnel_id)
        if status:
            query = query.filter(Paycheck.status == status)

        return query.order_by(Paycheck.created_at.desc()).offset(skip).limit(limit).all()

    async def get_paycheck_by_id(self, paycheck_id: int) -> Optional[Paycheck]:
        """Get a single paycheck"""
        return scoped_query(self.db, Paycheck, self.org_id).filter(
            Paycheck.id == paycheck_id
        ).first()

    async def get_personnel_pay_history(
        self,
        personnel_id: int,
        year: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get complete pay history for a personnel member"""
        personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == personnel_id
        ).first()

        if not personnel:
            return None

        query = scoped_query(self.db, Paycheck, self.org_id).filter(
            Paycheck.personnel_id == personnel_id
        )

        if year:
            query = query.join(PayrollPeriod).filter(
                func.extract('year', PayrollPeriod.period_start) == year
            )

        paychecks = query.order_by(Paycheck.created_at.desc()).all()

        total_gross = sum(p.gross_pay for p in paychecks)
        total_net = sum(p.net_pay for p in paychecks)
        total_hours = sum(
            p.hours_regular + p.hours_overtime + p.hours_double_time
            for p in paychecks
        )

        return {
            "personnel": {
                "id": personnel.id,
                "employee_id": personnel.employee_id,
                "name": f"{personnel.first_name} {personnel.last_name}",
                "job_title": personnel.job_title,
                "pay_type": personnel.pay_type,
                "hourly_rate": personnel.hourly_rate,
                "salary_annual": personnel.salary_annual
            },
            "year": year or date.today().year,
            "total_paychecks": len(paychecks),
            "total_gross_pay": total_gross,
            "total_net_pay": total_net,
            "total_hours": total_hours,
            "average_paycheck": total_net / len(paychecks) if paychecks else 0,
            "paychecks": [
                {
                    "id": p.id,
                    "period_id": p.payroll_period_id,
                    "pay_date": self._get_pay_date(p.payroll_period_id),
                    "hours_regular": p.hours_regular,
                    "hours_overtime": p.hours_overtime,
                    "hours_double_time": p.hours_double_time,
                    "gross_pay": p.gross_pay,
                    "net_pay": p.net_pay,
                    "total_deductions": p.gross_pay - p.net_pay,
                    "status": p.status.value
                }
                for p in paychecks
            ]
        }

    def _get_pay_date(self, period_id: int) -> Optional[str]:
        """Get pay date for a period"""
        period = scoped_query(self.db, PayrollPeriod, self.org_id).filter(
            PayrollPeriod.id == period_id
        ).first()
        return period.pay_date.isoformat() if period else None

    # =========================================================================
    # ANALYTICS & REPORTING
    # =========================================================================

    async def get_payroll_summary(
        self,
        period_id: Optional[int] = None,
        year: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get payroll summary statistics"""
        if period_id:
            period = await self.get_payroll_period_by_id(period_id)
            if not period:
                return None

            paychecks = await self.get_paychecks(period_id=period_id)

            return {
                "period_start": period.period_start.isoformat(),
                "period_end": period.period_end.isoformat(),
                "pay_date": period.pay_date.isoformat(),
                "status": period.status.value,
                "total_employees": len(paychecks),
                "total_hours": period.total_hours,
                "total_gross_pay": period.total_gross_pay,
                "total_net_pay": period.total_net_pay,
                "average_paycheck": period.total_net_pay / len(paychecks) if paychecks else 0
            }

        elif year:
            periods = await self.get_payroll_periods(year=year)
            all_paychecks = []
            for period in periods:
                all_paychecks.extend(await self.get_paychecks(period_id=period.id))

            total_gross = sum(p.gross_pay for p in all_paychecks)
            total_net = sum(p.net_pay for p in all_paychecks)

            return {
                "year": year,
                "total_periods": len(periods),
                "total_paychecks": len(all_paychecks),
                "total_gross_pay": total_gross,
                "total_net_pay": total_net,
                "total_deductions": total_gross - total_net
            }

        return None

    async def get_labor_cost_analysis(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Analyze labor costs over a date range
        Breaks down by department, position, and cost type
        """
        paychecks = scoped_query(self.db, Paycheck, self.org_id).join(
            PayrollPeriod
        ).filter(
            and_(
                PayrollPeriod.period_start >= start_date,
                PayrollPeriod.period_end <= end_date
            )
        ).all()

        by_department = defaultdict(lambda: {"gross": 0.0, "count": 0})
        by_position = defaultdict(lambda: {"gross": 0.0, "count": 0})

        for paycheck in paychecks:
            personnel = scoped_query(self.db, Personnel, self.org_id).filter(
                Personnel.id == paycheck.personnel_id
            ).first()

            if personnel:
                dept = personnel.department or "Unassigned"
                by_department[dept]["gross"] += paycheck.gross_pay
                by_department[dept]["count"] += 1

                by_position[personnel.job_title]["gross"] += paycheck.gross_pay
                by_position[personnel.job_title]["count"] += 1

        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_labor_cost": sum(p.gross_pay for p in paychecks),
            "by_department": dict(by_department),
            "by_position": dict(by_position)
        }
