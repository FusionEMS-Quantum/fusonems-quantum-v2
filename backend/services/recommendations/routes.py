from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from core.database import get_db
from services.recommendations.service import UnitRecommendationService
from services.routing.service import RoutingService
from models.recommendations import CallType, DispatcherAction


router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


class RecommendUnitRequest(BaseModel):
    call_id: str
    call_type: str
    scene_lat: float = Field(..., ge=-90, le=90)
    scene_lon: float = Field(..., ge=-180, le=180)
    required_capabilities: List[str]
    patient_acuity: Optional[str] = None
    transport_destination_lat: Optional[float] = Field(None, ge=-90, le=90)
    transport_destination_lon: Optional[float] = Field(None, ge=-180, le=180)
    organization_id: Optional[str] = None
    top_n: int = Field(3, ge=1, le=10)


class LogActionRequest(BaseModel):
    run_id: str
    action: str
    selected_unit_id: Optional[str] = None
    override_reason: Optional[str] = None
    dispatcher_user_id: str


@router.post("/units")
async def recommend_units(
    request: RecommendUnitRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        call_type_enum = CallType[request.call_type.upper()]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid call_type. Must be one of: {[ct.name for ct in CallType]}"
        )
    
    routing_service = RoutingService(db)
    recommendation_service = UnitRecommendationService(db, routing_service)
    
    result = await recommendation_service.recommend_units(
        call_id=request.call_id,
        call_type=call_type_enum,
        scene_lat=request.scene_lat,
        scene_lon=request.scene_lon,
        required_capabilities=request.required_capabilities,
        patient_acuity=request.patient_acuity,
        transport_destination_lat=request.transport_destination_lat,
        transport_destination_lon=request.transport_destination_lon,
        organization_id=request.organization_id,
        top_n=request.top_n
    )
    
    return result


@router.post("/log-action")
async def log_dispatcher_action(
    request: LogActionRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        action_enum = DispatcherAction[request.action.upper()]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action. Must be one of: {[a.name for a in DispatcherAction]}"
        )
    
    routing_service = RoutingService(db)
    recommendation_service = UnitRecommendationService(db, routing_service)
    
    await recommendation_service.log_dispatcher_action(
        run_id=request.run_id,
        action=action_enum,
        selected_unit_id=request.selected_unit_id,
        override_reason=request.override_reason,
        dispatcher_user_id=request.dispatcher_user_id
    )
    
    return {"status": "logged", "run_id": request.run_id, "action": request.action}
