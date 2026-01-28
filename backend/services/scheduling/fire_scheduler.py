"""
Fire Department Scheduling - Kelly Schedules, Shift Trading, Overtime Tracking
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, date
from typing import Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ShiftPattern(Enum):
    KELLY_24_48 = "24_48"  # 24 on, 48 off
    KELLY_48_96 = "48_96"  # 48 on, 96 off
    SHIFT_24_72 = "24_72"  # 24 on, 72 off (California style)
    SHIFT_10_14 = "10_14"  # 10-hour days, 14-hour nights
    SHIFT_12_12 = "12_12"  # 12-hour shifts
    STANDARD_40 = "40_hr"  # Standard 40-hour week


class ShiftType(Enum):
    A_SHIFT = "A"
    B_SHIFT = "B"
    C_SHIFT = "C"
    D_SHIFT = "D"
    DAY = "DAY"
    NIGHT = "NIGHT"


@dataclass
class ShiftAssignment:
    id: int
    employee_id: int
    employee_name: str
    shift_type: ShiftType
    station: str
    position: str
    start_date: date
    end_date: Optional[date]


@dataclass
class ShiftTrade:
    id: int
    requesting_employee_id: int
    covering_employee_id: int
    original_shift_date: date
    trade_shift_date: Optional[date]  # None if coverage only
    status: str  # pending, approved, denied, completed
    requested_at: datetime
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    reason: str
    is_payback_required: bool


@dataclass
class OvertimeRecord:
    id: int
    employee_id: int
    date: date
    hours: float
    overtime_type: str  # mandatory, voluntary, callback
    reason: str
    rate_multiplier: float  # 1.5 for time-and-half, 2.0 for double
    approved_by: Optional[int]
    station: str


KELLY_CYCLE_DAYS = {
    ShiftPattern.KELLY_24_48: 9,  # 3-day cycle (A-off-off-B-off-off-C-off-off)
    ShiftPattern.KELLY_48_96: 12,  # 4-day cycle
    ShiftPattern.SHIFT_24_72: 12,  # 4-day cycle
}


class FireScheduler:
    def __init__(self, org_id: int, shift_pattern: ShiftPattern = ShiftPattern.KELLY_24_48):
        self.org_id = org_id
        self.shift_pattern = shift_pattern
        self.assignments: list[ShiftAssignment] = []
        self.trades: list[ShiftTrade] = []
        self.overtime_records: list[OvertimeRecord] = []
        self.cycle_start_date: date = date(2024, 1, 1)  # Reference date for Kelly cycle

    def get_shift_for_date(self, target_date: date) -> ShiftType:
        """Determine which shift is working on a given date"""
        if self.shift_pattern == ShiftPattern.KELLY_24_48:
            days_since_start = (target_date - self.cycle_start_date).days
            cycle_day = days_since_start % 9
            
            if cycle_day in [0, 3, 6]:
                return ShiftType.A_SHIFT
            elif cycle_day in [1, 4, 7]:
                return ShiftType.B_SHIFT
            else:
                return ShiftType.C_SHIFT
                
        elif self.shift_pattern == ShiftPattern.KELLY_48_96:
            days_since_start = (target_date - self.cycle_start_date).days
            cycle_day = days_since_start % 12
            
            if cycle_day in [0, 1]:
                return ShiftType.A_SHIFT
            elif cycle_day in [3, 4]:
                return ShiftType.B_SHIFT
            elif cycle_day in [6, 7]:
                return ShiftType.C_SHIFT
            elif cycle_day in [9, 10]:
                return ShiftType.D_SHIFT
            else:
                return ShiftType.A_SHIFT  # Off days default to next shift
                
        elif self.shift_pattern == ShiftPattern.SHIFT_24_72:
            days_since_start = (target_date - self.cycle_start_date).days
            cycle_day = days_since_start % 4
            
            shifts = [ShiftType.A_SHIFT, ShiftType.B_SHIFT, ShiftType.C_SHIFT, ShiftType.D_SHIFT]
            return shifts[cycle_day]
        
        return ShiftType.A_SHIFT

    def generate_schedule(self, start_date: date, days: int = 30) -> list[dict]:
        """Generate schedule for specified period"""
        schedule = []
        
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            working_shift = self.get_shift_for_date(current_date)
            
            personnel = [
                a for a in self.assignments
                if a.shift_type == working_shift
                and a.start_date <= current_date
                and (a.end_date is None or a.end_date >= current_date)
            ]
            
            approved_trades = [
                t for t in self.trades
                if t.status == "approved"
                and t.original_shift_date == current_date
            ]
            
            for trade in approved_trades:
                personnel = [p for p in personnel if p.employee_id != trade.requesting_employee_id]
                covering = next((a for a in self.assignments if a.employee_id == trade.covering_employee_id), None)
                if covering:
                    personnel.append(covering)
            
            by_station = {}
            for p in personnel:
                if p.station not in by_station:
                    by_station[p.station] = []
                by_station[p.station].append({
                    "employee_id": p.employee_id,
                    "name": p.employee_name,
                    "position": p.position,
                })
            
            schedule.append({
                "date": current_date.isoformat(),
                "day_of_week": current_date.strftime("%A"),
                "shift_on_duty": working_shift.value,
                "stations": by_station,
                "total_personnel": len(personnel),
            })
        
        return schedule

    def request_trade(
        self,
        requesting_employee_id: int,
        covering_employee_id: int,
        original_shift_date: date,
        trade_shift_date: Optional[date],
        reason: str,
    ) -> ShiftTrade:
        """Create a shift trade request"""
        requesting = next((a for a in self.assignments if a.employee_id == requesting_employee_id), None)
        covering = next((a for a in self.assignments if a.employee_id == covering_employee_id), None)
        
        if not requesting:
            raise ValueError(f"Employee {requesting_employee_id} not found in assignments")
        if not covering:
            raise ValueError(f"Employee {covering_employee_id} not found in assignments")
        
        expected_shift = self.get_shift_for_date(original_shift_date)
        if requesting.shift_type != expected_shift:
            raise ValueError(f"Employee not scheduled to work on {original_shift_date}")
        
        trade = ShiftTrade(
            id=len(self.trades) + 1,
            requesting_employee_id=requesting_employee_id,
            covering_employee_id=covering_employee_id,
            original_shift_date=original_shift_date,
            trade_shift_date=trade_shift_date,
            status="pending",
            requested_at=datetime.now(),
            approved_by=None,
            approved_at=None,
            reason=reason,
            is_payback_required=trade_shift_date is not None,
        )
        
        self.trades.append(trade)
        return trade

    def approve_trade(self, trade_id: int, approver_id: int) -> ShiftTrade:
        """Approve a shift trade request"""
        trade = next((t for t in self.trades if t.id == trade_id), None)
        if not trade:
            raise ValueError(f"Trade {trade_id} not found")
        
        if trade.status != "pending":
            raise ValueError(f"Trade is already {trade.status}")
        
        trade.status = "approved"
        trade.approved_by = approver_id
        trade.approved_at = datetime.now()
        
        return trade

    def deny_trade(self, trade_id: int, approver_id: int, reason: str = "") -> ShiftTrade:
        """Deny a shift trade request"""
        trade = next((t for t in self.trades if t.id == trade_id), None)
        if not trade:
            raise ValueError(f"Trade {trade_id} not found")
        
        trade.status = "denied"
        trade.approved_by = approver_id
        trade.approved_at = datetime.now()
        
        return trade

    def record_overtime(
        self,
        employee_id: int,
        overtime_date: date,
        hours: float,
        overtime_type: str,
        reason: str,
        station: str,
        rate_multiplier: float = 1.5,
        approved_by: Optional[int] = None,
    ) -> OvertimeRecord:
        """Record overtime hours"""
        record = OvertimeRecord(
            id=len(self.overtime_records) + 1,
            employee_id=employee_id,
            date=overtime_date,
            hours=hours,
            overtime_type=overtime_type,
            reason=reason,
            rate_multiplier=rate_multiplier,
            approved_by=approved_by,
            station=station,
        )
        
        self.overtime_records.append(record)
        return record

    def get_overtime_report(self, start_date: date, end_date: date) -> dict:
        """Generate overtime report for period"""
        records = [
            r for r in self.overtime_records
            if start_date <= r.date <= end_date
        ]
        
        by_employee = {}
        for r in records:
            if r.employee_id not in by_employee:
                by_employee[r.employee_id] = {
                    "employee_id": r.employee_id,
                    "total_hours": 0,
                    "mandatory_hours": 0,
                    "voluntary_hours": 0,
                    "callback_hours": 0,
                    "records": [],
                }
            
            by_employee[r.employee_id]["total_hours"] += r.hours
            if r.overtime_type == "mandatory":
                by_employee[r.employee_id]["mandatory_hours"] += r.hours
            elif r.overtime_type == "voluntary":
                by_employee[r.employee_id]["voluntary_hours"] += r.hours
            elif r.overtime_type == "callback":
                by_employee[r.employee_id]["callback_hours"] += r.hours
            
            by_employee[r.employee_id]["records"].append({
                "date": r.date.isoformat(),
                "hours": r.hours,
                "type": r.overtime_type,
                "reason": r.reason,
                "station": r.station,
            })
        
        total_hours = sum(e["total_hours"] for e in by_employee.values())
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "summary": {
                "total_overtime_hours": total_hours,
                "employees_with_overtime": len(by_employee),
                "avg_hours_per_employee": round(total_hours / len(by_employee), 1) if by_employee else 0,
            },
            "by_type": {
                "mandatory": sum(e["mandatory_hours"] for e in by_employee.values()),
                "voluntary": sum(e["voluntary_hours"] for e in by_employee.values()),
                "callback": sum(e["callback_hours"] for e in by_employee.values()),
            },
            "by_employee": list(by_employee.values()),
        }

    def check_minimum_staffing(self, target_date: date, station: str, minimum: int) -> dict:
        """Check if minimum staffing is met for a station/date"""
        working_shift = self.get_shift_for_date(target_date)
        
        personnel = [
            a for a in self.assignments
            if a.shift_type == working_shift
            and a.station == station
            and a.start_date <= target_date
            and (a.end_date is None or a.end_date >= target_date)
        ]
        
        approved_trades = [
            t for t in self.trades
            if t.status == "approved" and t.original_shift_date == target_date
        ]
        
        for trade in approved_trades:
            personnel = [p for p in personnel if p.employee_id != trade.requesting_employee_id]
            covering = next((a for a in self.assignments if a.employee_id == trade.covering_employee_id and a.station == station), None)
            if covering:
                personnel.append(covering)
        
        staffed = len(personnel)
        shortage = max(0, minimum - staffed)
        
        return {
            "date": target_date.isoformat(),
            "station": station,
            "shift": working_shift.value,
            "minimum_required": minimum,
            "currently_staffed": staffed,
            "shortage": shortage,
            "is_staffed": staffed >= minimum,
            "personnel": [{"id": p.employee_id, "name": p.employee_name, "position": p.position} for p in personnel],
        }

    def get_employee_schedule(self, employee_id: int, start_date: date, days: int = 30) -> list[dict]:
        """Get schedule for a specific employee"""
        assignment = next((a for a in self.assignments if a.employee_id == employee_id), None)
        if not assignment:
            return []
        
        schedule = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            working_shift = self.get_shift_for_date(current_date)
            
            is_working = assignment.shift_type == working_shift
            
            trade_out = next((t for t in self.trades if t.requesting_employee_id == employee_id and t.original_shift_date == current_date and t.status == "approved"), None)
            trade_in = next((t for t in self.trades if t.covering_employee_id == employee_id and t.original_shift_date == current_date and t.status == "approved"), None)
            
            if trade_out:
                is_working = False
            if trade_in:
                is_working = True
            
            overtime = next((o for o in self.overtime_records if o.employee_id == employee_id and o.date == current_date), None)
            
            schedule.append({
                "date": current_date.isoformat(),
                "day_of_week": current_date.strftime("%A"),
                "is_scheduled": is_working,
                "shift": assignment.shift_type.value if is_working else None,
                "station": assignment.station if is_working else None,
                "has_trade_out": trade_out is not None,
                "has_trade_in": trade_in is not None,
                "overtime_hours": overtime.hours if overtime else 0,
            })
        
        return schedule
