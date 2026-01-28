import logging
from typing import Dict, Any

from sqlalchemy.orm import Session

from models.epcr_core import EpcrRecord

logger = logging.getLogger(__name__)


class CADSyncService:
    @staticmethod
    def sync_incident(db: Session, record: EpcrRecord) -> Dict[str, Any]:
        if not record.cad_call_id:
            return {}
        logger.info("Syncing CAD incident %s for record %s", record.cad_call_id, record.id)
        return {"record_id": record.id, "cad_call_id": record.cad_call_id}
