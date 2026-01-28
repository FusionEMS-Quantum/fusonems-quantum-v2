import logging
from typing import Dict, Any

from models.epcr_core import EpcrRecord

logger = logging.getLogger(__name__)


class BillingSyncService:
    @staticmethod
    def map_to_billing(record: EpcrRecord, action: Any) -> Dict[str, Any]:
        logger.info("Mapping record %s action %s to billing codes", record.id, getattr(action, "id", ""))
        return {
            "record_id": record.id,
            "billing_action": getattr(action, "procedure_name", getattr(action, "medication_name", "unknown")),
            "mapped_codes": ["99283"],
        }
