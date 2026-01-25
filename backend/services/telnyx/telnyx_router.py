from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from models.support import SupportInteraction
from models.user import User, UserRole
from models.epcr import Patient
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot
from services.telnyx.assistant import TelnyxAssistant
from services.telnyx.helpers import (
    get_system_user,
    module_enabled,
    resolve_org,
    verify_telnyx_signature,
)


router = APIRouter(prefix="/api/telnyx", tags=["Telnyx"])




def _resolve_channel(payload: dict[str, Any], event_type: str) -> str:
    direction = (payload.get("direction") or payload.get("channel") or "").lower()
    if "call" in event_type:
        return "call"
    if direction == "sms":
        return "sms"
    return "voice" if "voice" in event_type else "message"


def _record_interaction(
    db: Session,
    request: Request,
    user: User,
    org_id: int,
    channel: str,
    direction: str,
    from_number: str | None,
    to_number: str | None,
    payload: dict[str, Any],
) -> SupportInteraction:
    interaction = SupportInteraction(
        org_id=org_id,
        channel=channel,
        direction=direction,
        from_number=from_number,
        to_number=to_number,
        payload=payload,
    )
    apply_training_mode(interaction, request)
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.post("/webhook")
async def telnyx_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    raw_body = await request.body()
    verify_telnyx_signature(raw_body, request)
    try:
        body = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        body = {}
    data = body.get("data") or {}
    payload = data.get("payload") or body.get("payload") or {}
    event_type = data.get("event_type") or body.get("event_type") or "unknown"
    org = resolve_org(db, payload)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="org_not_found")
    if not module_enabled(db, org.id):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="MODULE_DISABLED:BILLING")
    system_user = get_system_user(db, org.id)
    channel = _resolve_channel(payload, event_type)
    direction = payload.get("direction") or "inbound"
    intent, intent_evidence = TelnyxAssistant.classify_intent(payload)
    patient: Patient | None = None
    epcr_id = (payload.get("metadata") or {}).get("epcr_patient_id")
    if epcr_id:
        try:
            patient = (
                db.query(Patient)
                .filter(Patient.id == int(epcr_id), Patient.org_id == org.id)
                .first()
            )
        except (TypeError, ValueError):
            patient = None
    claim = None
    assist_snapshot = None
    if patient:
        claim = TelnyxAssistant.get_latest_claim(db, org.id, patient.id)
        assist_result = TelnyxAssistant.get_or_generate_assist_result(db, patient)
        assist_snapshot = assist_result.snapshot_json
    inbound_payload = {"event_type": event_type, "payload": payload}
    inbound_interaction = _record_interaction(
        db=db,
        request=request,
        user=system_user,
        org_id=org.id,
        channel=channel,
        direction="inbound",
        from_number=payload.get("from"),
        to_number=payload.get("to"),
        payload=inbound_payload,
    )
    audit_and_event(
        db=db,
        request=request,
        user=system_user,
        action="ingest",
        resource="support_interaction",
        classification=inbound_interaction.classification,
        after_state=model_snapshot(inbound_interaction),
        event_type="support.telnyx_message_received",
        event_payload={
            "interaction_id": inbound_interaction.id,
            "intent": intent,
            "event_type": event_type,
        },
    )
    response_template = TelnyxAssistant.build_response_template(intent, patient, claim)
    actions = TelnyxAssistant.build_actions(intent, patient, claim, assist_snapshot)
    call_script = TelnyxAssistant.build_call_script(
        patient,
        assist_snapshot,
        intent,
        intent_evidence,
    )
    outbound_payload = {
        "intent": intent,
        "response_template": response_template,
        "actions": actions,
        "call_script": call_script,
    }
    outbound_interaction = _record_interaction(
        db=db,
        request=request,
        user=system_user,
        org_id=org.id,
        channel=channel,
        direction="outbound",
        from_number=payload.get("to"),
        to_number=payload.get("from"),
        payload=outbound_payload,
    )
    audit_and_event(
        db=db,
        request=request,
        user=system_user,
        action="respond",
        resource="support_interaction",
        classification=outbound_interaction.classification,
        after_state=model_snapshot(outbound_interaction),
        event_type="support.telnyx_response_sent",
        event_payload={
            "interaction_id": outbound_interaction.id,
            "intent": intent,
        },
    )
    return {
        "status": "ok",
        "intent": intent,
        "response_template": response_template,
        "actions": actions,
        "call_script": call_script,
    }
