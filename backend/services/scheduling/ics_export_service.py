"""
ICS Calendar Export Service
Generates ICS (iCalendar) files for Google Calendar and Apple Calendar export.
"""

from datetime import datetime, date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from models.scheduling_module import ScheduledShift, ShiftAssignment, SchedulePeriod
from models.user import User


class ICSCalendarExportService:
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def _format_datetime_ics(self, dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    def _escape_ics_text(self, text: str) -> str:
        if not text:
            return ""
        text = text.replace("\\", "\\\\")
        text = text.replace(",", "\\,")
        text = text.replace(";", "\\;")
        text = text.replace("\n", "\\n")
        return text

    def _generate_uid(self, shift_id: int, user_id: int) -> str:
        return f"shift-{shift_id}-user-{user_id}@fusionems.app"

    def export_user_schedule_ics(
        self,
        user_id: int,
        start_date: date,
        end_date: date,
        calendar_name: str = "FusionEMS Schedule",
    ) -> str:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        assignments = self.db.query(ShiftAssignment).join(
            ScheduledShift, ShiftAssignment.shift_id == ScheduledShift.id
        ).filter(
            and_(
                ShiftAssignment.user_id == user_id,
                ShiftAssignment.org_id == self.org_id,
                ShiftAssignment.status.notin_(["declined", "swapped"]),
                ScheduledShift.shift_date.between(start_date, end_date)
            )
        ).all()

        ics_lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//FusionEMS//Scheduling Module//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:{self._escape_ics_text(calendar_name)}",
            "X-WR-TIMEZONE:UTC",
        ]

        for assignment in assignments:
            shift = self.db.query(ScheduledShift).filter(
                ScheduledShift.id == assignment.shift_id
            ).first()
            
            if not shift:
                continue

            event_lines = self._create_event(
                shift=shift,
                assignment=assignment,
                user=user,
            )
            ics_lines.extend(event_lines)

        ics_lines.append("END:VCALENDAR")

        return "\r\n".join(ics_lines)

    def _create_event(
        self,
        shift: ScheduledShift,
        assignment: ShiftAssignment,
        user: User,
    ) -> List[str]:
        uid = self._generate_uid(shift.id, user.id)
        dtstamp = self._format_datetime_ics(datetime.utcnow())
        dtstart = self._format_datetime_ics(shift.start_datetime)
        dtend = self._format_datetime_ics(shift.end_datetime)

        summary = f"Shift: {shift.station_name or 'Assigned Shift'}"
        if assignment.role:
            summary = f"{assignment.role} - {shift.station_name or 'Shift'}"

        location = shift.station_name or ""

        description_parts = []
        if shift.unit_name:
            description_parts.append(f"Unit: {shift.unit_name}")
        if assignment.role:
            description_parts.append(f"Role: {assignment.role}")
        if assignment.position:
            description_parts.append(f"Position: {assignment.position}")
        if shift.notes:
            description_parts.append(f"Notes: {shift.notes}")
        description_parts.append(f"Status: {assignment.status}")
        description_parts.append(f"Shift ID: {shift.id}")
        
        description = "\\n".join(description_parts)

        status_map = {
            "pending": "TENTATIVE",
            "confirmed": "CONFIRMED",
            "completed": "CONFIRMED",
        }
        ics_status = status_map.get(assignment.status, "CONFIRMED")

        categories = ["Work", "EMS", "Shift"]
        if shift.is_overtime:
            categories.append("Overtime")
        if shift.is_critical:
            categories.append("Critical")

        event_lines = [
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{self._escape_ics_text(summary)}",
        ]

        if location:
            event_lines.append(f"LOCATION:{self._escape_ics_text(location)}")

        if description:
            event_lines.append(f"DESCRIPTION:{description}")

        event_lines.extend([
            f"STATUS:{ics_status}",
            f"CATEGORIES:{','.join(categories)}",
            "TRANSP:OPAQUE",
        ])

        if assignment.status == "pending":
            event_lines.extend([
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                "DESCRIPTION:Shift requires acknowledgment",
                "TRIGGER:-PT1H",
                "END:VALARM",
            ])

        event_lines.extend([
            "BEGIN:VALARM",
            "ACTION:DISPLAY", 
            "DESCRIPTION:Shift starting soon",
            "TRIGGER:-PT30M",
            "END:VALARM",
            "END:VEVENT",
        ])

        return event_lines

    def export_period_ics(
        self,
        period_id: int,
        calendar_name: Optional[str] = None,
    ) -> str:
        period = self.db.query(SchedulePeriod).filter(
            and_(
                SchedulePeriod.id == period_id,
                SchedulePeriod.org_id == self.org_id
            )
        ).first()

        if not period:
            raise ValueError(f"Schedule period {period_id} not found")

        if not calendar_name:
            calendar_name = f"FusionEMS Schedule: {period.name or 'Schedule Period'}"

        shifts = self.db.query(ScheduledShift).filter(
            and_(
                ScheduledShift.org_id == self.org_id,
                ScheduledShift.schedule_period_id == period_id
            )
        ).order_by(ScheduledShift.start_datetime).all()

        ics_lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//FusionEMS//Scheduling Module//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:{self._escape_ics_text(calendar_name)}",
            "X-WR-TIMEZONE:UTC",
        ]

        for shift in shifts:
            uid = f"shift-{shift.id}-org-{self.org_id}@fusionems.app"
            dtstamp = self._format_datetime_ics(datetime.utcnow())
            dtstart = self._format_datetime_ics(shift.start_datetime)
            dtend = self._format_datetime_ics(shift.end_datetime)

            summary = f"Shift: {shift.station_name or 'Scheduled Shift'}"
            
            assignments = self.db.query(ShiftAssignment).filter(
                and_(
                    ShiftAssignment.shift_id == shift.id,
                    ShiftAssignment.status.notin_(["declined", "swapped"])
                )
            ).all()

            crew_names = []
            for a in assignments:
                u = self.db.query(User).filter(User.id == a.user_id).first()
                if u:
                    name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email
                    crew_names.append(name)

            description_parts = []
            if shift.unit_name:
                description_parts.append(f"Unit: {shift.unit_name}")
            description_parts.append(f"Required Staff: {shift.required_staff}")
            description_parts.append(f"Assigned: {shift.assigned_count}")
            if crew_names:
                description_parts.append(f"Crew: {', '.join(crew_names)}")
            if shift.notes:
                description_parts.append(f"Notes: {shift.notes}")

            description = "\\n".join(description_parts)

            event_lines = [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{dtstamp}",
                f"DTSTART:{dtstart}",
                f"DTEND:{dtend}",
                f"SUMMARY:{self._escape_ics_text(summary)}",
            ]

            if shift.station_name:
                event_lines.append(f"LOCATION:{self._escape_ics_text(shift.station_name)}")

            if description:
                event_lines.append(f"DESCRIPTION:{description}")

            event_lines.extend([
                f"STATUS:{'CONFIRMED' if shift.status == 'published' else 'TENTATIVE'}",
                "CATEGORIES:Work,EMS,Shift",
                "TRANSP:OPAQUE",
                "END:VEVENT",
            ])

            ics_lines.extend(event_lines)

        ics_lines.append("END:VCALENDAR")

        return "\r\n".join(ics_lines)

    def generate_google_calendar_url(
        self,
        shift: ScheduledShift,
        user: User,
    ) -> str:
        base_url = "https://calendar.google.com/calendar/render"
        
        title = f"Shift: {shift.station_name or 'Assigned Shift'}"
        location = shift.station_name or ""
        
        details_parts = []
        if shift.unit_name:
            details_parts.append(f"Unit: {shift.unit_name}")
        if shift.notes:
            details_parts.append(f"Notes: {shift.notes}")
        details = "\n".join(details_parts)

        start = shift.start_datetime.strftime("%Y%m%dT%H%M%SZ")
        end = shift.end_datetime.strftime("%Y%m%dT%H%M%SZ")

        from urllib.parse import urlencode
        params = {
            "action": "TEMPLATE",
            "text": title,
            "dates": f"{start}/{end}",
            "details": details,
            "location": location,
            "sf": "true",
        }

        return f"{base_url}?{urlencode(params)}"


def get_ics_export_service(db: Session, org_id: int) -> ICSCalendarExportService:
    return ICSCalendarExportService(db, org_id)
