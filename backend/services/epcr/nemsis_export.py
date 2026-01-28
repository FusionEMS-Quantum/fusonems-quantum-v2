import logging
from typing import Dict, Any

from models.epcr_core import EpcrRecord

logger = logging.getLogger(__name__)


class NEMSISExporter:
    @staticmethod
    def export_record_to_nemsis(record: EpcrRecord) -> Dict[str, Any]:
        disposition_ts = record.hospital_arrival_datetime.isoformat() if record.hospital_arrival_datetime else None
        payload = {
            "record_id": record.id,
            "nemsis_version": record.nemsis_version,
            "state": record.nemsis_state,
            "patient_id": record.patient_id,
            "incident_number": record.incident_number,
            "eDisposition.24": disposition_ts,
            "protocol_pathway": record.protocol_pathway_id,
        }
        logger.info("NEMSIS export payload prepared: %s", payload)
        return payload
