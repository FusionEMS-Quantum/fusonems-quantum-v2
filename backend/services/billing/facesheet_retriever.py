from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from core.config import settings
from models.epcr import Patient
from models.user import User
from services.telnyx.telnyx_service import TelnyxFaxHandler, TelnyxIVRService
from utils.time import utc_now


class FacesheetRetriever:
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self.ivr_service = TelnyxIVRService(db, org_id)
        self.fax_handler = TelnyxFaxHandler(db, org_id)

    def auto_fetch_facesheet(self, request: Request, user: User, patient: Patient) -> dict[str, Any]:
        if self._facesheet_present(patient):
            return {
                "status": "present",
                "message": "Demographics already available.",
                "patient_id": patient.id,
            }
        response = self.request_facesheet_from_facility(request, user, patient)
        return {"status": "requested", "details": response}

    def request_facesheet_from_facility(self, request: Request, user: User, patient: Patient) -> dict[str, Any]:
        payload = {
            "call_sid": f"facesheet-{patient.id}-{int(utc_now().timestamp())}",
            "from": settings.TELNYX_FROM_NUMBER or "billing@fusonems.local",
            "intent": "facesheet_request",
        }
        ai_response = self.ivr_service.route_to_ai_agent(
            transcript="Request facesheet and fax", intent="facesheet_request"
        )
        summary = self.ivr_service.record_call_summary(
            request=request,
            user=user,
            payload=payload,
            ai_response=ai_response,
            intent="facesheet_request",
            reason="auto_facesheet",
            resolution="awaiting_fax",
        )
        return {
            "summary_id": summary.id,
            "next_step": "awaiting_fax",
        }

    def parse_facesheet_ocr(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.fax_handler.extract_facesheet(payload)

    def _facesheet_present(self, patient: Patient) -> bool:
        required = ("first_name", "last_name", "date_of_birth", "address", "phone")
        return all(getattr(patient, field, None) for field in required)

    def facesheet_status(self, patient: Patient) -> dict[str, Any]:
        required = ("first_name", "last_name", "date_of_birth", "address", "phone")
        missing = [field for field in required if not getattr(patient, field)]
        return {
            "present": not missing,
            "missing_fields": missing,
            "checked_at": utc_now().isoformat(),
        }
