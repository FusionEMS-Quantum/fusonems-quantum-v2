from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.epcr_core import OfflineSyncQueue, EpcrRecord


class OfflineSyncManager:
    @staticmethod
    def queue_record(db: Session, record: EpcrRecord) -> None:
        payload = {"record_id": record.id, "incident_number": record.incident_number}
        entry = OfflineSyncQueue(
            org_id=record.org_id,
            record_id=record.id,
            payload=payload,
            status="queued",
            encrypted_payload="",
        )
        db.add(entry)
        db.commit()

    @staticmethod
    def mark_synced(db: Session, record_id: int) -> None:
        entry = (
            db.query(OfflineSyncQueue)
            .filter(OfflineSyncQueue.record_id == record_id)
            .order_by(OfflineSyncQueue.created_at.desc())
            .first()
        )
        if entry:
            entry.status = "synced"
            entry.updated_at = datetime.now(timezone.utc)
            db.commit()
