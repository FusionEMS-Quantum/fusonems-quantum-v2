import re
from typing import Any, Dict, List, Optional
from datetime import datetime

def extract_facesheet(text: str) -> Dict[str, Any]:
    # Deterministic regex extraction for facesheet
    fields = {}
    confidence = {}
    evidence = []
    warnings = []
    # Example regexes (expand as needed)
    m = re.search(r"Patient Name[:\s]+([A-Za-z ,.'-]+)", text)
    if m:
        fields['patient_name'] = m.group(1).strip()
        confidence['patient_name'] = 0.95
        evidence.append({'field': 'patient_name', 'source': m.group(0)})
    else:
        warnings.append('Patient name not found')
        confidence['patient_name'] = 0.0
    # ...repeat for dob, mrn, insurance, etc...
    return fields, confidence, evidence, warnings

def extract_pcs(text: str) -> Dict[str, Any]:
    # Deterministic regex extraction for PCS
    fields = {}
    confidence = {}
    evidence = []
    warnings = []
    # Example: physician name
    m = re.search(r"Physician Name[:\s]+([A-Za-z ,.'-]+)", text)
    if m:
        fields['physician_name'] = m.group(1).strip()
        confidence['physician_name'] = 0.9
        evidence.append({'field': 'physician_name', 'source': m.group(0)})
    else:
        warnings.append('Physician name not found')
        confidence['physician_name'] = 0.0
    # ...repeat for other fields...
    return fields, confidence, evidence, warnings

def extract_aob_abd(text: str) -> Dict[str, Any]:
    # Deterministic regex extraction for AOB/ABD
    fields = {}
    confidence = {}
    evidence = []
    warnings = []
    # Example: signature present
    m = re.search(r"Signature[:\s]+([A-Za-z ,.'-]+)", text)
    if m:
        fields['signature'] = m.group(1).strip()
        confidence['signature'] = 0.8
        evidence.append({'field': 'signature', 'source': m.group(0)})
    else:
        warnings.append('Signature not found')
        confidence['signature'] = 0.0
    return fields, confidence, evidence, warnings

def extract_document(doc_type: str, text: str) -> Dict[str, Any]:
    if doc_type == 'FACESHEET':
        return extract_facesheet(text)
    elif doc_type == 'PCS':
        return extract_pcs(text)
    elif doc_type in ('AOB', 'ABD'):
        return extract_aob_abd(text)
    else:
        return {}, {}, [], ['Unknown doc_type']

# AI refinement stub (to be implemented if SUPPORT_AI_ENABLED)
def ai_refine_extraction(doc_type: str, fields: dict, text: str) -> Optional[dict]:
    # Call Ollama/self-hosted AI if enabled, else return None
    return None
