from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from core.upgrade import check_upgrade_readiness
from models.event import EventLog
from models.module_registry import ModuleRegistry
from models.user import User, UserRole
from utils.tenancy import scoped_query
from utils.write_ops import audit_and_event, model_snapshot

router = APIRouter(prefix="/api/system", tags=["System"])


class ModuleUpdate(BaseModel):
    enabled: bool | None = None
    kill_switch: bool | None = None
    health_state: str | None = None


@router.get("/health")
def system_health(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.founder)),
):
    modules = scoped_query(db, ModuleRegistry, user.org_id, None).order_by(
        ModuleRegistry.module_key.asc()
    ).all()
    last_event = (
        scoped_query(db, EventLog, user.org_id, request.state.training_mode)
        .order_by(EventLog.created_at.desc())
        .first()
    )
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_events = (
        scoped_query(db, EventLog, user.org_id, request.state.training_mode)
        .filter(EventLog.created_at >= one_hour_ago)
        .count()
    )
    upgrade_status = check_upgrade_readiness(db, user.org_id)
    return {
        "status": "online",
        "modules": [model_snapshot(module) for module in modules],
        "last_event_at": last_event.created_at.isoformat() if last_event else None,
        "recent_events": recent_events,
        "upgrade": upgrade_status,
    }


@router.get("/modules")
def list_modules(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.founder)),
):
    return scoped_query(db, ModuleRegistry, user.org_id, None).order_by(
        ModuleRegistry.module_key.asc()
    ).all()


@router.patch("/modules/{module_key}")
def update_module(
    module_key: str,
    payload: ModuleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.founder)),
):
    module = (
        db.query(ModuleRegistry)
        .filter(ModuleRegistry.org_id == user.org_id, ModuleRegistry.module_key == module_key)
        .first()
    )
    if not module:
        return {"status": "not_found"}
    before = model_snapshot(module)
    if payload.enabled is not None:
        module.enabled = payload.enabled
    if payload.kill_switch is not None:
        module.kill_switch = payload.kill_switch
    if payload.health_state is not None:
        module.health_state = payload.health_state
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="update",
        resource="module_registry",
        classification="NON_PHI",
        before_state=before,
        after_state=model_snapshot(module),
        event_type="RECORD_WRITTEN",
        event_payload={"module_key": module.module_key},
    )
    return {"status": "ok", "module_key": module.module_key}
