"""
Schedule PDF Export Service
Generates professional PDF exports of published schedules.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import io

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from models.scheduling_module import (
    SchedulePeriod, ScheduledShift, ShiftAssignment, SchedulePublication
)
from models.user import User


class SchedulePDFExportService:
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        self.title_style = ParagraphStyle(
            'ScheduleTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=6,
            alignment=TA_CENTER
        )
        
        self.subtitle_style = ParagraphStyle(
            'ScheduleSubtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#f97316'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        
        self.section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#27272a'),
            spaceBefore=15,
            spaceAfter=10,
        )
        
        self.body_style = ParagraphStyle(
            'ScheduleBody',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#3f3f46'),
            leading=12,
        )

    def export_schedule_period(
        self,
        period_id: int,
        include_assignments: bool = True,
        include_coverage_summary: bool = True,
    ) -> bytes:
        period = self.db.query(SchedulePeriod).filter(
            and_(
                SchedulePeriod.id == period_id,
                SchedulePeriod.org_id == self.org_id
            )
        ).first()
        
        if not period:
            raise ValueError(f"Schedule period {period_id} not found")
        
        shifts = self.db.query(ScheduledShift).filter(
            and_(
                ScheduledShift.org_id == self.org_id,
                ScheduledShift.schedule_period_id == period_id
            )
        ).order_by(ScheduledShift.shift_date, ScheduledShift.start_datetime).all()
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter, 
            topMargin=0.5*inch, 
            bottomMargin=0.5*inch,
            leftMargin=0.5*inch,
            rightMargin=0.5*inch,
        )
        
        elements = []
        
        elements.append(Paragraph("FusionEMS Schedule", self.title_style))
        elements.append(Paragraph(
            f"{period.name or 'Schedule Period'}: {period.start_date.strftime('%B %d')} - {period.end_date.strftime('%B %d, %Y')}",
            self.subtitle_style
        ))
        
        meta_text = f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | "
        meta_text += f"Version: {self._get_publication_version(period_id)} | "
        meta_text += f"Status: {period.status.upper()}"
        elements.append(Paragraph(meta_text, self.body_style))
        elements.append(Spacer(1, 20))
        
        if include_coverage_summary:
            elements.extend(self._build_coverage_summary(shifts, period))
            elements.append(Spacer(1, 15))
        
        elements.extend(self._build_daily_schedule(shifts, period, include_assignments))
        
        if include_assignments:
            elements.append(PageBreak())
            elements.extend(self._build_crew_assignments(shifts))
        
        doc.build(elements)
        return buffer.getvalue()

    def _get_publication_version(self, period_id: int) -> int:
        count = self.db.query(SchedulePublication).filter(
            SchedulePublication.period_id == period_id
        ).count()
        return count if count > 0 else 1

    def _build_coverage_summary(self, shifts: List[ScheduledShift], period: SchedulePeriod) -> List:
        elements = []
        elements.append(Paragraph("Coverage Summary", self.section_header_style))
        
        daily_stats = {}
        current_date = period.start_date
        while current_date <= period.end_date:
            day_shifts = [s for s in shifts if s.shift_date == current_date]
            total_required = sum(s.required_staff for s in day_shifts)
            total_assigned = sum(s.assigned_count for s in day_shifts)
            
            daily_stats[current_date] = {
                "shifts": len(day_shifts),
                "required": total_required,
                "assigned": total_assigned,
                "coverage": round((total_assigned / total_required * 100) if total_required > 0 else 100, 1)
            }
            current_date += timedelta(days=1)
        
        headers = ["Date", "Day", "Shifts", "Required", "Assigned", "Coverage"]
        rows = []
        for dt, stats in daily_stats.items():
            coverage_str = f"{stats['coverage']}%"
            rows.append([
                dt.strftime("%Y-%m-%d"),
                dt.strftime("%a"),
                str(stats["shifts"]),
                str(stats["required"]),
                str(stats["assigned"]),
                coverage_str,
            ])
        
        table_data = [headers] + rows
        col_widths = [1.2*inch, 0.6*inch, 0.7*inch, 0.9*inch, 0.9*inch, 0.9*inch]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27272a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d4d4d8')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')])
        ]))
        
        elements.append(table)
        return elements

    def _build_daily_schedule(
        self, 
        shifts: List[ScheduledShift], 
        period: SchedulePeriod,
        include_assignments: bool
    ) -> List:
        elements = []
        elements.append(Paragraph("Shift Schedule", self.section_header_style))
        
        shifts_by_date = {}
        for shift in shifts:
            if shift.shift_date not in shifts_by_date:
                shifts_by_date[shift.shift_date] = []
            shifts_by_date[shift.shift_date].append(shift)
        
        for shift_date in sorted(shifts_by_date.keys()):
            day_shifts = shifts_by_date[shift_date]
            
            date_header = ParagraphStyle(
                'DateHeader',
                parent=self.styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#f97316'),
                spaceBefore=12,
                spaceAfter=6,
            )
            elements.append(Paragraph(
                f"{shift_date.strftime('%A, %B %d, %Y')} ({len(day_shifts)} shifts)",
                date_header
            ))
            
            headers = ["Time", "Station", "Status", "Staff", "Notes"]
            if include_assignments:
                headers.append("Assigned Crew")
            
            rows = []
            for shift in day_shifts:
                start_time = shift.start_datetime.strftime("%H:%M")
                end_time = shift.end_datetime.strftime("%H:%M")
                
                row = [
                    f"{start_time} - {end_time}",
                    shift.station_name or "Unassigned",
                    shift.status.upper() if shift.status else "N/A",
                    f"{shift.assigned_count}/{shift.required_staff}",
                    (shift.notes or "")[:30] + ("..." if shift.notes and len(shift.notes) > 30 else ""),
                ]
                
                if include_assignments:
                    assignments = self.db.query(ShiftAssignment).filter(
                        and_(
                            ShiftAssignment.shift_id == shift.id,
                            ShiftAssignment.status.notin_(["declined", "swapped"])
                        )
                    ).all()
                    
                    crew_names = []
                    for a in assignments:
                        user = self.db.query(User).filter(User.id == a.user_id).first()
                        if user:
                            name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
                            crew_names.append(name)
                    
                    row.append(", ".join(crew_names) if crew_names else "None assigned")
                
                rows.append(row)
            
            table_data = [headers] + rows
            
            if include_assignments:
                col_widths = [1*inch, 1.2*inch, 0.8*inch, 0.6*inch, 1.2*inch, 2*inch]
            else:
                col_widths = [1*inch, 1.5*inch, 0.9*inch, 0.7*inch, 2.5*inch]
            
            table = Table(table_data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f3f46')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 0), (3, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('TOPPADDING', (0, 0), (-1, 0), 6),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e4e4e7')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')])
            ]))
            
            elements.append(table)
        
        return elements

    def _build_crew_assignments(self, shifts: List[ScheduledShift]) -> List:
        elements = []
        elements.append(Paragraph("Crew Assignment Summary", self.section_header_style))
        
        crew_shifts = {}
        
        for shift in shifts:
            assignments = self.db.query(ShiftAssignment).filter(
                and_(
                    ShiftAssignment.shift_id == shift.id,
                    ShiftAssignment.status.notin_(["declined", "swapped"])
                )
            ).all()
            
            for a in assignments:
                user = self.db.query(User).filter(User.id == a.user_id).first()
                if not user:
                    continue
                
                name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
                
                if name not in crew_shifts:
                    crew_shifts[name] = {
                        "user_id": user.id,
                        "email": user.email,
                        "shifts": [],
                        "total_hours": 0,
                    }
                
                shift_hours = (shift.end_datetime - shift.start_datetime).total_seconds() / 3600
                crew_shifts[name]["shifts"].append({
                    "date": shift.shift_date.strftime("%Y-%m-%d"),
                    "time": f"{shift.start_datetime.strftime('%H:%M')}-{shift.end_datetime.strftime('%H:%M')}",
                    "station": shift.station_name or "Unassigned",
                    "hours": round(shift_hours, 1),
                })
                crew_shifts[name]["total_hours"] += shift_hours
        
        headers = ["Crew Member", "Total Shifts", "Total Hours", "Dates Assigned"]
        rows = []
        
        for name, data in sorted(crew_shifts.items()):
            dates = ", ".join([s["date"] for s in data["shifts"][:5]])
            if len(data["shifts"]) > 5:
                dates += f" (+{len(data['shifts']) - 5} more)"
            
            rows.append([
                name,
                str(len(data["shifts"])),
                f"{round(data['total_hours'], 1)}h",
                dates,
            ])
        
        if not rows:
            elements.append(Paragraph("No crew assignments found.", self.body_style))
            return elements
        
        table_data = [headers] + rows
        col_widths = [2*inch, 0.9*inch, 0.9*inch, 3*inch]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27272a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (2, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d4d4d8')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')])
        ]))
        
        elements.append(table)
        return elements

    def export_my_schedule(
        self,
        user_id: int,
        start_date: date,
        end_date: date,
    ) -> bytes:
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
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter, 
            topMargin=0.5*inch, 
            bottomMargin=0.5*inch,
            leftMargin=0.5*inch,
            rightMargin=0.5*inch,
        )
        
        elements = []
        
        user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
        elements.append(Paragraph(f"Personal Schedule: {user_name}", self.title_style))
        elements.append(Paragraph(
            f"{start_date.strftime('%B %d')} - {end_date.strftime('%B %d, %Y')}",
            self.subtitle_style
        ))
        
        elements.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            self.body_style
        ))
        elements.append(Spacer(1, 20))
        
        if not assignments:
            elements.append(Paragraph(
                "No shifts assigned for this period.",
                self.body_style
            ))
        else:
            headers = ["Date", "Day", "Time", "Station", "Status"]
            rows = []
            total_hours = 0
            
            for a in assignments:
                shift = self.db.query(ScheduledShift).filter(ScheduledShift.id == a.shift_id).first()
                if not shift:
                    continue
                
                hours = (shift.end_datetime - shift.start_datetime).total_seconds() / 3600
                total_hours += hours
                
                rows.append([
                    shift.shift_date.strftime("%Y-%m-%d"),
                    shift.shift_date.strftime("%a"),
                    f"{shift.start_datetime.strftime('%H:%M')} - {shift.end_datetime.strftime('%H:%M')}",
                    shift.station_name or "Unassigned",
                    a.status.upper() if a.status else "N/A",
                ])
            
            rows.sort(key=lambda x: x[0])
            
            table_data = [headers] + rows
            col_widths = [1.2*inch, 0.6*inch, 1.3*inch, 2*inch, 1*inch]
            
            table = Table(table_data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27272a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d4d4d8')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')])
            ]))
            
            elements.append(table)
            elements.append(Spacer(1, 15))
            
            summary_style = ParagraphStyle(
                'Summary',
                parent=self.styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#3f3f46'),
            )
            elements.append(Paragraph(
                f"<b>Summary:</b> {len(rows)} shifts | {round(total_hours, 1)} total hours",
                summary_style
            ))
        
        doc.build(elements)
        return buffer.getvalue()


def get_schedule_pdf_service(db: Session, org_id: int) -> SchedulePDFExportService:
    return SchedulePDFExportService(db, org_id)
