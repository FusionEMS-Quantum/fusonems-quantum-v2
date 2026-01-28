"""
Agency Reports Service
Generates 5 report types with CSV/PDF export capabilities.
All exports are read-only and audit-logged.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, case
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import csv
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from models.agency_portal import (
    AgencyIncidentView,
    AgencyDocumentStatus,
    AgencyClaimStatus,
    AgencyPayment,
    ThirdPartyBillingAgency,
    AgencyPortalAccessLog
)


class AgencyReportsService:
    """Generate agency-safe reports with CSV/PDF export."""

    def __init__(self, db: Session):
        self.db = db

    # ========================================================================
    # REPORT 1: INCIDENT SUMMARY REPORT
    # ========================================================================

    def generate_incident_summary_report(
        self,
        agency_id: int,
        start_date: datetime,
        end_date: datetime,
        format: str = "csv"
    ) -> bytes:
        """
        Incident Summary Report
        - Incident ID, Date of service, Transport type, Pickup & destination, Unit, Claim status
        - Use case: Operational review, reconciliation
        """
        # Query incidents
        incidents = self.db.query(
            AgencyIncidentView.incident_id,
            AgencyIncidentView.date_of_service,
            AgencyIncidentView.transport_type,
            AgencyIncidentView.pickup_location,
            AgencyIncidentView.destination_location,
            AgencyIncidentView.unit_identifier,
            AgencyIncidentView.claim_status
        ).filter(
            and_(
                AgencyIncidentView.agency_id == agency_id,
                AgencyIncidentView.date_of_service >= start_date,
                AgencyIncidentView.date_of_service <= end_date
            )
        ).order_by(AgencyIncidentView.date_of_service.desc()).all()

        # Prepare data
        headers = ["Incident ID", "Date of Service", "Transport Type", "Pickup Location", "Destination", "Unit", "Claim Status"]
        rows = [
            [
                inc.incident_id,
                inc.date_of_service.strftime("%Y-%m-%d %H:%M") if inc.date_of_service else "",
                inc.transport_type.value if inc.transport_type else "",
                inc.pickup_location or "",
                inc.destination_location or "",
                inc.unit_identifier or "",
                inc.claim_status or "N/A"
            ]
            for inc in incidents
        ]

        # Log access
        self._log_report_access(agency_id, "incident_summary", format, len(rows))

        # Generate export
        if format == "csv":
            return self._generate_csv(headers, rows)
        else:
            return self._generate_pdf("Incident Summary Report", headers, rows, start_date, end_date)

    # ========================================================================
    # REPORT 2: DOCUMENTATION COMPLETENESS REPORT
    # ========================================================================

    def generate_documentation_completeness_report(
        self,
        agency_id: int,
        start_date: datetime,
        end_date: datetime,
        format: str = "csv"
    ) -> bytes:
        """
        Documentation Completeness Report
        - Incident ID, Required documents, Status of each document, Pending party
        - Use case: Identifying documentation bottlenecks
        """
        # Query document statuses
        docs = self.db.query(
            AgencyDocumentStatus.incident_id,
            AgencyDocumentStatus.document_type,
            AgencyDocumentStatus.is_required,
            AgencyDocumentStatus.status,
            AgencyDocumentStatus.pending_from,
            AgencyDocumentStatus.last_status_change
        ).join(
            AgencyIncidentView,
            AgencyDocumentStatus.incident_id == AgencyIncidentView.incident_id
        ).filter(
            and_(
                AgencyDocumentStatus.agency_id == agency_id,
                AgencyIncidentView.date_of_service >= start_date,
                AgencyIncidentView.date_of_service <= end_date
            )
        ).order_by(AgencyDocumentStatus.incident_id, AgencyDocumentStatus.document_type).all()

        # Prepare data
        headers = ["Incident ID", "Document Type", "Required", "Status", "Pending From", "Last Updated"]
        rows = [
            [
                doc.incident_id,
                doc.document_type.value if doc.document_type else "",
                "Yes" if doc.is_required else "No",
                doc.status.value if doc.status else "",
                doc.pending_from.value if doc.pending_from else "N/A",
                doc.last_status_change.strftime("%Y-%m-%d") if doc.last_status_change else "N/A"
            ]
            for doc in docs
        ]

        # Log access
        self._log_report_access(agency_id, "documentation_completeness", format, len(rows))

        # Generate export
        if format == "csv":
            return self._generate_csv(headers, rows)
        else:
            return self._generate_pdf("Documentation Completeness Report", headers, rows, start_date, end_date)

    # ========================================================================
    # REPORT 3: CLAIM STATUS REPORT
    # ========================================================================

    def generate_claim_status_report(
        self,
        agency_id: int,
        start_date: datetime,
        end_date: datetime,
        format: str = "csv"
    ) -> bytes:
        """
        Claim Status Report
        - Claim ID, Current status, Date last updated, High-level delay reason
        - Use case: Finance oversight, leadership reporting
        """
        # Query claim statuses
        claims = self.db.query(
            AgencyClaimStatus.claim_id,
            AgencyClaimStatus.incident_id,
            AgencyClaimStatus.status,
            AgencyClaimStatus.last_updated,
            AgencyClaimStatus.short_explanation,
            AgencyClaimStatus.current_step,
            AgencyClaimStatus.what_is_needed
        ).join(
            AgencyIncidentView,
            AgencyClaimStatus.incident_id == AgencyIncidentView.incident_id
        ).filter(
            and_(
                AgencyClaimStatus.agency_id == agency_id,
                AgencyIncidentView.date_of_service >= start_date,
                AgencyIncidentView.date_of_service <= end_date
            )
        ).order_by(AgencyClaimStatus.last_updated.desc()).all()

        # Prepare data
        headers = ["Claim ID", "Incident ID", "Status", "Last Updated", "Current Step", "Explanation"]
        rows = [
            [
                claim.claim_id,
                claim.incident_id,
                claim.status.value if claim.status else "",
                claim.last_updated.strftime("%Y-%m-%d") if claim.last_updated else "",
                claim.current_step or "N/A",
                claim.short_explanation or claim.what_is_needed or "No additional info"
            ]
            for claim in claims
        ]

        # Log access
        self._log_report_access(agency_id, "claim_status", format, len(rows))

        # Generate export
        if format == "csv":
            return self._generate_csv(headers, rows)
        else:
            return self._generate_pdf("Claim Status Report", headers, rows, start_date, end_date)

    # ========================================================================
    # REPORT 4: PAYMENTS & ADJUSTMENTS REPORT
    # ========================================================================

    def generate_payments_report(
        self,
        agency_id: int,
        start_date: datetime,
        end_date: datetime,
        format: str = "csv"
    ) -> bytes:
        """
        Payments & Adjustments Report
        - Incident/Claim ID, Amount billed, Amount paid, Remaining balance, Adjustments/write-offs
        - Use case: Financial tracking
        """
        # Query payments with claim details
        payments = self.db.query(
            AgencyPayment.claim_id,
            AgencyClaimStatus.incident_id,
            AgencyClaimStatus.amount_billed,
            AgencyClaimStatus.amount_paid,
            AgencyClaimStatus.remaining_balance,
            AgencyPayment.payment_date,
            AgencyPayment.amount.label("payment_amount"),
            AgencyPayment.adjustment,
            AgencyPayment.write_off,
            AgencyPayment.payment_type,
            AgencyPayment.payer_name
        ).join(
            AgencyClaimStatus,
            AgencyPayment.claim_id == AgencyClaimStatus.claim_id
        ).filter(
            and_(
                AgencyPayment.agency_id == agency_id,
                AgencyPayment.payment_date >= start_date,
                AgencyPayment.payment_date <= end_date
            )
        ).order_by(AgencyPayment.payment_date.desc()).all()

        # Prepare data
        headers = [
            "Claim ID", "Incident ID", "Amount Billed", "Amount Paid", 
            "Remaining Balance", "Payment Date", "Payment Amount", 
            "Adjustment", "Write-Off", "Payment Type", "Payer"
        ]
        rows = [
            [
                payment.claim_id,
                payment.incident_id,
                f"${float(payment.amount_billed or 0):.2f}",
                f"${float(payment.amount_paid or 0):.2f}",
                f"${float(payment.remaining_balance or 0):.2f}",
                payment.payment_date.strftime("%Y-%m-%d") if payment.payment_date else "",
                f"${float(payment.payment_amount or 0):.2f}",
                f"${float(payment.adjustment or 0):.2f}",
                f"${float(payment.write_off or 0):.2f}",
                payment.payment_type or "N/A",
                payment.payer_name or "N/A"
            ]
            for payment in payments
        ]

        # Log access
        self._log_report_access(agency_id, "payments", format, len(rows))

        # Generate export
        if format == "csv":
            return self._generate_csv(headers, rows)
        else:
            return self._generate_pdf("Payments & Adjustments Report", headers, rows, start_date, end_date)

    # ========================================================================
    # REPORT 5: AGING SUMMARY REPORT
    # ========================================================================

    def generate_aging_summary_report(
        self,
        agency_id: int,
        start_date: datetime,
        end_date: datetime,
        format: str = "csv"
    ) -> bytes:
        """
        Aging Summary Report (High-Level)
        - Claims grouped by age bucket: 0-30, 31-60, 61-90, 90+
        - NO collection logic shown
        - Use case: Executive overview
        """
        today = datetime.utcnow()

        # Query claims with aging calculations
        claims = self.db.query(
            AgencyClaimStatus.claim_id,
            AgencyClaimStatus.incident_id,
            AgencyClaimStatus.status,
            AgencyClaimStatus.created_at,
            AgencyClaimStatus.last_updated,
            AgencyClaimStatus.amount_billed,
            AgencyClaimStatus.remaining_balance
        ).join(
            AgencyIncidentView,
            AgencyClaimStatus.incident_id == AgencyIncidentView.incident_id
        ).filter(
            and_(
                AgencyClaimStatus.agency_id == agency_id,
                AgencyIncidentView.date_of_service >= start_date,
                AgencyIncidentView.date_of_service <= end_date,
                AgencyClaimStatus.remaining_balance > 0
            )
        ).all()

        # Calculate aging buckets
        aging_data = {
            "0-30 days": {"count": 0, "amount": 0},
            "31-60 days": {"count": 0, "amount": 0},
            "61-90 days": {"count": 0, "amount": 0},
            "90+ days": {"count": 0, "amount": 0}
        }

        detail_rows = []
        for claim in claims:
            days_old = (today - claim.created_at).days
            balance = float(claim.remaining_balance or 0)
            
            if days_old <= 30:
                bucket = "0-30 days"
            elif days_old <= 60:
                bucket = "31-60 days"
            elif days_old <= 90:
                bucket = "61-90 days"
            else:
                bucket = "90+ days"
            
            aging_data[bucket]["count"] += 1
            aging_data[bucket]["amount"] += balance

            detail_rows.append([
                claim.claim_id,
                claim.incident_id,
                claim.status.value if claim.status else "",
                str(days_old),
                bucket,
                f"${balance:.2f}"
            ])

        # Prepare summary data
        summary_headers = ["Age Bucket", "Claim Count", "Total Outstanding"]
        summary_rows = [
            [bucket, data["count"], f"${data['amount']:.2f}"]
            for bucket, data in aging_data.items()
        ]

        detail_headers = ["Claim ID", "Incident ID", "Status", "Days Old", "Age Bucket", "Balance"]

        # Log access
        self._log_report_access(agency_id, "aging_summary", format, len(detail_rows))

        # Generate export
        if format == "csv":
            # Include both summary and detail in CSV
            output = io.StringIO()
            writer = csv.writer(output)
            
            writer.writerow(["AGING SUMMARY"])
            writer.writerow(summary_headers)
            writer.writerows(summary_rows)
            writer.writerow([])
            writer.writerow(["DETAIL"])
            writer.writerow(detail_headers)
            writer.writerows(detail_rows)
            
            return output.getvalue().encode('utf-8')
        else:
            return self._generate_aging_pdf(
                summary_headers, summary_rows,
                detail_headers, detail_rows,
                start_date, end_date
            )

    # ========================================================================
    # CSV EXPORT HELPER
    # ========================================================================

    def _generate_csv(self, headers: List[str], rows: List[List[Any]]) -> bytes:
        """Generate CSV export."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)
        return output.getvalue().encode('utf-8')

    # ========================================================================
    # PDF EXPORT HELPERS
    # ========================================================================

    def _generate_pdf(
        self,
        title: str,
        headers: List[str],
        rows: List[List[Any]],
        start_date: datetime,
        end_date: datetime
    ) -> bytes:
        """Generate PDF export."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(title, title_style))
        
        # Date range
        date_range = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        date_style = ParagraphStyle(
            'DateRange',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(date_range, date_style))
        
        # Table
        table_data = [headers] + rows
        
        # Calculate column widths
        available_width = doc.width
        num_cols = len(headers)
        col_width = available_width / num_cols
        
        table = Table(table_data, colWidths=[col_width] * num_cols)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        
        return buffer.getvalue()

    def _generate_aging_pdf(
        self,
        summary_headers: List[str],
        summary_rows: List[List[Any]],
        detail_headers: List[str],
        detail_rows: List[List[Any]],
        start_date: datetime,
        end_date: datetime
    ) -> bytes:
        """Generate aging summary PDF with summary and detail sections."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("Aging Summary Report", title_style))
        
        # Date range
        date_range = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        date_style = ParagraphStyle(
            'DateRange',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(date_range, date_style))
        
        # Summary table
        summary_table = Table([summary_headers] + summary_rows, colWidths=[2*inch, 1.5*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(summary_table)
        
        elements.append(Spacer(1, 0.5*inch))
        
        # Detail header
        detail_title_style = ParagraphStyle(
            'DetailTitle',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=10
        )
        elements.append(Paragraph("Detail Breakdown", detail_title_style))
        
        # Detail table
        detail_table_data = [detail_headers] + detail_rows
        col_widths = [1.2*inch, 1.2*inch, 1.5*inch, 0.8*inch, 1*inch, 1*inch]
        
        detail_table = Table(detail_table_data, colWidths=col_widths)
        detail_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
        ]))
        elements.append(detail_table)
        
        # Build PDF
        doc.build(elements)
        
        return buffer.getvalue()

    # ========================================================================
    # AUDIT LOGGING
    # ========================================================================

    def _log_report_access(self, agency_id: int, report_type: str, format: str, row_count: int):
        """Log report generation for audit trail."""
        log = AgencyPortalAccessLog(
            agency_id=agency_id,
            user_name="agency_user",  # Should be replaced with actual user from auth
            access_type=f"report_export_{report_type}",
            resource_accessed=f"{report_type}.{format}",
            timestamp=datetime.utcnow(),
            isolation_verified=True
        )
        self.db.add(log)
        self.db.commit()
