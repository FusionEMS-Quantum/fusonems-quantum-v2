from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.guards import require_module
from core.security import get_current_user, require_roles
from models.compliance import ForensicAuditLog
from models.epcr import Patient
from models.support import SupportMirrorEvent, SupportSession, SupportInteraction
from models.user import User, UserRole
from services.epcr.epcr_router import _map_ocr_fields
from services.mail.mail_router import MessageCreate, _send_telnyx_message
from services.telnyx.assistant import TelnyxAssistant
from utils.tenancy import get_scoped_record
from utils.write_ops import audit_and_event, model_snapshot

router = APIRouter(prefix="/api/support", tags=["Support"])

SESSION_TOKEN_HEADER = "x-support-session-token"
ALLOWED_PURPOSES = {"mirror", "workflow_replay", "ocr_troubleshoot"}
ALLOWED_EVENT_TYPES = {"screen_state", "click", "route", "error", "ocr_capture", "log_line"}
DEFAULT_TTL_MINUTES = 15
MIN_TTL_MINUTES = 5
MAX_TTL_MINUTES = 120


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


def _refresh_session_status(session: SupportSession) -> None:
    if session.status in {"ended", "expired"}:
        return
    now = datetime.now(timezone.utc)
    if session.expires_at <= now:
        session.status = "expired"
        session.ended_at = session.ended_at or now


class SupportSessionCreate(BaseModel):
    target_user_id: int | None = None
    target_device_id: str | None = None
    purpose: str = "mirror"
    expires_minutes: int | None = None
    consent_required: bool | None = None
    note: str | None = None


class ConsentRequest(BaseModel):
    phone: str | None = None
    message: str | None = None


class ConsentDecision(BaseModel):
    approved: bool


class SupportEventPayload(BaseModel):
    event_type: str
    payload: dict[str, Any]


class SupportSmsRequest(BaseModel):
    recipient: str
    body: str
    epcr_patient_id: int | None = None


class CallAssistRequest(BaseModel):
    epcr_patient_id: int
    reason: str | None = None


def _require_support_user(user: User = Depends(require_roles(UserRole.ops_admin, UserRole.support))) -> User:
    return user


def _require_billing_ops_or_founder(
    user: User = Depends(require_roles(UserRole.ops_admin, UserRole.founder)),
    _: User = Depends(require_module("BILLING")),
) -> User:
    return user


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SupportSessionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_support_user),
):
    if not payload.target_user_id and not payload.target_device_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Target is required")
    if payload.purpose not in ALLOWED_PURPOSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported purpose")
    target_user = None
    if payload.target_user_id:
        target_user = db.query(User).filter(User.id == payload.target_user_id).first()
        if not target_user or target_user.org_id != user.org_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Target user not found")
    expires_minutes = payload.expires_minutes or DEFAULT_TTL_MINUTES
    expires_minutes = max(MIN_TTL_MINUTES, min(MAX_TTL_MINUTES, expires_minutes))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    consent_required = payload.consent_required if payload.consent_required is not None else payload.purpose == "mirror"
    status_value = "pending" if consent_required else "active"
    consent_token = _generate_token()
    session_token = _generate_token()
    session = SupportSession(
        org_id=user.org_id,
        created_by_user_id=user.id,
        target_user_id=payload.target_user_id,
        target_device_id=payload.target_device_id,
        purpose=payload.purpose,
        consent_required=consent_required,
        status=status_value,
        expires_at=expires_at,
        consent_token_hash=_hash_token(consent_token),
        session_token_hash=_hash_token(session_token),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="support_session",
        classification="OPS",
        after_state=model_snapshot(session),
        event_type="support.session.created",
        event_payload={
            "session_id": session.id,
            "purpose": session.purpose,
            "consent_required": session.consent_required,
        },
    )
    return {
        "session_id": session.id,
        "status": session.status,
        "expires_at": session.expires_at.isoformat(),
        "session_token": session_token,
        "consent_token": consent_token,
    }


def _get_session(db: Session, request: Request, session_id: int, user: User) -> SupportSession:
    session = get_scoped_record(
        db,
        request,
        SupportSession,
        session_id,
        user,
        resource_label="support_session",
    )
    _refresh_session_status(session)
    if session.status == "expired":
        db.commit()
    db.commit()
    return session


def _verify_session_token(session: SupportSession, token: str) -> bool:
    if not token:
        return False
    return _hash_token(token) == session.session_token_hash


@router.post("/sessions/{session_id}/request_consent")
def request_consent(
    session_id: int,
    payload: ConsentRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_support_user),
):
    session = _get_session(db, request, session_id, user)
    if session.consent_required and not session.target_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing target user for consent")
    sent = False
    if payload.phone:
        try:
            message_text = payload.message or f"Support session {session.id} needs your consent."
            message = MessageCreate(channel="sms", recipient=payload.phone, body=message_text)
            _send_telnyx_message(message)
            sent = True
        except HTTPException:
            sent = False
    session.consent_requested_at = datetime.now(timezone.utc)
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="request_consent",
        resource="support_session",
        classification="OPS",
        after_state={"session_id": session.id},
        event_type="support.session.consent_requested",
        event_payload={"session_id": session.id, "sent": sent},
    )
    return {"status": "consent_requested", "sent": sent}


@router.post("/sessions/{session_id}/consent")
def consent_session(
    session_id: int,
    payload: ConsentDecision,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = get_scoped_record(
        db,
        request,
        SupportSession,
        session_id,
        user,
        resource_label="support_session",
    )
    _refresh_session_status(session)
    if session.status in {"expired", "ended"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session inactive")
    if not session.target_user_id or session.target_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the targeted user")
    now = datetime.now(timezone.utc)
    session.consented_at = now
    if payload.approved:
        session.status = "active"
    else:
        session.status = "ended"
        session.ended_at = now
    db.commit()
    event_type = "support.session.consent_granted" if payload.approved else "support.session.consent_denied"
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="consent",
        resource="support_session",
        classification="OPS",
        after_state={"session_id": session.id, "status": session.status},
        event_type=f"support.session.{event_type}",
        event_payload={"session_id": session.id, "approved": payload.approved},
    )
    return {"status": session.status}


@router.post("/sessions/{session_id}/events")
def append_event(
    session_id: int,
    payload: SupportEventPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    session = (
        db.query(SupportSession)
        .filter(SupportSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _refresh_session_status(session)
    if session.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not active")
    token = request.headers.get(SESSION_TOKEN_HEADER, "")
    if not _verify_session_token(session, token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing session token")
    if payload.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported event type")
    event = SupportMirrorEvent(
        support_session_id=session.id,
        event_type=payload.event_type,
        payload_json=payload.payload,
    )
    db.add(event)
    db.commit()
    actor = db.query(User).filter(User.id == session.created_by_user_id).first()
    if not actor:
        actor = User(
            org_id=session.org_id,
            email="system@fusionems.local",
            full_name="System Support",
            role=UserRole.ops_admin.value,
        )
    audit_and_event(
        db=db,
        request=request,
        user=actor,
        action="append_event",
        resource="support_session_event",
        classification="OPS",
        after_state={"event_id": event.id, "session_id": session.id},
        event_type="support.session.event.logged",
        event_payload={"session_id": session.id, "event_type": payload.event_type},
    )
    return {"status": "event_recorded", "event_id": event.id}


@router.get("/sessions/{session_id}/events")
def list_events(
    session_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_support_user),
):
    session = _get_session(db, request, session_id, user)
    events = (
        db.query(SupportMirrorEvent)
        .filter(SupportMirrorEvent.support_session_id == session.id)
        .order_by(SupportMirrorEvent.created_at.asc())
        .all()
    )
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="read_events",
        resource="support_session_event",
        classification="OPS",
        after_state={"session_id": session.id, "event_count": len(events)},
        event_type="support.session.events.read",
        event_payload={"session_id": session.id},
    )
    return {
        "session_id": session.id,
        "status": session.status,
        "expires_at": session.expires_at.isoformat(),
        "events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "payload": event.payload_json,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in events
        ],
    }


@router.post("/sessions/{session_id}/end")
def end_session(
    session_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_support_user),
):
    session = _get_session(db, request, session_id, user)
    session.status = "ended"
    session.ended_at = datetime.now(timezone.utc)
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="end",
        resource="support_session",
        classification="OPS",
        after_state={"session_id": session.id},
        event_type="support.session.ended",
        event_payload={"session_id": session.id},
    )
    return {"status": "ended"}


@router.post("/sms/send")
def send_support_sms(
    payload: SupportSmsRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_billing_ops_or_founder),
):
    message_payload = MessageCreate(channel="sms", recipient=payload.recipient, body=payload.body)
    telnyx_id = _send_telnyx_message(message_payload)
    interaction = SupportInteraction(
        org_id=user.org_id,
        channel="sms",
        direction="outbound",
        from_number=settings.TELNYX_FROM_NUMBER or settings.TELNYX_NUMBER,
        to_number=payload.recipient,
        payload={
            "body": payload.body,
            "epcr_patient_id": payload.epcr_patient_id,
            "telnyx_id": telnyx_id,
        },
    )
    apply_training_mode(interaction, request)
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="send",
        resource="support_interaction",
        classification=interaction.classification,
        after_state=model_snapshot(interaction),
        event_type="support.telnyx_response_sent",
        event_payload={
            "interaction_id": interaction.id,
            "patient_id": payload.epcr_patient_id,
            "telnyx_id": telnyx_id,
        },
    )
    return {"status": "sent", "telnyx_id": telnyx_id}


@router.post("/call/assist")
def call_assist(
    payload: CallAssistRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_billing_ops_or_founder),
):
    patient = get_scoped_record(
        db,
        request,
        Patient,
        payload.epcr_patient_id,
        user,
        resource_label="epcr",
    )
    assist_result = TelnyxAssistant.get_or_generate_assist_result(db, patient)
    claim = TelnyxAssistant.get_latest_claim(db, user.org_id, patient.id)
    intent = "call_assist"
    intent_evidence = [
        {
            "field": "support.call_assist.reason",
            "value": payload.reason or "manual_support_request",
        }
    ]
    script = TelnyxAssistant.build_call_script(
        patient,
        assist_result.snapshot_json,
        intent,
        intent_evidence,
    )
    actions = TelnyxAssistant.build_actions(intent, patient, claim, assist_result.snapshot_json)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="generate",
        resource="support_call_assist",
        classification="OPS",
        after_state=model_snapshot(assist_result),
        event_type="support.call_assist.generated",
        event_payload={
            "patient_id": patient.id,
            "assist_id": assist_result.id,
        },
    )
    return {
        "call_script": script,
        "actions": actions,
        "assist_snapshot": assist_result.snapshot_json,
    }


@router.get("/ocr/{epcr_patient_id}/summary")
def ocr_summary(
    epcr_patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_support_user),
):
    patient = get_scoped_record(
        db,
        request,
        Patient,
        epcr_patient_id,
        user,
        resource_label="epcr",
    )
    snapshots = patient.ocr_snapshots or []
    evidence_links: set[str] = set()
    snapshot_rows: list[dict[str, Any]] = []
    review_history: list[dict[str, Any]] = []
    for idx, snapshot in enumerate(snapshots):
        fields = snapshot.get("fields") or []
        parsed_fields = []
        for field in fields:
            parsed_fields.append(
                {
                    "field": field.get("field"),
                    "value": field.get("value"),
                    "confidence": field.get("confidence"),
                    "evidence_hash": field.get("evidence_hash"),
                }
            )
            evidence_hash = field.get("evidence_hash")
            if evidence_hash:
                evidence_links.add(evidence_hash)
        snapshot_rows.append(
            {
                "snapshot_id": idx,
                "device_type": snapshot.get("device_type") or "unknown",
                "requires_review": snapshot.get("requires_review", False),
                "unknown_fields": snapshot.get("unknown_fields", []),
                "parsed_fields": parsed_fields,
            }
        )
        if snapshot.get("requires_review"):
            review_history.append(
                {
                    "snapshot_id": idx,
                    "unknown_fields": snapshot.get("unknown_fields", []),
                }
            )
    override_entries = (
        db.query(ForensicAuditLog)
        .filter(
            ForensicAuditLog.org_id == patient.org_id,
            ForensicAuditLog.resource == "epcr_patient",
            ForensicAuditLog.action.ilike("%ocr%"),
        )
        .order_by(ForensicAuditLog.created_at.desc())
        .limit(10)
        .all()
    )
    override_history = [
        {
            "id": entry.id,
            "action": entry.action,
            "reason_code": entry.reason_code,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        }
        for entry in override_entries
    ]
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="read",
        resource="support_ocr_summary",
        classification="OPS",
        after_state={"patient_id": patient.id},
        event_type="support.ocr.summary.viewed",
        event_payload={"patient_id": patient.id},
    )
    return {
        "patient_id": patient.id,
        "incident_number": patient.incident_number,
        "snapshots": snapshot_rows,
        "review_history": review_history,
        "override_history": override_history,
        "evidence_links": list(evidence_links),
    }


@router.post("/ocr/{epcr_patient_id}/reprocess")
def ocr_reprocess(
    epcr_patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(_require_support_user),
):
    patient = get_scoped_record(
        db,
        request,
        Patient,
        epcr_patient_id,
        user,
        resource_label="epcr",
    )
    snapshots = patient.ocr_snapshots or []
    if not snapshots:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No OCR data to reprocess")
    before_state = model_snapshot(patient)
    patient.vitals = {}
    patient.medications = []
    patient.procedures = []
    patient.cct_interventions = []
    for snapshot in snapshots:
        fields = snapshot.get("fields") or []
        _map_ocr_fields(patient, fields)
    db.commit()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="reprocess",
        resource="ocr",
        classification="OPS",
        before_state=before_state,
        after_state=model_snapshot(patient),
        event_type="ocr.reprocessed",
        event_payload={"patient_id": patient.id, "snapshots": len(snapshots)},
    )
    return {"status": "reprocessed", "patient_id": patient.id, "snapshots": len(snapshots)}
