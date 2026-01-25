from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from models.billing import PriorAuthRequest
from models.user import User
from utils.time import utc_now
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot


ACTIVE_STATUSES = {"approved", "requested"}


class PriorAuthService:
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def request_prior_auth(self, request: Request, user: User, payload: dict[str, Any]) -> PriorAuthRequest:
        auth = PriorAuthRequest(
            org_id=self.org_id,
            epcr_patient_id=payload["epcr_patient_id"],
            payer_id=payload.get("payer_id"),
            procedure_code=payload["procedure_code"],
            auth_number=payload["auth_number"],
            expiration_date=payload.get("expiration_date"),
            status=payload.get("status", "requested"),
            notes=payload.get("notes", ""),
            payload=payload.get("payload", {}),
        )
        apply_training_mode(auth, request)
        self.db.add(auth)
        self.db.commit()
        self.db.refresh(auth)
        audit_and_event(
            db=self.db,
            request=request,
            user=user,
            action="create",
            resource="prior_auth_request",
            classification=auth.classification,
            after_state=model_snapshot(auth),
            event_type="billing.prior_auth.requested",
            event_payload={"auth_id": auth.id, "patient_id": auth.epcr_patient_id},
        )
        return auth

    def track_expiration(self, days: int = 14) -> list[PriorAuthRequest]:
        now = utc_now()
        cutoff = now + timedelta(days=days)
        return (
            self.db.query(PriorAuthRequest)
            .filter(
                PriorAuthRequest.org_id == self.org_id,
                PriorAuthRequest.status.in_(ACTIVE_STATUSES),
                PriorAuthRequest.expiration_date != None,  # noqa: E711
                PriorAuthRequest.expiration_date <= cutoff,
            )
            .all()
        )

    def verify_auth(self, epcr_patient_id: int, procedure_code: str) -> bool:
        now = utc_now()
        record = (
            self.db.query(PriorAuthRequest)
            .filter(
                PriorAuthRequest.org_id == self.org_id,
                PriorAuthRequest.epcr_patient_id == epcr_patient_id,
                PriorAuthRequest.procedure_code == procedure_code,
                PriorAuthRequest.status == "approved",
            )
            .order_by(PriorAuthRequest.expiration_date.desc())
            .first()
        )
        return bool(record and (record.expiration_date is None or record.expiration_date >= now))

    def update_status(self, request: Request, user: User, auth_id: int, status: str) -> PriorAuthRequest:
        record = (
            self.db.query(PriorAuthRequest)
            .filter(PriorAuthRequest.org_id == self.org_id, PriorAuthRequest.id == auth_id)
            .first()
        )
        if not record:
            raise ValueError("auth_not_found")
        before = model_snapshot(record)
        record.status = status
        self.db.commit()
        self.db.refresh(record)
        audit_and_event(
            db=self.db,
            request=request,
            user=user,
            action="update",
            resource="prior_auth_request",
            classification=record.classification,
            before_state=before,
            after_state=model_snapshot(record),
            event_type="billing.prior_auth.updated",
            event_payload={"auth_id": record.id, "status": status},
        )
        return record
