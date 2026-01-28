"""
Socket Bridge Router
FastAPI endpoints for managing and monitoring the Socket.io bridge.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

from services.cad.socket_bridge import get_socket_bridge
from core.guards import require_role
from utils.logger import logger


router = APIRouter(prefix="/api/socket-bridge", tags=["Socket Bridge"])


class AssignmentRequest(BaseModel):
    """Request model for sending assignments"""
    unit_id: str = Field(..., description="Unit ID to assign")
    incident_id: str = Field(..., description="Incident ID")
    incident_type: str = Field(..., description="Type of incident")
    address: str = Field(..., description="Incident address")
    priority: int = Field(..., ge=1, le=5, description="Priority level (1=highest, 5=lowest)")
    details: Optional[str] = Field(None, description="Additional incident details")
    location: Optional[Dict[str, Any]] = Field(None, description="Coordinates (lat, lng)")


class UnitLocationUpdate(BaseModel):
    """Request model for unit location updates"""
    unit_id: str = Field(..., description="Unit ID")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    heading: Optional[float] = Field(None, ge=0, le=360, description="Heading in degrees")
    speed: Optional[float] = Field(None, ge=0, description="Speed in km/h")


class UnitStatusUpdate(BaseModel):
    """Request model for unit status updates"""
    unit_id: str = Field(..., description="Unit ID")
    status: str = Field(..., description="Unit status (available, enroute, onscene, transport, hospital, unavailable)")
    incident_id: Optional[str] = Field(None, description="Related incident ID")


class IncidentStatusUpdate(BaseModel):
    """Request model for incident status updates"""
    incident_id: str = Field(..., description="Incident ID")
    status: str = Field(..., description="Incident status")
    user_id: str = Field(..., description="User making the update")


class IncidentTimestampUpdate(BaseModel):
    """Request model for incident timestamp updates"""
    incident_id: str = Field(..., description="Incident ID")
    field: str = Field(..., description="Timestamp field (dispatched_at, enroute_at, onscene_at, etc.)")
    timestamp: str = Field(..., description="ISO timestamp")
    location: Optional[Dict[str, Any]] = Field(None, description="Location at timestamp")
    source: str = Field(default="manual", description="Source of timestamp (manual, auto)")


class TransportCompletedNotification(BaseModel):
    """Request model for transport completion notification"""
    incident_id: str = Field(..., description="Incident ID")
    epcr_id: str = Field(..., description="ePCR record ID")
    transport_type: str = Field(..., description="Type of transport")
    patient_name: Optional[str] = Field(None, description="Patient name")
    destination: Optional[str] = Field(None, description="Destination facility")
    billing_data: Dict[str, Any] = Field(default_factory=dict, description="Billing-related data")


class MetricsUpdate(BaseModel):
    """Request model for real-time metrics updates"""
    metrics: Dict[str, Any] = Field(..., description="Metrics to broadcast")


@router.get("/health")
async def get_bridge_health():
    """
    Get health status of the Socket.io bridge.
    Public endpoint for monitoring.
    """
    bridge = get_socket_bridge()
    health = bridge.get_health_status()
    
    return {
        "status": "healthy" if health["connected"] else "degraded",
        "bridge": health,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/reconnect")
async def reconnect_bridge(current_user=Depends(require_role("admin"))):
    """
    Manually trigger bridge reconnection.
    Admin only.
    """
    bridge = get_socket_bridge()
    
    try:
        if bridge.connected:
            await bridge.disconnect()
            
        await bridge.connect()
        
        return {
            "success": True,
            "message": "Socket bridge reconnected successfully",
            "status": bridge.get_health_status()
        }
    except Exception as e:
        logger.error(f"Failed to reconnect socket bridge: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reconnection failed: {str(e)}")


@router.post("/assignments/send")
async def send_assignment(
    request: AssignmentRequest,
    current_user=Depends(require_role("dispatcher"))
):
    """
    Send a new assignment to a unit via the CAD backend.
    Dispatcher role required.
    """
    bridge = get_socket_bridge()
    
    if not bridge.connected:
        raise HTTPException(status_code=503, detail="Socket bridge not connected")
    
    incident_data = {
        "incidentId": request.incident_id,
        "type": request.incident_type,
        "address": request.address,
        "priority": request.priority,
        "details": request.details,
        "location": request.location
    }
    
    success = await bridge.send_assignment(request.unit_id, incident_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send assignment")
    
    logger.info(f"Assignment sent: Unit {request.unit_id} -> Incident {request.incident_id}")
    
    return {
        "success": True,
        "message": f"Assignment sent to unit {request.unit_id}",
        "incident_id": request.incident_id,
        "unit_id": request.unit_id
    }


@router.post("/units/location")
async def update_unit_location(
    request: UnitLocationUpdate,
    current_user=Depends(require_role("crew"))
):
    """
    Update unit GPS location.
    Crew role required.
    """
    bridge = get_socket_bridge()
    
    if not bridge.connected:
        raise HTTPException(status_code=503, detail="Socket bridge not connected")
    
    location = {
        "type": "Point",
        "coordinates": [request.longitude, request.latitude]
    }
    
    success = await bridge.update_unit_location(
        request.unit_id,
        location,
        request.heading,
        request.speed
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update unit location")
    
    return {
        "success": True,
        "message": f"Location updated for unit {request.unit_id}",
        "unit_id": request.unit_id
    }


@router.post("/units/status")
async def update_unit_status(
    request: UnitStatusUpdate,
    current_user=Depends(require_role("crew"))
):
    """
    Update unit availability status.
    Crew role required.
    """
    bridge = get_socket_bridge()
    
    if not bridge.connected:
        raise HTTPException(status_code=503, detail="Socket bridge not connected")
    
    success = await bridge.update_unit_status(
        request.unit_id,
        request.status,
        request.incident_id
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update unit status")
    
    logger.info(f"Unit status updated: {request.unit_id} -> {request.status}")
    
    return {
        "success": True,
        "message": f"Status updated for unit {request.unit_id}",
        "unit_id": request.unit_id,
        "status": request.status
    }


@router.post("/incidents/status")
async def update_incident_status(
    request: IncidentStatusUpdate,
    current_user=Depends(require_role("dispatcher"))
):
    """
    Update incident status.
    Dispatcher role required.
    """
    bridge = get_socket_bridge()
    
    if not bridge.connected:
        raise HTTPException(status_code=503, detail="Socket bridge not connected")
    
    success = await bridge.update_incident_status(
        request.incident_id,
        request.status,
        request.user_id
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update incident status")
    
    logger.info(f"Incident status updated: {request.incident_id} -> {request.status}")
    
    return {
        "success": True,
        "message": f"Status updated for incident {request.incident_id}",
        "incident_id": request.incident_id,
        "status": request.status
    }


@router.post("/incidents/timestamp")
async def record_incident_timestamp(
    request: IncidentTimestampUpdate,
    current_user=Depends(require_role("crew"))
):
    """
    Record incident timestamp (enroute, onscene, etc.).
    Crew role required.
    """
    bridge = get_socket_bridge()
    
    if not bridge.connected:
        raise HTTPException(status_code=503, detail="Socket bridge not connected")
    
    success = await bridge.record_incident_timestamp(
        request.incident_id,
        request.field,
        request.timestamp,
        request.location,
        request.source
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to record timestamp")
    
    logger.info(f"Incident timestamp recorded: {request.incident_id}.{request.field} = {request.timestamp}")
    
    return {
        "success": True,
        "message": f"Timestamp recorded for incident {request.incident_id}",
        "incident_id": request.incident_id,
        "field": request.field,
        "timestamp": request.timestamp
    }


@router.post("/transport/completed")
async def notify_transport_completed(
    request: TransportCompletedNotification,
    current_user=Depends(require_role("crew"))
):
    """
    Notify billing system when a transport completes.
    Triggers billing record creation and claims processing.
    Crew role required.
    """
    bridge = get_socket_bridge()
    
    if not bridge.connected:
        raise HTTPException(status_code=503, detail="Socket bridge not connected")
    
    success = await bridge.notify_transport_completed(
        request.incident_id,
        request.epcr_id,
        request.billing_data
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to notify transport completion")
    
    logger.info(f"Transport completed notification sent: {request.incident_id} (ePCR: {request.epcr_id})")
    
    return {
        "success": True,
        "message": f"Transport completion notification sent",
        "incident_id": request.incident_id,
        "epcr_id": request.epcr_id
    }


@router.post("/metrics/broadcast")
async def broadcast_metrics(
    request: MetricsUpdate,
    current_user=Depends(require_role("admin"))
):
    """
    Broadcast real-time metrics to founder dashboard and connected clients.
    Admin role required.
    """
    bridge = get_socket_bridge()
    
    if not bridge.connected:
        raise HTTPException(status_code=503, detail="Socket bridge not connected")
    
    success = await bridge.broadcast_metrics_update(request.metrics)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to broadcast metrics")
    
    logger.debug("Real-time metrics broadcasted to connected clients")
    
    return {
        "success": True,
        "message": "Metrics broadcasted successfully",
        "metric_count": len(request.metrics)
    }


@router.get("/status")
async def get_bridge_status(current_user=Depends(require_role("admin"))):
    """
    Get detailed status of the socket bridge.
    Admin only.
    """
    bridge = get_socket_bridge()
    health = bridge.get_health_status()
    
    return {
        "bridge": health,
        "registered_events": list(bridge.event_handlers.keys()),
        "timestamp": datetime.utcnow().isoformat()
    }
