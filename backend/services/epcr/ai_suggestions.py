import logging
import random
from typing import Dict, Any

from models.epcr_core import EpcrRecord, EpcrNarrative

logger = logging.getLogger(__name__)


class AISuggestions:
    @staticmethod
    def log_suggestion(record: EpcrRecord, narrative: EpcrNarrative) -> None:
        logger.info(
            "AI suggestion recorded for record %s: narrative %s", record.id, narrative.id
        )

    @staticmethod
    def suggest_protocol(record: EpcrRecord) -> Dict[str, Any]:
        confidence = random.uniform(0.6, 0.95)
        pathway = "general"
        if record.chief_complaint and "cardiac" in record.chief_complaint.lower():
            pathway = "ALS"
        suggestion = {"protocol_pathway": pathway, "confidence": round(confidence, 2)}
        logger.info("Protocol suggested %s", suggestion)
        return suggestion
