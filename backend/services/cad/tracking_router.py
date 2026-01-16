import json
from typing import Dict

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from core.guards import require_module
from core.security import get_current_user
from models.user import User
from utils.logger import logger

router = APIRouter(
    prefix="/api/cad",
    tags=["Tracking"],
    dependencies=[Depends(require_module("CAD"))],
)

# Active units dictionary keyed by org_id
active_units: Dict[int, Dict[str, dict]] = {}

# --- GPS Update via POST (for units or MDTs) ---
@router.post("/track")
async def update_position(data: dict, user: User = Depends(get_current_user)):
    unit_id = data.get("unit_id")
    lat = data.get("lat")
    lon = data.get("lon")

    if not all([unit_id, lat, lon]):
        return {"error": "Missing unit_id, lat, or lon"}

    org_units = active_units.setdefault(user.org_id, {})
    org_units[unit_id] = {"lat": lat, "lon": lon}
    logger.info("Updated position for %s: (%s, %s)", unit_id, lat, lon)
    return {"status": "ok", "unit_id": unit_id, "lat": lat, "lon": lon}


# --- Live WebSocket updates for Dispatchers ---
@router.websocket("/ws/track")
async def tracking_websocket(websocket: WebSocket, user: User = Depends(get_current_user)):
    await websocket.accept()
    logger.info("Dispatcher connected to tracking WebSocket.")
    try:
        while True:
            data = json.dumps(active_units.get(user.org_id, {}))
            await websocket.send_text(data)
    except WebSocketDisconnect:
        logger.info("Dispatcher disconnected from tracking WebSocket.")
