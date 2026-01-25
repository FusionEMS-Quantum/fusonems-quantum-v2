import logging
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class NarrativeGenerationSource(str, Enum):
    VOICE_TRANSCRIPTION = "voice_transcription"
    STRUCTURED_FIELDS = "structured_fields"
    TIMELINE_SYNTHESIS = "timeline_synthesis"
    TEMPLATE_BASED = "template_based"
    MANUAL = "manual"


class NarrativeGenerator:
    @staticmethod
    def generate_from_voice_transcription(
        transcript: str,
        patient_data: Dict[str, Any],
        protocol: Optional[str] = None,
    ) -> str:
        """
        Transform raw voice transcript into structured SOAP narrative.
        Prompt: Extract clinical information from paramedic speech; format as SOAP note.
        """
        prompt = f"""
        You are an EMS documentation assistant. Transform the paramedic's voice transcript below into a clear, 
        clinically accurate SOAP narrative (Subjective, Objective, Assessment, Plan) for the ePCR.
        
        Patient: {patient_data.get('first_name')} {patient_data.get('last_name')}, {patient_data.get('age')} y/o
        Protocol: {protocol or 'General'}
        
        Voice Transcript:
        {transcript}
        
        Output format:
        SUBJECTIVE:
        [Patient's complaint, history, relevant background]
        
        OBJECTIVE:
        [Vital signs, physical exam findings, assessment findings]
        
        ASSESSMENT:
        [Working diagnosis/impression based on findings]
        
        PLAN:
        [Treatment provided, transport decision, destination]
        
        Narrative (brief clinical summary for hospital handoff):
        [1-2 paragraph summary]
        """
        
        narrative = NarrativeGenerator._call_llm(prompt)
        return narrative

    @staticmethod
    def generate_from_structured_fields(
        patient_data: Dict[str, Any],
        vitals: Dict[str, Any],
        medications: List[Dict[str, Any]],
        procedures: List[Dict[str, Any]],
        assessment: str,
    ) -> str:
        """
        Generate SOAP narrative from structured ePCR fields (no voice needed).
        Use template + field values to create narrative.
        """
        medications_str = "; ".join([
            f"{med.get('name', 'Unknown')} {med.get('dose', '')} {med.get('route', '')}"
            for med in medications
        ])
        
        procedures_str = "; ".join([
            f"{proc.get('name', 'Unknown')} at {proc.get('time', '')}"
            for proc in procedures
        ])
        
        template = f"""
        SUBJECTIVE:
        {patient_data.get('chief_complaint', 'Chief complaint not documented')}
        
        OBJECTIVE:
        Vitals: BP {vitals.get('bp', '')}, HR {vitals.get('hr', '')}, RR {vitals.get('rr', '')}, O2 {vitals.get('o2_sat', '')}%
        Medications administered: {medications_str or 'None'}
        Procedures: {procedures_str or 'None'}
        
        ASSESSMENT:
        {assessment}
        
        PLAN:
        Patient transported to hospital with ongoing monitoring.
        """
        
        return template.strip()

    @staticmethod
    def generate_timeline_synthesis(
        events: List[Dict[str, Any]],
        patient_data: Dict[str, Any],
    ) -> str:
        """
        Create narrative by synthesizing all timeline events (dispatch, on-scene, treatments, transport, arrival).
        """
        timeline_str = "\n".join([
            f"[{event.get('timestamp')}] {event.get('description')}"
            for event in sorted(events, key=lambda e: e.get('timestamp', ''))
        ])
        
        prompt = f"""
        Create a chronological clinical narrative from the EMS run timeline below. 
        Summarize key events, findings, and interventions in a concise SOAP format.
        
        Patient: {patient_data.get('first_name')} {patient_data.get('last_name')}
        
        Timeline:
        {timeline_str}
        
        Generate a cohesive narrative (2-3 paragraphs) suitable for hospital handoff.
        """
        
        narrative = NarrativeGenerator._call_llm(prompt)
        return narrative

    @staticmethod
    def _call_llm(prompt: str) -> str:
        """
        Call GPT-4 (or configurable LLM) for narrative generation.
        Production: Call OpenAI API
        Testing: Return mock narrative
        """
        try:
            import openai
            from core.config import settings
            
            if not settings.OPENAI_API_KEY:
                logger.warning("OPENAI_API_KEY not set, returning template narrative")
                return "Narrative generation not available. Please manually document findings and plan."
            
            openai.api_key = settings.OPENAI_API_KEY
            
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an EMS documentation specialist."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            logger.error(f"LLM call failed: {e}, returning template")
            return "Unable to generate narrative. Please review and edit manually."

    @staticmethod
    def apply_clinician_edits(
        generated_narrative: str,
        clinician_narrative: str,
        db: Session = None,
        epcr_patient_id: int = None,
        user_id: int = None,
    ) -> Dict[str, Any]:
        """
        Track clinician edits to AI-generated narrative.
        Return diff metadata for audit trail.
        """
        diff_metadata = {
            "original_generated": generated_narrative,
            "clinician_edited": clinician_narrative,
            "edit_timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "changes_made": generated_narrative != clinician_narrative,
        }
        
        if db and epcr_patient_id:
            from models.epcr import NarrativeVersion
            
            version = NarrativeVersion(
                epcr_patient_id=epcr_patient_id,
                version_number=1,
                narrative_text=clinician_narrative,
                generation_source="manual_edit_ai_generated",
                generation_metadata=diff_metadata,
                author_id=user_id,
                is_current=True,
            )
            db.add(version)
            db.commit()
        
        return diff_metadata
