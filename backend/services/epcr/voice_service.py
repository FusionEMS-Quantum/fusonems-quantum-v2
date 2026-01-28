import logging
from typing import Dict, Any, Optional

from models.epcr import Patient
from models.epcr_core import EpcrNarrative
from .narrative_generator import NarrativeGenerator

logger = logging.getLogger(__name__)


class VoiceService:
    @staticmethod
    def refine_transcription(transcription: str, patient: Optional[Patient]) -> str:
        if not transcription:
            return ""
        refined = transcription.strip()
        if patient:
            refined = f"Patient {patient.first_name} {patient.last_name}: {refined}"
        return refined

    @staticmethod
    def generate_narrative_from_voice(transcription: str, patient: Optional[Patient], structured_data: Dict[str, Any]) -> str:
        patient_data = {
            "first_name": patient.first_name if patient else "",
            "last_name": patient.last_name if patient else "",
            "chief_complaint": structured_data.get("chief_complaint", ""),
        }
        narrative = NarrativeGenerator.generate_from_voice_transcription(
            transcript=transcription,
            patient_data=patient_data,
            protocol=structured_data.get("protocol"),
        )
        return narrative

    @staticmethod
    def persist_voice_session(payload: Dict[str, Any]) -> None:
        logger.info("Voice transcription stored: %s", payload)

    @staticmethod
    def summarize_voice_insights(narrative: EpcrNarrative) -> Dict[str, Any]:
        return {"summary": narrative.narrative_text[:200]}
