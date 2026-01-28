from datetime import datetime, timezone
from typing import Dict, Any

from sqlalchemy.orm import Session

from models.epcr_core import EpcrOcrSnapshot, EpcrRecord


class OCRService:
    @staticmethod
    def ingest_snapshot(db: Session, record: EpcrRecord, payload: Dict[str, Any]) -> EpcrOcrSnapshot:
        entry = EpcrOcrSnapshot(
            org_id=record.org_id,
            record_id=record.id,
            device_type=payload.get("device_type", "unknown"),
            device_name=payload.get("device_name", ""),
            confidence=int(payload.get("confidence", 0)),
            captured_at=payload.get("captured_at", datetime.now(timezone.utc)),
            raw_text=payload.get("raw_text", ""),
            fields=payload.get("fields", {}),
            metadata=payload.get("metadata", {}),
        )
        db.add(entry)
        db.commit()
        return entry

    @staticmethod
    def requires_confirmation(confidence: float, threshold: float = 0.8) -> bool:
        return confidence < threshold
