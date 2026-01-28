from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from models.user import User, UserRole
from core.security import require_roles
from services.founder.marketing_service import MarketingService
from utils.write_ops import audit_and_event


router = APIRouter(
    prefix="/api/founder/marketing",
    tags=["Founder Marketing"],
    dependencies=[Depends(require_module("FOUNDER"))],
)


@router.get("/analytics")
def get_marketing_analytics(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get comprehensive marketing analytics"""
    
    analytics = MarketingService.get_marketing_analytics(db, user.org_id)
    
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="read",
        resource="founder_marketing_analytics",
        classification="OPS",
        after_state={"timestamp": analytics["timestamp"]},
        event_type="founder.marketing.analytics.viewed",
        event_payload={
            "total_demos": analytics["demo_requests"]["total"],
            "total_leads": analytics["lead_generation"]["total_leads"],
            "active_campaigns": analytics["campaigns"]["active_campaigns"]
        },
    )
    
    return analytics


@router.get("/demo-requests")
def get_demo_requests(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get demo request metrics"""
    
    metrics = MarketingService.get_demo_requests_metrics(db, user.org_id)
    
    return {
        "demo_requests": metrics,
        "timestamp": MarketingService.get_marketing_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/leads")
def get_lead_metrics(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get lead generation metrics"""
    
    metrics = MarketingService.get_lead_generation_metrics(db, user.org_id)
    
    return {
        "leads": metrics,
        "timestamp": MarketingService.get_marketing_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/campaigns")
def get_campaign_performance(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get campaign performance metrics"""
    
    metrics = MarketingService.get_campaign_metrics(db, user.org_id)
    
    return {
        "campaigns": metrics,
        "timestamp": MarketingService.get_marketing_analytics(db, user.org_id)["timestamp"]
    }


@router.get("/roi")
def get_roi_analysis(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get marketing ROI analysis"""
    
    metrics = MarketingService.get_roi_analysis(db, user.org_id)
    
    return {
        "roi": metrics,
        "timestamp": MarketingService.get_marketing_analytics(db, user.org_id)["timestamp"]
    }
