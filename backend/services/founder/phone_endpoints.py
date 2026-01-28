"""
Founder Phone System Endpoints

FastAPI endpoints for phone system analytics and Telnyx integration in the founder dashboard.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from services.founder.phone_service import FounderPhoneService
from utils.logger import logger


router = APIRouter(prefix="/api/founder/phone", tags=["founder-phone"])

# Pydantic models
class PhoneSystemStatsResponse(BaseModel):
    active_calls: int
    calls_today: int
    missed_calls: int
    voicemail_count: int
    ava_ai_responses_today: int
    hours_saved_today: float
    customer_satisfaction_score: float
    issue_resolution_rate: float


class RecentCallResponse(BaseModel):
    id: str
    caller_number: str
    direction: str
    started_at: str
    duration_seconds: int
    status: str
    ai_handled: bool
    ivr_route: str
    transcription_status: str


class AIInsightResponse(BaseModel):
    type: str
    title: str
    description: str
    impact: str
    recommended_action: str
    auto_routed: bool


class MakeCallRequest(BaseModel):
    to_number: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')
    from_number: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')


class MakeCallResponse(BaseModel):
    success: bool
    call_id: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None


# Service instance
phone_service = FounderPhoneService()


@router.get("/stats", response_model=PhoneSystemStatsResponse)
async def get_phone_system_stats(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> PhoneSystemStatsResponse:
    """
    Get comprehensive phone system statistics for the founder dashboard.
    
    Returns:
        - Active calls count
        - Total calls today
        - Missed calls count
        - Voicemail count
        - AI responses and hours saved
        - Customer satisfaction and resolution rates
    """
    try:
        stats_data = await phone_service.get_phone_system_stats(org_id)
        return PhoneSystemStatsResponse(**stats_data)
    except Exception as e:
        logger.error(f"Error in get_phone_system_stats endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve phone system statistics"
        )


@router.get("/recent-calls", response_model=List[RecentCallResponse])
async def get_recent_calls(
    limit: int = 10,
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> List[RecentCallResponse]:
    """
    Get recent phone calls for the founder dashboard.
    
    Args:
        limit: Maximum number of calls to return (default: 10)
        org_id: Optional organization ID to filter by
    
    Returns:
        List of recent phone calls with details including AI handling status
    """
    try:
        if limit > 50:
            limit = 50  # Cap at 50 items
            
        calls = await phone_service.get_recent_calls(limit, org_id)
        return [RecentCallResponse(**call) for call in calls]
    except Exception as e:
        logger.error(f"Error in get_recent_calls endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recent calls"
        )


@router.get("/ai-insights", response_model=List[AIInsightResponse])
async def get_phone_ai_insights(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> List[AIInsightResponse]:
    """
    Get AI-generated phone system insights for the founder.
    
    Returns:
        List of AI insights about call patterns, missed opportunities, and optimization suggestions
    """
    try:
        insights = await phone_service.get_phone_ai_insights(org_id)
        return [AIInsightResponse(**insight) for insight in insights]
    except Exception as e:
        logger.error(f"Error in get_phone_ai_insights endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve AI phone insights"
        )


@router.post("/make-call", response_model=MakeCallResponse)
async def make_phone_call(
    request: MakeCallRequest,
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> MakeCallResponse:
    """
    Make an outbound phone call using Telnyx.
    
    Args:
        request: Contains destination and caller ID numbers
        org_id: Optional organization ID for context
    
    Returns:
        Call initiation result with success status and call ID
    """
    try:
        result = await phone_service.make_call(request.to_number, request.from_number, org_id)
        
        if result["success"]:
            return MakeCallResponse(
                success=True,
                call_id=result["call_id"],
                status=result["status"]
            )
        else:
            return MakeCallResponse(
                success=False,
                error=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error in make_phone_call endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate phone call"
        )


@router.get("/health")
async def get_phone_system_health(db: Session = Depends(get_db)):
    """
    Get phone system health status for the founder dashboard.
    
    Returns combined health information including:
    - Telnyx API connectivity
    - Database connectivity
    - AI service status
    - Recent error rates
    """
    try:
        # Test database connectivity
        db.execute("SELECT 1")
        
        # Test Telnyx API connectivity (lightweight check)
        health_check = await phone_service.telnyx_service.health_check()
        
        # Check if we can get basic stats (indicates service health)
        await phone_service.get_phone_system_stats()
        
        db_status = "connected" if health_check.get("database") else "error"
        telnyx_status = "connected" if health_check.get("telnyx_api") else "error"
        
        return {
            "status": "healthy" if db_status == "connected" and telnyx_status == "connected" else "degraded",
            "database": db_status,
            "telnyx_api": telnyx_status,
            "ai_service": "available",
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Phone system health check failed: {e}")
        return {
            "status": "error",
            "database": "error",
            "telnyx_api": "unavailable",
            "ai_service": "unavailable",
            "last_updated": datetime.utcnow().isoformat(),
            "error": str(e)
        }