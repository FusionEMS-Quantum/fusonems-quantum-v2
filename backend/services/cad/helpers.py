from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from models.cad import CADIncident, CADIncidentTimeline, CrewLinkPage
from utils.tenancy import get_scoped_record
from models.mdt import MdtCadSyncEvent
from models.user import User
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot


def record_mdt_sync_event(
    *,
    db: Session,
    request: Request | None,
    user: User,
    incident: CADIncident | None,
    event_type: str,
    payload: dict[str, Any],
    unit_id: int | None = None,
) -> MdtCadSyncEvent:
    record = MdtCadSyncEvent(
        org_id=user.org_id,
        direction="cad_to_mdt",
        event_type=event_type,
        call_id=None,
        dispatch_id=None,
        unit_id=unit_id,
        payload={
            **payload,
            **({"incident_id": incident.id} if incident is not None else {}),
        },
    )
    apply_training_mode(record, request)
    db.add(record)
    db.flush()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="mdt_cad_sync_event",
        classification=incident.classification if incident else "OPS",
        after_state=model_snapshot(record),
        event_type="mdt.cad.sync",
        event_payload={
            **payload,
            **({"incident_id": incident.id} if incident is not None else {}),
        },
    )
    return record


def create_crewlink_page(
    *,
    db: Session,
    request: Request | None,
    user: User,
    incident: CADIncident,
    event_type: str,
    title: str,
    message: str,
    payload: dict[str, Any],
) -> CrewLinkPage:
    page = CrewLinkPage(
        org_id=user.org_id,
        cad_incident_id=incident.id,
        event_type=event_type,
        title=title,
        message=message,
        payload=payload,
    )
    apply_training_mode(page, request)
    db.add(page)
    db.flush()
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="crewlink_page",
        classification=incident.classification,
        after_state=model_snapshot(page),
        event_type="crewlink.page",
        event_payload={"incident_id": incident.id, "crewlink_event": event_type},
    )
    return page


def record_cad_timeline_event(
    *,
    db: Session,
    request: Request | None,
    user: User,
    cad_incident_id: int,
    status: str,
    notes: str,
    payload: dict[str, Any] | None = None,
) -> CADIncidentTimeline:
    incident = get_scoped_record(
        db,
        request,
        CADIncident,
        cad_incident_id,
        user,
        resource_label="cad_incident",
    )
    entry = CADIncidentTimeline(
        org_id=user.org_id,
        incident_id=incident.id,
        status=status,
        notes=notes,
        payload=payload or {},
    )
    apply_training_mode(entry, request)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="cad_incident_timeline",
        classification=incident.classification,
        after_state=model_snapshot(entry),
        event_type="cad.incident.timeline.added",
        event_payload={"incident_id": incident.id, "status": status},
    )
    return entry
