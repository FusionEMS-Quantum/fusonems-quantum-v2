from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.database import get_db, get_telehealth_db
from core.guards import require_module
from core.security import require_roles
from models.exports import CarefusionExportSnapshot
from models.telehealth import (
    TelehealthMessage,
    TelehealthParticipant,
    TelehealthSession,
)
from models.user import User, UserRole
from utils.tenancy import get_scoped_record, scoped_query
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot

router = APIRouter(
    prefix="/api/exports",
    tags=["Exports"],
    dependencies=[Depends(require_module("EXPORTS"))],
)


def _build_participants(participants: list[TelehealthParticipant]) -> list[dict[str, Any]]:
    return [
        {
            "name": participant.name,
            "role": participant.role,
            "joined_at": participant.joined_at.isoformat() if participant.joined_at else None,
        }
        for participant in sorted(
            participants, key=lambda entry: entry.joined_at or datetime.min.replace(tzinfo=timezone.utc)
        )
    ]


def _build_messages(messages: list[TelehealthMessage]) -> list[dict[str, Any]]:
    return [
        {
            "sender": message.sender,
            "message": message.message,
            "created_at": message.created_at.isoformat() if message.created_at else None,
        }
        for message in sorted(
            messages, key=lambda entry: entry.created_at or datetime.min.replace(tzinfo=timezone.utc)
        )
    ]


def _build_carefusion_snapshot(
    session: TelehealthSession,
    participants: list[TelehealthParticipant],
    messages: list[TelehealthMessage],
) -> dict[str, Any]:
    return {
        "session": {
            "session_uuid": session.session_uuid,
            "title": session.title,
            "host_name": session.host_name,
            "access_code": session.access_code,
            "status": session.status,
            "modality": session.modality,
            "recording_enabled": session.recording_enabled,
            "consent_required": session.consent_required,
            "consent_captured_at": session.consent_captured_at.isoformat()
            if session.consent_captured_at
            else None,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        },
        "participants": _build_participants(participants),
        "messages": _build_messages(messages),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/carefusion/{session_uuid}")
def export_carefusion_packet(
    session_uuid: str,
    request: Request,
    tele_db: Session = Depends(get_telehealth_db),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.billing, UserRole.ops_admin)),
    _: User = Depends(require_module("BILLING")),
):
    session = get_scoped_record(
        tele_db,
        request,
        TelehealthSession,
        session_uuid,
        user,
        id_field="session_uuid",
        resource_label="telehealth",
    )
    if session.status != "Ended":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "session_not_ready", "status": session.status},
        )
    participants = (
        scoped_query(tele_db, TelehealthParticipant, user.org_id, request.state.training_mode)
        .filter(TelehealthParticipant.session_uuid == session_uuid)
        .all()
    )
    messages = (
        scoped_query(tele_db, TelehealthMessage, user.org_id, request.state.training_mode)
        .filter(TelehealthMessage.session_uuid == session_uuid)
        .all()
    )
    snapshot_payload = _build_carefusion_snapshot(session, participants, messages)
    snapshot = CarefusionExportSnapshot(
        org_id=user.org_id,
        telehealth_session_uuid=session_uuid,
        payload=snapshot_payload,
    )
    apply_training_mode(snapshot, request)
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="export",
        resource="carefusion_export_snapshot",
        classification=snapshot.classification,
        after_state=model_snapshot(snapshot),
        event_type="carefusion.export.generated",
        event_payload={
            "snapshot_id": snapshot.id,
            "session_uuid": session_uuid,
        },
    )
    return {"status": "ok", "export": snapshot_payload, "snapshot_id": snapshot.id}
