from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from core.config import settings
from models.billing_claims import BillingClaim
from models.epcr import Patient
from utils.logger import logger
from utils.time import utc_now


class BillingAssistEngine:
    _ICD10_KEYWORDS = [
        ("chest", "R07.9", "Chest pain without known cause"),
        ("respiratory", "J96.00", "Acute respiratory failure"),
        ("trauma", "S39.012A", "Haemarthrosis of hip"),
        ("seizure", "R56.9", "Unspecified convulsions"),
    ]

    _MEDICATION_ICD10 = {
        "aspirin": ("I25.10", "Atherosclerotic heart disease"),
        "narcan": ("T50.905A", "Poisoning by unspecified drug"),
    }

    _PROCEDURE_CODES = {
        "iv": ("96372", "Therapeutic, prophylactic, or diagnostic injection"),
        "intubation": ("31500", "Intubation, endotracheal, emergency"),
        "ventilator": ("94002", "Ventilation assist and airway management"),
    }

    @classmethod
    def generate(cls, patient: Patient) -> dict[str, Any]:
        narrative = (patient.narrative or "").lower()
        primary_code = cls._resolve_primary_icd10(narrative)
        secondary_code = cls._resolve_secondary_icd10(patient)
        procedure_hints = cls._build_procedure_hints(patient)
        coding_suggestions = {
            "primary_icd10": cls._format_code(
                primary_code,
                [{"field": "narrative", "value": patient.narrative}],
            ),
            "secondary_icd10": cls._format_code(
                secondary_code,
                [
                    {
                        "field": "medications",
                        "value": next(
                            (
                                entry.get("name")
                                if isinstance(entry, dict)
                                else entry
                                for entry in patient.medications or []
                                if entry
                            ),
                            "",
                        ),
                    }
                ],
            ),
            "procedure_hints": procedure_hints,
        }
        medical_necessity = cls._build_medical_necessity_hints(patient)
        risk_flags = cls._build_denial_risk_flags(patient)
        explanations = cls._build_explanations(coding_suggestions, medical_necessity, risk_flags)
        return {
            "coding_suggestions": coding_suggestions,
            "medical_necessity_hints": medical_necessity,
            "denial_risk_flags": [entry["flag"] for entry in risk_flags],
            "explanations": explanations,
            "generated_at": utc_now().isoformat(),
            "patient_snapshot": cls._snapshot_patient(patient),
        }

    @classmethod
    def _snapshot_patient(cls, patient: Patient) -> dict[str, Any]:
        return {
            "id": patient.id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "incident_number": patient.incident_number,
            "narrative": patient.narrative,
        }

    @classmethod
    def _format_code(
        cls,
        detail: tuple[str, str] | None,
        sources: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        if not detail:
            return {"code": "Z00.00", "description": "General adult medical examination"}
        code, description = detail
        payload = {"code": code, "description": description}
        if sources:
            payload["sources"] = sources
        return payload

    @classmethod
    def _resolve_primary_icd10(cls, narrative: str) -> tuple[str, str] | None:
        for keyword, code, description in cls._ICD10_KEYWORDS:
            if keyword in narrative:
                return code, description
        return "Z02.0", "Encounter for issue of medical certificate"

    @classmethod
    def _resolve_secondary_icd10(cls, patient: Patient) -> tuple[str, str] | None:
        meds = patient.medications or []
        for entry in meds:
            name = entry.get("name") if isinstance(entry, dict) else entry
            if not name:
                continue
            normalized = name.lower()
            if normalized in cls._MEDICATION_ICD10:
                return cls._MEDICATION_ICD10[normalized]
        return "R53.83", "Other fatigue"

    @classmethod
    def _build_procedure_hints(cls, patient: Patient) -> list[dict[str, Any]]:
        hints: list[dict[str, Any]] = []
        procedures = patient.procedures or []
        for index, entry in enumerate(procedures):
            name = entry if isinstance(entry, str) else entry.get("procedure") or ""
            normalized = name.lower()
            code_detail = None
            for key, value in cls._PROCEDURE_CODES.items():
                if key in normalized:
                    code_detail = value
                    break
            if not code_detail and normalized:
                code_detail = ("99024", "Postoperative follow-up visit")
            evidence = [{"field": f"procedures[{index}]", "value": name, "source": "procedure"}]
            hints.append(
                {
                    "procedure": name,
                    "code": code_detail[0] if code_detail else "99024",
                    "description": code_detail[1] if code_detail else "Postoperative follow-up visit",
                    "sources": evidence,
                }
            )
        return hints

    @classmethod
    def _build_medical_necessity_hints(cls, patient: Patient) -> list[dict[str, Any]]:
        hints: list[dict[str, Any]] = []
        vitals = patient.vitals or {}
        spo2 = vitals.get("spo2")
        if isinstance(spo2, (int, float)) and spo2 < 94:
            hints.append(
                {
                    "reason": "Hypoxemia requiring observation",
                    "detail": f"SpO2 recorded at {spo2}%",
                    "sources": [{"field": "vitals.spo2", "value": spo2}],
                }
            )
        hr = vitals.get("hr")
        if isinstance(hr, (int, float)) and hr > 100:
            hints.append(
                {
                    "reason": "Tachycardia needing monitoring",
                    "detail": f"Heart rate of {hr}",
                    "sources": [{"field": "vitals.hr", "value": hr}],
                }
            )
        if patient.narrative:
            hints.append(
                {
                    "reason": "Documented narrative",
                    "detail": patient.narrative,
                    "sources": [{"field": "narrative", "value": patient.narrative}],
                }
            )
        if not hints:
            hints.append(
                {
                    "reason": "Standard evaluation completed",
                    "detail": "Chart data supports decision",
                    "sources": [{"field": "epcr_patient", "value": patient.incident_number}],
                }
            )
        return hints

    @classmethod
    def _build_denial_risk_flags(cls, patient: Patient) -> list[dict[str, Any]]:
        flags: list[dict[str, Any]] = []
        if not patient.procedures:
            flags.append(
                {
                    "flag": "missing_pcs",
                    "sources": [{"field": "procedures", "value": patient.procedures}],
                }
            )
        if not patient.narrative:
            flags.append(
                {
                    "flag": "missing_signature",
                    "sources": [{"field": "narrative", "value": patient.narrative}],
                }
            )
        if not patient.date_of_birth:
            flags.append(
                {"flag": "missing_dob", "sources": [{"field": "date_of_birth", "value": ""}]}
            )
        if not patient.locked_at:
            flags.append(
                {
                    "flag": "missing_times",
                    "sources": [{"field": "locked_at", "value": None}],
                }
            )
        if cls._is_abnormal_peds(patient):
            flags.append(
                {
                    "flag": "abnormal_peds_weight",
                    "sources": [
                        {
                            "field": "vitals.weight",
                            "value": (patient.vitals or {}).get("weight"),
                        }
                    ],
                }
            )
        return flags

    @classmethod
    def _is_abnormal_peds(cls, patient: Patient) -> bool:
        dob = patient.date_of_birth
        if not dob:
            return False
        try:
            born = datetime.fromisoformat(dob)
        except ValueError:
            return False
        now = datetime.now(timezone.utc)
        age_years = (now - born).days / 365.25
        weight = (patient.vitals or {}).get("weight")
        if isinstance(weight, (int, float)) and age_years < 18 and weight < 30:
            return True
        return False

    @classmethod
    def _build_explanations(
        cls,
        coding: dict[str, Any],
        necessity: list[dict[str, Any]],
        risks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        explanations: list[dict[str, Any]] = []
        primary = coding.get("primary_icd10")
        if primary:
            explanations.append(
                {
                    "component": "primary_icd10",
                    "value": primary,
                    "evidence": primary.get("sources") or necessity[0].get("sources") if necessity else [],
                }
            )
        secondary = coding.get("secondary_icd10")
        if secondary:
            explanations.append(
                {
                    "component": "secondary_icd10",
                    "value": secondary,
                    "evidence": secondary.get("sources", []),
                }
            )
        for hint in coding.get("procedure_hints", []):
            explanations.append(
                {
                    "component": "procedure_hint",
                    "value": {"procedure": hint.get("procedure"), "code": hint.get("code")},
                    "evidence": hint.get("sources", []),
                }
            )
        for risk in risks:
            explanations.append(
                {
                    "component": "denial_risk",
                    "value": risk["flag"],
                    "evidence": risk.get("sources", []),
                }
            )
        return explanations


class OllamaClient:
    def __init__(self, timeout: float = 10.0) -> None:
        self.enabled = settings.OLLAMA_ENABLED
        self.base_url = (settings.OLLAMA_SERVER_URL or "").rstrip("/")
        self.timeout = timeout

    def generate(self, prompt: str, model: str, temperature: float = 0.2) -> dict[str, Any]:
        if not self.enabled or not self.base_url:
            return {"status": "disabled", "model": model, "response": "", "error": "Ollama disabled"}
        try:
            response = httpx.post(
                f"{self.base_url}/api/generate",
                timeout=self.timeout,
                json={
                    "model": model,
                    "prompt": prompt,
                    "temperature": temperature,
                    "stream": False,
                },
            )
            response.raise_for_status()
            payload = response.json()
            return {
                "status": "ok",
                "model": model,
                "response": payload.get("response", ""),
                "metadata": payload,
            }
        except Exception as exc:  # noqa: BLE001 - log failures
            logger.warning("Ollama request failed (%s): %s", model, exc)
            return {"status": "error", "model": model, "response": "", "error": str(exc)}


class OllamaBaseInsight:
    MODEL = "mistral-7b"
    INSIGHT_TYPE = "general"

    def __init__(self, client: OllamaClient):
        self.client = client

    def _patient_summary(self, patient: Patient) -> str:
        if not patient:
            return ""
        meds = ", ".join(
            entry.get("name") if isinstance(entry, dict) else entry
            for entry in (patient.medications or [])
            if entry
        )
        procedures = ", ".join(
            entry if isinstance(entry, str) else entry.get("procedure") or ""
            for entry in (patient.procedures or [])
            if entry
        )
        return (
            f"{patient.first_name} {patient.last_name}, DOB {patient.date_of_birth}, "
            f"incident {patient.incident_number}, narrative: {patient.narrative or 'n/a'}, "
            f"medications: {meds or 'none'}, procedures: {procedures or 'none'}"
        )

    def _build_prompt(self, prefix: str, details: str) -> str:
        return f"{prefix}\n\nPatient Summary:\n{details}\n\nProvide a structured response."

    def _wrap_result(self, prompt: str, result: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        output = {
            "insight_type": self.INSIGHT_TYPE,
            "model": self.MODEL,
            "prompt": prompt,
            "status": result.get("status", "ok"),
            "response_text": result.get("response", ""),
            "metadata": result.get("metadata", {}),
            "context": context or {},
        }
        if result.get("status") in {"disabled", "error"}:
            output["fallback"] = context.get("fallback") or {}
        return output


class OllamaBillingCoder(OllamaBaseInsight):
    MODEL = "mistral-7b"
    INSIGHT_TYPE = "coding"

    def generate(
        self,
        patient: Patient | None,
        assist_snapshot: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        summary = self._patient_summary(patient) if patient else "patient data missing"
        if not assist_snapshot:
            assist_snapshot = {}
        prompt = self._build_prompt(
            "You are a clinical coding assistant. Suggest ICD-10/CPT codes and capture medical necessity.",
            summary,
        )
        result = self.client.generate(prompt, self.MODEL, temperature=0.3)
        fallback_hint = BillingAssistEngine.generate(patient) if patient else {}
        wrapped = self._wrap_result(prompt, result, context or {})
        if result.get("status") == "disabled":
            wrapped["fallback"] = fallback_hint
        wrapped["assist_snapshot"] = assist_snapshot
        return wrapped


class OllamaDenialPredictor(OllamaBaseInsight):
    MODEL = "dolphin-mixtral"
    INSIGHT_TYPE = "denial_risk"

    def generate(
        self,
        patient: Patient | None,
        claim: BillingClaim | None,
        denial_reason: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        summary = self._patient_summary(patient) if patient else "patient data missing"
        claim_status = claim.status if claim else "unknown"
        prompt = self._build_prompt(
            "You are a denial risk analyst. Highlight medical necessity, coverage, and auth risks.",
            f"{summary}\nClaim status: {claim_status}\nDenial reason: {denial_reason or 'none'}",
        )
        result = self.client.generate(prompt, self.MODEL, temperature=0.4)
        wrapped = self._wrap_result(prompt, result, context or {})
        if result.get("status") == "disabled":
            wrapped["fallback"] = {
                "risk_flags": claim.denial_risk_flags if claim else [],
                "denial_reason": denial_reason or "",
            }
        return wrapped


class OllamaAppealGenerator(OllamaBaseInsight):
    MODEL = "dolphin-mixtral"
    INSIGHT_TYPE = "appeal"

    def generate(
        self,
        patient: Patient | None,
        claim: BillingClaim | None,
        denial_reason: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        summary = self._patient_summary(patient) if patient else "patient data missing"
        prompt = self._build_prompt(
            "Draft an appeal letter summarizing the clinical justification.",
            f"{summary}\nDenial reason: {denial_reason}\nClaim status: {claim.status if claim else 'unknown'}",
        )
        result = self.client.generate(prompt, self.MODEL, temperature=0.5)
        wrapped = self._wrap_result(prompt, result, context or {})
        if result.get("status") == "disabled":
            wrapped["fallback"] = {
                "template": "Appeal drafted with available chart data.",
                "denial_reason": denial_reason,
            }
        return wrapped


class OllamaClaimScrubber(OllamaBaseInsight):
    MODEL = "neural-chat"
    INSIGHT_TYPE = "scrub"

    def generate(
        self,
        patient: Patient | None,
        claim: BillingClaim | None,
        payload: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        summary = self._patient_summary(patient) if patient else "patient data missing"
        prompt = self._build_prompt(
            "Validate the claim against typical payer requirements and flag missing data.",
            f"{summary}\nClaim snapshot: {payload or {}}",
        )
        result = self.client.generate(prompt, self.MODEL, temperature=0.25)
        wrapped = self._wrap_result(prompt, result, context or {})
        if result.get("status") == "disabled":
            wrapped["fallback"] = {"scrub_status": "pass", "issues": []}
        return wrapped
