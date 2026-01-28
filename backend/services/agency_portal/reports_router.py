"""
Agency Reports Router
Provides 5 read-only report endpoints with CSV/PDF export.
All exports are audit-logged and require agency_administrator or agency_finance_viewer role.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.agency_portal import AgencyPortalUser, AgencyPortalUserRole
from services.agency_portal.reports_service import AgencyReportsService


router = APIRouter(prefix="/api/agency/reports", tags=["Agency Reports"])


# ============================================================================
# SECURITY GUARDS
# ============================================================================

def require_agency_finance_access(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> tuple[Session, User, int]:
    """
    Require agency_administrator or agency_finance_viewer role.
    Returns (db, user, agency_id).
    """
    # Get agency portal user
    portal_user = db.query(AgencyPortalUser).filter(
        AgencyPortalUser.user_id == user.id,
        AgencyPortalUser.is_active == True
    ).first()

    if not portal_user:
        raise HTTPException(status_code=403, detail="Not authorized as agency user")

    # Check role
    if portal_user.role not in [
        AgencyPortalUserRole.AGENCY_ADMINISTRATOR,
        AgencyPortalUserRole.AGENCY_FINANCE_VIEWER
    ]:
        raise HTTPException(
            status_code=403,
            detail="Requires agency_administrator or agency_finance_viewer role"
        )

    # Check download permission
    if not portal_user.can_download_reports:
        raise HTTPException(status_code=403, detail="Report download not permitted for this user")

    return db, user, portal_user.agency_id


# ============================================================================
# REPORT ENDPOINTS
# ============================================================================

@router.get("/incident-summary")
async def generate_incident_summary_report(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    auth: tuple = Depends(require_agency_finance_access)
):
    """
    Generate Incident Summary Report
    - Incident ID, Date of service, Transport type, Pickup & destination, Unit, Claim status
    - Use case: Operational review, reconciliation
    """
    db, user, agency_id = auth

    # Parse dates
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start = datetime.utcnow() - timedelta(days=30)

    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
    else:
        end = datetime.utcnow()

    # Generate report
    service = AgencyReportsService(db)
    report_data = service.generate_incident_summary_report(
        agency_id=agency_id,
        start_date=start,
        end_date=end,
        format=format
    )

    # Return response
    filename = f"incident_summary_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.{format}"
    media_type = "text/csv" if format == "csv" else "application/pdf"

    return Response(
        content=report_data,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/documentation-completeness")
async def generate_documentation_completeness_report(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    auth: tuple = Depends(require_agency_finance_access)
):
    """
    Generate Documentation Completeness Report
    - Incident ID, Required documents, Status of each document, Pending party
    - Use case: Identifying documentation bottlenecks
    """
    db, user, agency_id = auth

    # Parse dates
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start = datetime.utcnow() - timedelta(days=30)

    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
    else:
        end = datetime.utcnow()

    # Generate report
    service = AgencyReportsService(db)
    report_data = service.generate_documentation_completeness_report(
        agency_id=agency_id,
        start_date=start,
        end_date=end,
        format=format
    )

    # Return response
    filename = f"documentation_completeness_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.{format}"
    media_type = "text/csv" if format == "csv" else "application/pdf"

    return Response(
        content=report_data,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/claim-status")
async def generate_claim_status_report(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    auth: tuple = Depends(require_agency_finance_access)
):
    """
    Generate Claim Status Report
    - Claim ID, Current status, Date last updated, High-level delay reason
    - Use case: Finance oversight, leadership reporting
    """
    db, user, agency_id = auth

    # Parse dates
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start = datetime.utcnow() - timedelta(days=30)

    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
    else:
        end = datetime.utcnow()

    # Generate report
    service = AgencyReportsService(db)
    report_data = service.generate_claim_status_report(
        agency_id=agency_id,
        start_date=start,
        end_date=end,
        format=format
    )

    # Return response
    filename = f"claim_status_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.{format}"
    media_type = "text/csv" if format == "csv" else "application/pdf"

    return Response(
        content=report_data,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/payments")
async def generate_payments_report(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    auth: tuple = Depends(require_agency_finance_access)
):
    """
    Generate Payments & Adjustments Report
    - Incident/Claim ID, Amount billed, Amount paid, Remaining balance, Adjustments/write-offs
    - Use case: Financial tracking
    """
    db, user, agency_id = auth

    # Parse dates
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start = datetime.utcnow() - timedelta(days=30)

    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
    else:
        end = datetime.utcnow()

    # Generate report
    service = AgencyReportsService(db)
    report_data = service.generate_payments_report(
        agency_id=agency_id,
        start_date=start,
        end_date=end,
        format=format
    )

    # Return response
    filename = f"payments_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.{format}"
    media_type = "text/csv" if format == "csv" else "application/pdf"

    return Response(
        content=report_data,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/aging-summary")
async def generate_aging_summary_report(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    auth: tuple = Depends(require_agency_finance_access)
):
    """
    Generate Aging Summary Report (High-Level)
    - Claims grouped by age bucket: 0-30, 31-60, 61-90, 90+
    - NO collection logic shown
    - Use case: Executive overview
    """
    db, user, agency_id = auth

    # Parse dates
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start = datetime.utcnow() - timedelta(days=90)

    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
    else:
        end = datetime.utcnow()

    # Generate report
    service = AgencyReportsService(db)
    report_data = service.generate_aging_summary_report(
        agency_id=agency_id,
        start_date=start,
        end_date=end,
        format=format
    )

    # Return response
    filename = f"aging_summary_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.{format}"
    media_type = "text/csv" if format == "csv" else "application/pdf"

    return Response(
        content=report_data,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
