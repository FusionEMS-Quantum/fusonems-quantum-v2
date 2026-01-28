from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from models.user import User, UserRole
from core.security import require_roles
from services.founder.reporting_service import ReportingService
from utils.write_ops import audit_and_event


router = APIRouter(
    prefix="/api/founder/reporting",
    tags=["Founder Reporting"],
    dependencies=[Depends(require_module("FOUNDER"))],
)


@router.get("/analytics")
def get_reporting_analytics(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get comprehensive reporting and analytics dashboard metrics"""
    
    analytics = ReportingService.get_reporting_analytics(db, user.org_id)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="read",
        resource="founder_reporting_analytics",
        classification="OPS",
        after_state={"timestamp": analytics["timestamp"]},
        event_type="founder.reporting.analytics.viewed",
        event_payload={
            "total_reports": analytics["system_reporting"]["total_reports"],
            "total_exports": analytics["compliance_exports"]["total_exports"],
            "api_health": analytics["analytics_api"]["health_status"]
        },
    )
    
    return analytics


@router.get("/system-reports")
def get_system_reports(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get system reporting metrics"""
    
    metrics = ReportingService.get_system_reporting_metrics(db, user.org_id)
    
    return {
        "system_reporting": metrics,
        "timestamp": ReportingService.get_reporting_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/compliance-exports")
def get_compliance_exports(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get compliance export metrics"""
    
    metrics = ReportingService.get_compliance_export_metrics(db, user.org_id)
    
    return {
        "compliance_exports": metrics,
        "timestamp": ReportingService.get_reporting_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/dashboards")
def get_dashboard_metrics(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get custom dashboard builder metrics"""
    
    metrics = ReportingService.get_dashboard_builder_metrics(db, user.org_id)
    
    return {
        "dashboards": metrics,
        "timestamp": ReportingService.get_reporting_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/automated")
def get_automated_reports(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get automated report generation metrics"""
    
    metrics = ReportingService.get_automated_report_metrics(db, user.org_id)
    
    return {
        "automated_reports": metrics,
        "timestamp": ReportingService.get_reporting_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/pipelines")
def get_data_pipelines(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get data export pipeline metrics"""
    
    metrics = ReportingService.get_data_export_pipeline_metrics(db, user.org_id)
    
    return {
        "data_exports": metrics,
        "timestamp": ReportingService.get_reporting_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/api-health")
def get_api_health(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get analytics API health status"""
    
    metrics = ReportingService.get_analytics_api_health(db, user.org_id)
    
    return {
        "analytics_api": metrics,
        "timestamp": ReportingService.get_reporting_analytics(db, user.org_id)["timestamp"]
    }
