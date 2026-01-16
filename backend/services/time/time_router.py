from fastapi import APIRouter, Depends, Request

from core.security import require_roles

router = APIRouter(prefix="/api/time", tags=["Time"])


@router.get("")
def get_time(request: Request, _user=Depends(require_roles())):
    return {
        "server_time": request.state.server_time.isoformat(),
        "device_time": request.state.device_time.isoformat() if request.state.device_time else None,
        "drift_seconds": request.state.drift_seconds,
        "drifted": request.state.drifted,
    }
