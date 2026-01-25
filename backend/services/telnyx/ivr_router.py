from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.params import Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.telnyx import TelnyxCallSummary
from models.user import User, UserRole
from services.telnyx.helpers import (
    get_system_user,
    module_enabled,
    require_telnyx_enabled,
    resolve_org,
    verify_telnyx_signature,
)
from services.telnyx.telnyx_service import TelnyxFaxHandler, TelnyxIVRService


router = APIRouter(prefix="/api/telnyx", tags=["Telnyx"])


class CallSummaryRequest(BaseModel):
    call_sid: str
    intent: str
    transcript: dict[str, Any] = {}
    ai_response: dict[str, Any] = {}
    resolution: str | None = None
    reason: str | None = None


def _ensure_module(org_id: int, db: Session) -> None:
    if not module_enabled(db, org_id):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="MODULE_DISABLED:BILLING")


@router.post("/incoming-call")
async def incoming_call(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    require_telnyx_enabled()
    raw_body = await request.body()
    verify_telnyx_signature(raw_body, request)
    data = json.loads(raw_body.decode("utf-8") or "{}")
    payload = data.get("data", {}).get("payload") or data.get("payload") or {}
    org = resolve_org(db, payload)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="org_not_found")
    _ensure_module(org.id, db)
    user = get_system_user(db, org.id)
    service = TelnyxIVRService(db, org.id)
    result = service.handle_incoming_call(request, user, payload)
    return {"detail": "call_processed", "result": result}


@router.post("/call-summary")
def post_call_summary(
    payload: CallSummaryRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    require_telnyx_enabled()
    _ensure_module(user.org_id, db)
    service = TelnyxIVRService(db, user.org_id)
    record = service.record_call_summary(
        request,
        user,
        payload.dict(),
        payload.ai_response,
        payload.intent,
        payload.reason or "manual",
        resolution=payload.resolution,
    )
    return {"summary_id": record.id, "status": record.resolution}


@router.get("/call-history")
def call_history(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing)),
):
    require_telnyx_enabled()
    _ensure_module(user.org_id, db)
    query = (
        db.query(TelnyxCallSummary)
        .filter(TelnyxCallSummary.org_id == user.org_id)
        .order_by(TelnyxCallSummary.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    summaries = query.all()
    return {
        "summaries": [
            {
                "id": summary.id,
                "intent": summary.intent,
                "ai_model": summary.ai_model,
                "resolution": summary.resolution,
                "created_at": summary.created_at.isoformat() if summary.created_at else None,
            }
            for summary in summaries
        ]
    }


@router.post("/fax-received")
async def fax_received(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    require_telnyx_enabled()
    raw_body = await request.body()
    verify_telnyx_signature(raw_body, request)
    data = json.loads(raw_body.decode("utf-8") or "{}")
    payload = data.get("data", {}).get("payload") or data.get("payload") or {}
    org = resolve_org(db, payload)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="org_not_found")
    _ensure_module(org.id, db)
    user = get_system_user(db, org.id)
    fax_handler = TelnyxFaxHandler(db, org.id)
    record = fax_handler.store_fax(request, user, payload)
    return {"detail": "fax_processed", "fax_id": record.id}
