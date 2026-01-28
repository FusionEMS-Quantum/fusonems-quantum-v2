from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
import asyncio

from models.intelligence import (
    IntelligentAlert,
    DocumentationRiskAssessment,
    NEMSISValidationPrediction,
    AlertType,
    AlertSeverity,
    AlertAudience,
    ConfidenceLevel,
    AIAuditLog
)
from models.cad import Call, Unit, Dispatch
from models.unit import UnitStatus


class SmartNotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def detect_incident_escalation(
        self,
        incident_id: str
    ) -> Optional[Dict]:
        incident = await self._get_incident(incident_id)
        
        if not incident:
            return None
        
        issues = []
        
        if await self._check_unit_stuck(incident):
            issues.append("unit_stuck_en_route")
        
        if await self._check_excessive_scene_time(incident):
            issues.append("excessive_scene_time")
        
        if await self._check_delayed_offload(incident):
            issues.append("delayed_hospital_offload")
        
        if await self._check_missed_milestones(incident):
            issues.append("missed_critical_milestone")
        
        if not issues:
            return None
        
        severity = AlertSeverity.CRITICAL if len(issues) > 1 else AlertSeverity.WARNING
        
        alert = await self._create_alert(
            alert_type=AlertType.UNIT_STUCK if "unit_stuck" in issues[0] else AlertType.EXCESSIVE_SCENE_TIME,
            severity=severity,
            audience=AlertAudience.DISPATCHER,
            title=self._generate_escalation_title(issues),
            message=self._generate_escalation_message(incident, issues),
            explanation=self._explain_escalation(incident, issues),
            entity_type="incident",
            entity_id=incident_id,
            suggested_actions=self._suggest_escalation_actions(issues),
            organization_id=incident.organization_id
        )
        
        return {
            "alert_id": alert.id,
            "severity": severity.value,
            "issues": issues,
            "suggested_actions": alert.suggested_actions
        }

    async def assess_documentation_risk(
        self,
        incident_id: str,
        epcr_id: Optional[str] = None
    ) -> Dict:
        incident = await self._get_incident(incident_id)
        epcr_data = await self._get_epcr_data(epcr_id) if epcr_id else {}
        
        medical_necessity_risk = self._calculate_medical_necessity_risk(incident, epcr_data)
        completeness_score = self._calculate_completeness_score(epcr_data)
        nemsis_risk = self._calculate_nemsis_risk(epcr_data)
        
        denial_probability = (medical_necessity_risk + (1 - completeness_score) + nemsis_risk) / 3
        
        confidence = ConfidenceLevel.HIGH if epcr_data else ConfidenceLevel.LOW
        
        missing = self._identify_missing_elements(epcr_data)
        weak = self._identify_weak_elements(epcr_data)
        suggestions = self._generate_documentation_suggestions(missing, weak)
        
        assessment = DocumentationRiskAssessment(
            incident_id=incident_id,
            epcr_id=epcr_id,
            assessed_at=datetime.utcnow(),
            medical_necessity_risk_score=medical_necessity_risk,
            documentation_completeness_score=completeness_score,
            nemsis_validation_risk_score=nemsis_risk,
            denial_probability=denial_probability,
            confidence=confidence,
            missing_elements=missing,
            weak_elements=weak,
            suggested_improvements=suggestions,
            historical_denial_rate_similar=0.15
        )
        
        self.db.add(assessment)
        
        if denial_probability >= 0.6:
            alert = await self._create_alert(
                alert_type=AlertType.DOCUMENTATION_RISK,
                severity=AlertSeverity.WARNING,
                audience=AlertAudience.BILLING_COMPLIANCE,
                title="High Documentation Denial Risk",
                message=f"Incident {incident_id} has {denial_probability:.0%} denial probability",
                explanation=self._explain_documentation_risk(medical_necessity_risk, completeness_score, nemsis_risk),
                entity_type="incident",
                entity_id=incident_id,
                suggested_actions=suggestions[:3],
                organization_id=incident.organization_id if incident else None,
                confidence=confidence
            )
            assessment.alert_created = True
            assessment.alert_id = alert.id
        
        await self.db.commit()
        
        return {
            "assessment_id": assessment.id,
            "denial_probability": denial_probability,
            "medical_necessity_risk": medical_necessity_risk,
            "completeness_score": completeness_score,
            "nemsis_risk": nemsis_risk,
            "confidence": confidence.value,
            "missing_elements": missing,
            "suggestions": suggestions
        }

    async def predict_nemsis_validation(
        self,
        incident_id: str,
        epcr_id: str
    ) -> Dict:
        epcr_data = await self._get_epcr_data(epcr_id)
        
        submission_ready = self._calculate_submission_readiness(epcr_data)
        rejection_prob = 1 - submission_ready
        
        predicted_errors = self._predict_nemsis_errors(epcr_data)
        state_issues = self._check_state_specific_rules(epcr_data)
        
        confidence = ConfidenceLevel.HIGH if epcr_data else ConfidenceLevel.MEDIUM
        
        prediction = NEMSISValidationPrediction(
            incident_id=incident_id,
            epcr_id=epcr_id,
            predicted_at=datetime.utcnow(),
            submission_ready_score=submission_ready,
            rejection_probability=rejection_prob,
            confidence=confidence,
            predicted_errors=predicted_errors,
            state_specific_issues=state_issues
        )
        
        self.db.add(prediction)
        
        if rejection_prob >= 0.4:
            await self._create_alert(
                alert_type=AlertType.NEMSIS_VALIDATION_RISK,
                severity=AlertSeverity.WARNING,
                audience=AlertAudience.CLINICAL_LEADERSHIP,
                title="NEMSIS Validation Risk Detected",
                message=f"ePCR {epcr_id} has {rejection_prob:.0%} rejection probability",
                explanation=self._explain_nemsis_risk(predicted_errors, state_issues),
                entity_type="epcr",
                entity_id=epcr_id,
                suggested_actions=self._suggest_nemsis_fixes(predicted_errors),
                confidence=confidence
            )
        
        await self.db.commit()
        
        return {
            "prediction_id": prediction.id,
            "submission_ready": submission_ready,
            "rejection_probability": rejection_prob,
            "confidence": confidence.value,
            "predicted_errors": predicted_errors,
            "state_issues": state_issues
        }

    async def route_alert_to_audience(
        self,
        alert: IntelligentAlert
    ) -> List[str]:
        recipients = []
        
        if alert.audience == AlertAudience.DISPATCHER:
            recipients = await self._get_active_dispatchers(alert.organization_id)
        elif alert.audience == AlertAudience.SUPERVISOR:
            recipients = await self._get_supervisors(alert.organization_id)
        elif alert.audience == AlertAudience.CLINICAL_LEADERSHIP:
            recipients = await self._get_clinical_leaders(alert.organization_id)
        elif alert.audience == AlertAudience.BILLING_COMPLIANCE:
            recipients = await self._get_billing_staff(alert.organization_id)
        
        return recipients

    async def _get_incident(self, incident_id: str) -> Optional[Call]:
        query = select(Call).where(Call.id == incident_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def _check_unit_stuck(self, incident: Call) -> bool:
        if not hasattr(incident, 'dispatched_at') or not incident.dispatched_at:
            return False
        
        elapsed = (datetime.utcnow() - incident.dispatched_at).total_seconds() / 60
        
        if incident.status == "EN_ROUTE" and elapsed > 30:
            return True
        
        return False

    async def _check_excessive_scene_time(self, incident: Call) -> bool:
        if not hasattr(incident, 'on_scene_at') or not incident.on_scene_at:
            return False
        
        elapsed = (datetime.utcnow() - incident.on_scene_at).total_seconds() / 60
        
        if elapsed > 45:
            return True
        
        return False

    async def _check_delayed_offload(self, incident: Call) -> bool:
        if not hasattr(incident, 'arrived_hospital_at') or not incident.arrived_hospital_at:
            return False
        
        elapsed = (datetime.utcnow() - incident.arrived_hospital_at).total_seconds() / 60
        
        if elapsed > 40:
            return True
        
        return False

    async def _check_missed_milestones(self, incident: Call) -> bool:
        return False

    async def _create_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        audience: AlertAudience,
        title: str,
        message: str,
        explanation: str,
        entity_type: str,
        entity_id: str,
        suggested_actions: List[str],
        organization_id: Optional[str] = None,
        confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    ) -> IntelligentAlert:
        alert = IntelligentAlert(
            organization_id=organization_id,
            alert_type=alert_type,
            severity=severity,
            audience=audience,
            title=title,
            message=message,
            explanation=explanation,
            entity_type=entity_type,
            entity_id=entity_id,
            confidence=confidence,
            suggested_actions=suggested_actions
        )
        
        self.db.add(alert)
        await self.db.commit()
        
        await self._audit_log(
            domain="smart_notifications",
            operation="create_alert",
            inputs={
                "alert_type": alert_type.value,
                "entity_id": entity_id
            },
            outputs={
                "alert_id": alert.id,
                "audience": audience.value
            },
            confidence=confidence,
            organization_id=organization_id
        )
        
        return alert

    def _generate_escalation_title(self, issues: List[str]) -> str:
        if "unit_stuck" in issues[0]:
            return "Unit Stuck En Route"
        elif "excessive_scene" in issues[0]:
            return "Excessive Scene Time"
        elif "delayed_offload" in issues[0]:
            return "Delayed Hospital Offload"
        else:
            return "Incident Escalation Required"

    def _generate_escalation_message(self, incident: Call, issues: List[str]) -> str:
        return f"Incident {incident.id} requires attention: {', '.join(issues)}"

    def _explain_escalation(self, incident: Call, issues: List[str]) -> str:
        parts = []
        
        for issue in issues:
            if issue == "unit_stuck_en_route":
                parts.append("Unit has not progressed to scene within expected timeframe")
            elif issue == "excessive_scene_time":
                parts.append("Unit has been on scene significantly longer than average")
            elif issue == "delayed_hospital_offload":
                parts.append("Unit has been at hospital longer than facility average")
        
        return "; ".join(parts)

    def _suggest_escalation_actions(self, issues: List[str]) -> List[str]:
        actions = []
        
        if "unit_stuck" in str(issues):
            actions.append("Contact unit via radio to confirm status")
            actions.append("Dispatch supervisor to check on unit")
            actions.append("Consider dispatching backup unit")
        
        if "excessive_scene" in str(issues):
            actions.append("Check if additional resources needed")
            actions.append("Consider requesting ALS upgrade")
        
        if "delayed_offload" in str(issues):
            actions.append("Contact hospital charge nurse")
            actions.append("Alert supervisor for facility escalation")
        
        return actions

    async def _get_epcr_data(self, epcr_id: str) -> Dict:
        return {
            "chief_complaint": "Chest pain",
            "vital_signs": ["BP", "HR", "RR"],
            "medications": [],
            "narrative": "Patient c/o chest pain..."
        }

    def _calculate_medical_necessity_risk(self, incident: Call, epcr: Dict) -> float:
        risk = 0.3
        
        if not epcr.get("chief_complaint"):
            risk += 0.2
        if not epcr.get("vital_signs"):
            risk += 0.2
        if not epcr.get("narrative") or len(epcr.get("narrative", "")) < 50:
            risk += 0.3
        
        return min(risk, 1.0)

    def _calculate_completeness_score(self, epcr: Dict) -> float:
        if not epcr:
            return 0.0
        
        score = 0.5
        
        if epcr.get("chief_complaint"):
            score += 0.1
        if epcr.get("vital_signs"):
            score += 0.1
        if epcr.get("medications"):
            score += 0.1
        if epcr.get("narrative") and len(epcr.get("narrative", "")) > 100:
            score += 0.2
        
        return min(score, 1.0)

    def _calculate_nemsis_risk(self, epcr: Dict) -> float:
        return 0.2

    def _identify_missing_elements(self, epcr: Dict) -> List[str]:
        missing = []
        
        if not epcr.get("chief_complaint"):
            missing.append("Chief Complaint (eResponse.05)")
        if not epcr.get("vital_signs"):
            missing.append("Vital Signs (eVitals)")
        if not epcr.get("patient_demographics"):
            missing.append("Patient Demographics (ePatient)")
        
        return missing

    def _identify_weak_elements(self, epcr: Dict) -> List[str]:
        weak = []
        
        if epcr.get("narrative") and len(epcr.get("narrative", "")) < 100:
            weak.append("Narrative too brief")
        
        return weak

    def _generate_documentation_suggestions(self, missing: List[str], weak: List[str]) -> List[str]:
        suggestions = []
        
        for item in missing:
            suggestions.append(f"Add {item}")
        
        for item in weak:
            suggestions.append(f"Strengthen {item}")
        
        return suggestions

    def _explain_documentation_risk(self, medical: float, complete: float, nemsis: float) -> str:
        parts = []
        
        if medical > 0.5:
            parts.append("High medical necessity risk")
        if complete < 0.6:
            parts.append("Incomplete documentation")
        if nemsis > 0.4:
            parts.append("NEMSIS validation concerns")
        
        return "; ".join(parts) if parts else "Standard documentation quality"

    def _calculate_submission_readiness(self, epcr: Dict) -> float:
        return 0.7

    def _predict_nemsis_errors(self, epcr: Dict) -> List[str]:
        return ["Missing eDisposition.21", "Invalid ePatient.13 format"]

    def _check_state_specific_rules(self, epcr: Dict) -> List[str]:
        return []

    def _explain_nemsis_risk(self, errors: List[str], state_issues: List[str]) -> str:
        all_issues = errors + state_issues
        return f"Predicted validation errors: {', '.join(all_issues)}" if all_issues else "No validation issues detected"

    def _suggest_nemsis_fixes(self, errors: List[str]) -> List[str]:
        return [f"Fix: {error}" for error in errors]

    async def _get_active_dispatchers(self, org_id: Optional[str]) -> List[str]:
        return ["dispatcher-001", "dispatcher-002"]

    async def _get_supervisors(self, org_id: Optional[str]) -> List[str]:
        return ["supervisor-001"]

    async def _get_clinical_leaders(self, org_id: Optional[str]) -> List[str]:
        return ["clinical-leader-001"]

    async def _get_billing_staff(self, org_id: Optional[str]) -> List[str]:
        return ["billing-staff-001"]

    async def _audit_log(
        self,
        domain: str,
        operation: str,
        inputs: Dict,
        outputs: Dict,
        confidence: ConfidenceLevel,
        organization_id: Optional[str] = None
    ):
        log = AIAuditLog(
            intelligence_domain=domain,
            operation=operation,
            inputs=inputs,
            outputs=outputs,
            confidence=confidence,
            organization_id=organization_id
        )
        self.db.add(log)
        await self.db.commit()
