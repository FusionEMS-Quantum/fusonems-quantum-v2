from datetime import datetime, timezone
from typing import Dict, Any

from sqlalchemy.orm import Session

from models.epcr_core import EpcrRecord, PreArrivalNotification


class HospitalNotificationService:
    @staticmethod
    def queue_notification(db: Session, record: EpcrRecord, overrides: Dict[str, Any] | None = None) -> PreArrivalNotification:
        payload = overrides or {}
        notification = PreArrivalNotification(
            org_id=record.org_id,
            record_id=record.id,
            hospital_name=payload.get("hospital_name", record.patient_destination or "Unknown Hospital"),
            hospital_phone=payload.get("hospital_phone", ""),
            hospital_address=payload.get("hospital_address", ""),
            eta=payload.get("eta", record.hospital_arrival_datetime or datetime.now(timezone.utc)),
            eta_threshold_minutes=payload.get("eta_threshold_minutes", 15),
            disposition_element="eDisposition.24",
            metadata={"triggered_by": "finalize"},
            sent_at=datetime.now(timezone.utc),
        )
        db.add(notification)
        db.commit()
        return notification
