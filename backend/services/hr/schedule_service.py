"""
Schedule Management Service
Handles shift assignments, scheduling, and time-off management
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from collections import defaultdict

from models.hr_personnel import (
    Personnel,
    EmploymentStatus,
    TimeEntry,
    LeaveRequest,
    LeaveBalance
)
from utils.tenancy import scoped_query


class ScheduleService:
    """Service for managing employee schedules and shift assignments"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    # =========================================================================
    # TIME TRACKING
    # =========================================================================

    async def get_time_entries(
        self,
        personnel_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        approved: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[TimeEntry]:
        """Get time entries with filters"""
        query = scoped_query(self.db, TimeEntry, self.org_id)

        if personnel_id:
            query = query.filter(TimeEntry.personnel_id == personnel_id)
        if start_date:
            query = query.filter(TimeEntry.shift_date >= start_date)
        if end_date:
            query = query.filter(TimeEntry.shift_date <= end_date)
        if approved is not None:
            query = query.filter(TimeEntry.approved == approved)

        return query.order_by(TimeEntry.shift_date.desc()).offset(skip).limit(limit).all()

    async def get_time_entry_by_id(self, entry_id: int) -> Optional[TimeEntry]:
        """Get a single time entry"""
        return scoped_query(self.db, TimeEntry, self.org_id).filter(
            TimeEntry.id == entry_id
        ).first()

    async def clock_in(
        self,
        personnel_id: int,
        shift_date: date,
        clock_in_time: datetime,
        shift_type: str = "Regular"
    ) -> TimeEntry:
        """Clock in a personnel member"""
        # Check if already clocked in
        existing = scoped_query(self.db, TimeEntry, self.org_id).filter(
            and_(
                TimeEntry.personnel_id == personnel_id,
                TimeEntry.shift_date == shift_date,
                TimeEntry.clock_out.is_(None)
            )
        ).first()

        if existing:
            raise ValueError("Personnel is already clocked in for this shift")

        entry = TimeEntry(
            org_id=self.org_id,
            personnel_id=personnel_id,
            shift_date=shift_date,
            clock_in=clock_in_time,
            shift_type=shift_type,
            approved=False
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    async def clock_out(
        self,
        personnel_id: int,
        clock_out_time: datetime
    ) -> Optional[TimeEntry]:
        """Clock out a personnel member"""
        entry = scoped_query(self.db, TimeEntry, self.org_id).filter(
            and_(
                TimeEntry.personnel_id == personnel_id,
                TimeEntry.clock_out.is_(None)
            )
        ).order_by(TimeEntry.clock_in.desc()).first()

        if not entry:
            raise ValueError("No active clock-in found")

        entry.clock_out = clock_out_time

        # Calculate hours
        duration = clock_out_time - entry.clock_in
        total_hours = duration.total_seconds() / 3600

        # Apply overtime rules (first 8 regular, next 4 OT, rest double)
        if total_hours <= 8:
            entry.hours_regular = total_hours
            entry.hours_overtime = 0.0
            entry.hours_double_time = 0.0
        elif total_hours <= 12:
            entry.hours_regular = 8.0
            entry.hours_overtime = total_hours - 8
            entry.hours_double_time = 0.0
        else:
            entry.hours_regular = 8.0
            entry.hours_overtime = 4.0
            entry.hours_double_time = total_hours - 12

        entry.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(entry)
        return entry

    async def approve_time_entry(
        self,
        entry_id: int,
        approved_by: str
    ) -> Optional[TimeEntry]:
        """Approve a time entry"""
        entry = await self.get_time_entry_by_id(entry_id)
        if not entry:
            return None

        if not entry.clock_out:
            raise ValueError("Cannot approve time entry without clock out")

        entry.approved = True
        entry.approved_by = approved_by
        entry.approved_at = datetime.utcnow()
        entry.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(entry)
        return entry

    async def bulk_approve_time_entries(
        self,
        entry_ids: List[int],
        approved_by: str
    ) -> List[TimeEntry]:
        """Approve multiple time entries at once"""
        approved = []
        for entry_id in entry_ids:
            try:
                entry = await self.approve_time_entry(entry_id, approved_by)
                if entry:
                    approved.append(entry)
            except ValueError:
                continue
        return approved

    async def update_time_entry(
        self,
        entry_id: int,
        data: Dict[str, Any]
    ) -> Optional[TimeEntry]:
        """Update a time entry (for corrections)"""
        entry = await self.get_time_entry_by_id(entry_id)
        if not entry:
            return None

        # Don't allow updating approved entries without unapproving first
        if entry.approved and "approved" not in data:
            raise ValueError("Cannot modify approved time entry")

        for key, value in data.items():
            if hasattr(entry, key):
                setattr(entry, key, value)

        entry.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(entry)
        return entry

    async def get_unapproved_time_entries(self) -> List[TimeEntry]:
        """Get all unapproved time entries that have clock out"""
        return scoped_query(self.db, TimeEntry, self.org_id).filter(
            and_(
                TimeEntry.approved == False,
                TimeEntry.clock_out.isnot(None)
            )
        ).order_by(TimeEntry.shift_date.desc()).all()

    # =========================================================================
    # LEAVE MANAGEMENT
    # =========================================================================

    async def get_leave_requests(
        self,
        personnel_id: Optional[int] = None,
        status: Optional[str] = None,
        leave_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[LeaveRequest]:
        """Get leave requests with filters"""
        query = scoped_query(self.db, LeaveRequest, self.org_id)

        if personnel_id:
            query = query.filter(LeaveRequest.personnel_id == personnel_id)
        if status:
            query = query.filter(LeaveRequest.status == status)
        if leave_type:
            query = query.filter(LeaveRequest.leave_type.ilike(f"%{leave_type}%"))
        if start_date:
            query = query.filter(LeaveRequest.start_date >= start_date)
        if end_date:
            query = query.filter(LeaveRequest.end_date <= end_date)

        return query.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()

    async def create_leave_request(self, data: Dict[str, Any]) -> LeaveRequest:
        """Create a new leave request"""
        # Validate dates
        start = data.get("start_date")
        end = data.get("end_date")
        
        if start and end and start > end:
            raise ValueError("Start date cannot be after end date")

        # Check for overlapping requests
        existing = scoped_query(self.db, LeaveRequest, self.org_id).filter(
            and_(
                LeaveRequest.personnel_id == data.get("personnel_id"),
                LeaveRequest.status.in_(["pending", "approved"]),
                or_(
                    and_(
                        LeaveRequest.start_date <= start,
                        LeaveRequest.end_date >= start
                    ),
                    and_(
                        LeaveRequest.start_date <= end,
                        LeaveRequest.end_date >= end
                    )
                )
            )
        ).first()

        if existing:
            raise ValueError("Leave request overlaps with existing request")

        # Check leave balance if applicable
        if data.get("leave_type") in ["PTO", "Sick"]:
            balance = await self.get_leave_balance(
                data.get("personnel_id"),
                start.year if start else date.today().year
            )
            if balance:
                if data.get("leave_type") == "PTO" and balance.pto_balance < data.get("total_days"):
                    raise ValueError("Insufficient PTO balance")
                elif data.get("leave_type") == "Sick" and balance.sick_balance < data.get("total_days"):
                    raise ValueError("Insufficient sick leave balance")

        request = LeaveRequest(
            org_id=self.org_id,
            status="pending",
            **data
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    async def approve_leave_request(
        self,
        request_id: int,
        approved_by: str
    ) -> Optional[LeaveRequest]:
        """Approve a leave request"""
        request = scoped_query(self.db, LeaveRequest, self.org_id).filter(
            LeaveRequest.id == request_id
        ).first()

        if not request:
            return None

        if request.status != "pending":
            raise ValueError("Can only approve pending requests")

        request.status = "approved"
        request.approved_by = approved_by
        request.approval_date = datetime.utcnow()
        request.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(request)

        # Update leave balance
        await self._update_leave_balance(request)

        return request

    async def deny_leave_request(
        self,
        request_id: int,
        denied_by: str,
        reason: str
    ) -> Optional[LeaveRequest]:
        """Deny a leave request"""
        request = scoped_query(self.db, LeaveRequest, self.org_id).filter(
            LeaveRequest.id == request_id
        ).first()

        if not request:
            return None

        if request.status != "pending":
            raise ValueError("Can only deny pending requests")

        request.status = "denied"
        request.approved_by = denied_by
        request.denial_reason = reason
        request.approval_date = datetime.utcnow()
        request.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(request)
        return request

    async def cancel_leave_request(
        self,
        request_id: int
    ) -> Optional[LeaveRequest]:
        """Cancel a leave request"""
        request = scoped_query(self.db, LeaveRequest, self.org_id).filter(
            LeaveRequest.id == request_id
        ).first()

        if not request:
            return None

        # If approved, restore leave balance
        if request.status == "approved":
            await self._restore_leave_balance(request)

        request.status = "cancelled"
        request.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(request)
        return request

    async def _update_leave_balance(self, request: LeaveRequest):
        """Update leave balance after approval"""
        year = request.start_date.year
        balance = await self.get_leave_balance(request.personnel_id, year)

        if not balance:
            balance = LeaveBalance(
                org_id=self.org_id,
                personnel_id=request.personnel_id,
                year=year
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

    async def _restore_leave_balance(self, request: LeaveRequest):
        """Restore leave balance after cancellation"""
        year = request.start_date.year
        balance = await self.get_leave_balance(request.personnel_id, year)

        if not balance:
            return

        if request.leave_type.lower() == "pto":
            balance.pto_used -= request.total_days
            balance.pto_balance = balance.pto_accrued - balance.pto_used
        elif request.leave_type.lower() == "sick":
            balance.sick_used -= request.total_days
            balance.sick_balance = balance.sick_accrued - balance.sick_used

        balance.updated_at = datetime.utcnow()
        self.db.commit()

    async def get_leave_balance(
        self,
        personnel_id: int,
        year: Optional[int] = None
    ) -> Optional[LeaveBalance]:
        """Get leave balance for personnel"""
        if not year:
            year = date.today().year

        return scoped_query(self.db, LeaveBalance, self.org_id).filter(
            and_(
                LeaveBalance.personnel_id == personnel_id,
                LeaveBalance.year == year
            )
        ).first()

    async def get_pending_leave_requests(self) -> List[Dict[str, Any]]:
        """Get all pending leave requests"""
        requests = await self.get_leave_requests(status="pending")
        
        result = []
        for req in requests:
            personnel = scoped_query(self.db, Personnel, self.org_id).filter(
                Personnel.id == req.personnel_id
            ).first()

            result.append({
                "request_id": req.id,
                "personnel_id": req.personnel_id,
                "personnel_name": f"{personnel.first_name} {personnel.last_name}" if personnel else "Unknown",
                "leave_type": req.leave_type,
                "start_date": req.start_date.isoformat(),
                "end_date": req.end_date.isoformat(),
                "total_days": req.total_days,
                "reason": req.reason,
                "days_pending": (date.today() - req.created_at.date()).days
            })

        return result

    # =========================================================================
    # SCHEDULE ANALYTICS
    # =========================================================================

    async def get_schedule_coverage(
        self,
        start_date: date,
        end_date: date,
        department: Optional[str] = None,
        station: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze schedule coverage for a date range
        Shows who is working, on leave, or unscheduled
        """
        # Get all time entries in range
        time_entries = await self.get_time_entries(
            start_date=start_date,
            end_date=end_date
        )

        # Get all approved leave in range
        leave_requests = await self.get_leave_requests(
            status="approved",
            start_date=start_date,
            end_date=end_date
        )

        # Get all active personnel
        query = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        )
        
        if department:
            query = query.filter(Personnel.department == department)
        if station:
            query = query.filter(Personnel.station_assignment == station)
        
        all_personnel = query.all()

        # Build coverage map by date
        coverage_by_date = {}
        current = start_date
        while current <= end_date:
            day_entries = [e for e in time_entries if e.shift_date == current]
            day_leave = [
                l for l in leave_requests
                if l.start_date <= current <= l.end_date
            ]

            scheduled_ids = {e.personnel_id for e in day_entries}
            on_leave_ids = {l.personnel_id for l in day_leave}
            unscheduled_ids = {
                p.id for p in all_personnel
                if p.id not in scheduled_ids and p.id not in on_leave_ids
            }

            coverage_by_date[current.isoformat()] = {
                "scheduled": len(scheduled_ids),
                "on_leave": len(on_leave_ids),
                "unscheduled": len(unscheduled_ids),
                "total_staff": len(all_personnel)
            }

            current += timedelta(days=1)

        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "filters": {
                "department": department,
                "station": station
            },
            "daily_coverage": coverage_by_date
        }

    async def get_personnel_hours_summary(
        self,
        personnel_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get hours summary for a personnel member"""
        entries = await self.get_time_entries(
            personnel_id=personnel_id,
            start_date=start_date,
            end_date=end_date
        )

        total_regular = sum(e.hours_regular for e in entries)
        total_overtime = sum(e.hours_overtime for e in entries)
        total_double = sum(e.hours_double_time for e in entries)
        total_hours = total_regular + total_overtime + total_double

        return {
            "personnel_id": personnel_id,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_shifts": len(entries),
            "hours": {
                "regular": total_regular,
                "overtime": total_overtime,
                "double_time": total_double,
                "total": total_hours
            },
            "average_hours_per_shift": total_hours / len(entries) if entries else 0
        }

    async def get_overtime_report(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Generate overtime report for date range"""
        entries = await self.get_time_entries(
            start_date=start_date,
            end_date=end_date
        )

        by_personnel = defaultdict(lambda: {
            "regular": 0.0,
            "overtime": 0.0,
            "double_time": 0.0
        })

        for entry in entries:
            by_personnel[entry.personnel_id]["regular"] += entry.hours_regular
            by_personnel[entry.personnel_id]["overtime"] += entry.hours_overtime
            by_personnel[entry.personnel_id]["double_time"] += entry.hours_double_time

        # Format with personnel details
        result = []
        for personnel_id, hours in by_personnel.items():
            personnel = scoped_query(self.db, Personnel, self.org_id).filter(
                Personnel.id == personnel_id
            ).first()

            if personnel:
                result.append({
                    "personnel_id": personnel_id,
                    "employee_id": personnel.employee_id,
                    "name": f"{personnel.first_name} {personnel.last_name}",
                    "department": personnel.department,
                    "hours": hours,
                    "total_ot_hours": hours["overtime"] + hours["double_time"]
                })

        # Sort by total OT hours descending
        result.sort(key=lambda x: x["total_ot_hours"], reverse=True)

        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_overtime_hours": sum(r["total_ot_hours"] for r in result),
            "by_personnel": result
        }
