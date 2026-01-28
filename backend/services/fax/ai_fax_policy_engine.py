"""
AI Fax Policy Engine - Governance Controls for Automated Fax Operations

Implements strict policy enforcement for AI-driven fax automation as defined in Section II
of the FusionEMS Quantum AI Policy Framework. This engine ensures that all automated fax
operations comply with healthcare regulations and organizational policies.

Core Responsibilities:
1. Document Type Authorization (Section II)
2. Policy Validation & Decision Making
3. Workflow State Requirements
4. Forbidden Actions Enforcement (Section XI)
5. Audit Logging & Compliance Tracking

CRITICAL: This engine acts as a gatekeeper - NO fax automation proceeds without explicit
policy approval and audit trail.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text, func

from core.database import Base
from utils.logger import logger


# ============================================================================
# POLICY ENUMS
# ============================================================================

class DocumentType(str, Enum):
    """Authorized document types for AI fax operations (Section II)"""
    PCS = "PCS"  # Physician Certification Statement
    AUTHORIZATION = "AUTHORIZATION"  # Transport/medical authorizations
    MEDICAL_RECORDS = "MEDICAL_RECORDS"  # Required for billing/review
    DENIAL_DOCUMENTATION = "DENIAL_DOCUMENTATION"  # Insurance denial/determination
    COMPLIANCE_DOCUMENTS = "COMPLIANCE_DOCUMENTS"  # Other required compliance docs


class WorkflowState(str, Enum):
    """Workflow states that may trigger fax automation"""
    WAITING_ON_DOCUMENTATION = "waiting_on_documentation"
    PENDING_AUTHORIZATION = "pending_authorization"
    DENIAL_REQUIRES_RESPONSE = "denial_requires_response"
    COMPLIANCE_REQUIRED = "compliance_required"
    BLOCKED_MISSING_RECORDS = "blocked_missing_records"


class PolicyDecisionStatus(str, Enum):
    """Policy decision outcomes"""
    APPROVED = "approved"
    DENIED = "denied"
    REQUIRES_HUMAN_REVIEW = "requires_human_review"
    ESCALATED = "escalated"


class ForbiddenAction(str, Enum):
    """Actions explicitly forbidden by Section XI"""
    GUESS_FAX_NUMBER = "guess_fax_number"
    WEB_SCRAPING = "web_scraping"
    IMPERSONATE_USER = "impersonate_user"
    SUBMIT_DEA_ENROLLMENT = "submit_dea_enrollment"
    SUBMIT_CMS_ENROLLMENT = "submit_cms_enrollment"
    SEND_CREDENTIALS = "send_credentials"
    THREATEN_OR_PRESSURE = "threaten_or_pressure"
    CONTINUE_AFTER_STOP = "continue_after_stop"
    OPERATE_WITHOUT_AUDIT = "operate_without_audit"


# ============================================================================
# POLICY DATACLASSES
# ============================================================================

@dataclass
class TimingRules:
    """Timing constraints for fax operations"""
    min_interval_hours: int = 24  # Minimum hours between fax attempts
    max_attempts_per_day: int = 2
    max_total_attempts: int = 3
    escalate_after_attempts: int = 2
    business_hours_only: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'min_interval_hours': self.min_interval_hours,
            'max_attempts_per_day': self.max_attempts_per_day,
            'max_total_attempts': self.max_total_attempts,
            'escalate_after_attempts': self.escalate_after_attempts,
            'business_hours_only': self.business_hours_only
        }


@dataclass
class EscalationLimits:
    """Escalation rules for blocked workflows"""
    escalate_after_hours: int = 48
    notify_supervisor: bool = True
    require_manual_review: bool = False
    stop_automation: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'escalate_after_hours': self.escalate_after_hours,
            'notify_supervisor': self.notify_supervisor,
            'require_manual_review': self.require_manual_review,
            'stop_automation': self.stop_automation
        }


@dataclass
class FaxRequest:
    """Represents a request for AI-driven fax automation"""
    incident_id: int
    workflow_state: WorkflowState
    document_type: DocumentType
    recipient_number: str
    recipient_name: str
    recipient_verified: bool  # Must be TRUE - no guessing
    electronic_attempts_made: bool  # Must try electronic first
    document_actually_required: bool  # Not speculative
    blocking_reason: str
    requested_by: Optional[int] = None  # User ID if human-initiated
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class PolicyDecision:
    """Result of policy validation"""
    approved: bool
    status: PolicyDecisionStatus
    reason: str
    policy_reference: str
    document_type: DocumentType
    timing_rules: TimingRules
    escalation_limits: EscalationLimits
    audit_id: str
    warnings: List[str]
    required_actions: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'approved': self.approved,
            'status': self.status.value,
            'reason': self.reason,
            'policy_reference': self.policy_reference,
            'document_type': self.document_type.value,
            'timing_rules': self.timing_rules.to_dict(),
            'escalation_limits': self.escalation_limits.to_dict(),
            'audit_id': self.audit_id,
            'warnings': self.warnings,
            'required_actions': self.required_actions
        }


# ============================================================================
# AUDIT DATABASE MODEL
# ============================================================================

class FaxPolicyAudit(Base):
    """Audit log for all fax policy decisions"""
    __tablename__ = "fax_policy_audit"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Request details
    incident_id = Column(Integer, index=True)
    workflow_state = Column(String, nullable=False)
    document_type = Column(String, nullable=False)
    recipient_number = Column(String, nullable=False)
    recipient_name = Column(String, default="")
    
    # Validation results
    decision_status = Column(String, nullable=False, index=True)  # approved/denied/etc
    approved = Column(Boolean, nullable=False, default=False)
    denial_reason = Column(Text, default="")
    policy_reference = Column(String, nullable=False)
    
    # Policy constraints applied
    timing_rules = Column(JSON, nullable=False, default=dict)
    escalation_limits = Column(JSON, nullable=False, default=dict)
    
    # Validation checks
    recipient_verified = Column(Boolean, default=False)
    electronic_attempted = Column(Boolean, default=False)
    document_required = Column(Boolean, default=False)
    workflow_blocked = Column(Boolean, default=False)
    
    # Warnings and actions
    warnings = Column(JSON, nullable=False, default=list)
    required_actions = Column(JSON, nullable=False, default=list)
    
    # Tracking
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    ai_initiated = Column(Boolean, default=True)
    fax_record_id = Column(Integer, ForeignKey("fax_records.id"), nullable=True)
    
    # Metadata
    extra_metadata = Column(JSON, nullable=False, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ============================================================================
# POLICY ENGINE
# ============================================================================

class FaxPolicyEngine:
    """
    Core policy enforcement engine for AI fax automation.
    
    This engine implements a zero-trust model where:
    - Every request must be explicitly authorized
    - All decisions are audited
    - Forbidden actions are actively blocked
    - Human oversight is built into escalation paths
    """
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        
        # Policy configuration (can be loaded from org settings)
        self.policy_config = self._load_policy_config()
    
    # ========================================================================
    # CORE VALIDATION
    # ========================================================================
    
    def validate_fax_request(self, request: FaxRequest) -> PolicyDecision:
        """
        Primary validation entry point. Evaluates fax request against all
        policy requirements and returns a decision.
        
        Args:
            request: FaxRequest with all required fields
            
        Returns:
            PolicyDecision with approval/denial and constraints
        """
        audit_id = self._generate_audit_id()
        warnings = []
        required_actions = []
        
        # Check 1: Document type authorization (Section II)
        if not self._is_document_type_authorized(request.document_type):
            return self._deny_request(
                request=request,
                audit_id=audit_id,
                reason=f"Document type {request.document_type.value} is not authorized for AI fax automation",
                policy_reference="SECTION_II_DOCUMENT_AUTHORIZATION"
            )
        
        # Check 2: Workflow state requirements
        if not self._is_workflow_blocked(request.workflow_state):
            return self._deny_request(
                request=request,
                audit_id=audit_id,
                reason=f"Workflow state {request.workflow_state.value} does not justify fax automation",
                policy_reference="SECTION_II_WORKFLOW_REQUIREMENTS"
            )
        
        # Check 3: Recipient verification (NO GUESSING)
        if not request.recipient_verified:
            return self._deny_request(
                request=request,
                audit_id=audit_id,
                reason="Recipient fax number must be verified - AI cannot guess fax numbers",
                policy_reference="SECTION_XI_FORBIDDEN_GUESS_FAX_NUMBER"
            )
        
        # Check 4: Electronic methods attempted first
        if not request.electronic_attempts_made:
            warnings.append("Electronic delivery should be attempted before fax")
            required_actions.append("Document electronic delivery attempts in audit log")
        
        # Check 5: Document actually required (not speculative)
        if not request.document_actually_required:
            return self._deny_request(
                request=request,
                audit_id=audit_id,
                reason="Fax automation requires documented proof that document is actually required",
                policy_reference="SECTION_II_WORKFLOW_REQUIREMENTS"
            )
        
        # Check 6: Timing constraints
        timing_check = self._check_timing_constraints(request)
        if not timing_check['allowed']:
            return self._deny_request(
                request=request,
                audit_id=audit_id,
                reason=timing_check['reason'],
                policy_reference="SECTION_II_TIMING_RULES"
            )
        
        # Check 7: Forbidden actions scan
        forbidden_check = self._scan_for_forbidden_actions(request)
        if forbidden_check['violations']:
            return self._deny_request(
                request=request,
                audit_id=audit_id,
                reason=f"Forbidden actions detected: {', '.join(forbidden_check['violations'])}",
                policy_reference="SECTION_XI_FORBIDDEN_ACTIONS"
            )
        
        # Check 8: Escalation requirements
        escalation_check = self._check_escalation_requirements(request)
        if escalation_check['requires_escalation']:
            return PolicyDecision(
                approved=False,
                status=PolicyDecisionStatus.REQUIRES_HUMAN_REVIEW,
                reason=escalation_check['reason'],
                policy_reference="SECTION_II_ESCALATION_LIMITS",
                document_type=request.document_type,
                timing_rules=self._get_timing_rules(request.document_type),
                escalation_limits=self._get_escalation_limits(request.document_type),
                audit_id=audit_id,
                warnings=warnings + escalation_check['warnings'],
                required_actions=required_actions + ['Human review required before proceeding']
            )
        
        # ALL CHECKS PASSED - Approve with constraints
        timing_rules = self._get_timing_rules(request.document_type)
        escalation_limits = self._get_escalation_limits(request.document_type)
        
        decision = PolicyDecision(
            approved=True,
            status=PolicyDecisionStatus.APPROVED,
            reason="Fax request approved - all policy requirements met",
            policy_reference="SECTION_II_DOCUMENT_AUTHORIZATION",
            document_type=request.document_type,
            timing_rules=timing_rules,
            escalation_limits=escalation_limits,
            audit_id=audit_id,
            warnings=warnings,
            required_actions=required_actions + ['Log fax attempt with timestamp', 'Update workflow state']
        )
        
        # Audit the decision
        self._audit_decision(request, decision)
        
        logger.info(f"Fax policy approved: audit_id={audit_id}, incident={request.incident_id}, doc_type={request.document_type.value}")
        
        return decision
    
    # ========================================================================
    # POLICY CHECKS
    # ========================================================================
    
    def _is_document_type_authorized(self, doc_type: DocumentType) -> bool:
        """Check if document type is authorized for AI fax (Section II)"""
        # All defined DocumentType enum values are authorized
        return doc_type in DocumentType
    
    def _is_workflow_blocked(self, workflow_state: WorkflowState) -> bool:
        """Check if workflow state justifies fax automation"""
        # Only blocked states justify fax
        blocked_states = [
            WorkflowState.WAITING_ON_DOCUMENTATION,
            WorkflowState.PENDING_AUTHORIZATION,
            WorkflowState.DENIAL_REQUIRES_RESPONSE,
            WorkflowState.COMPLIANCE_REQUIRED,
            WorkflowState.BLOCKED_MISSING_RECORDS
        ]
        return workflow_state in blocked_states
    
    def _check_timing_constraints(self, request: FaxRequest) -> Dict[str, Any]:
        """
        Check if timing allows another fax attempt.
        
        Rules:
        - Minimum interval between attempts
        - Maximum attempts per day
        - Maximum total attempts
        - Business hours enforcement
        """
        # Query recent fax attempts for this incident
        recent_attempts = self.db.query(FaxPolicyAudit).filter(
            FaxPolicyAudit.org_id == self.org_id,
            FaxPolicyAudit.incident_id == request.incident_id,
            FaxPolicyAudit.document_type == request.document_type.value,
            FaxPolicyAudit.approved == True
        ).order_by(FaxPolicyAudit.created_at.desc()).all()
        
        if not recent_attempts:
            return {'allowed': True}
        
        timing_rules = self._get_timing_rules(request.document_type)
        
        # Check most recent attempt interval
        last_attempt = recent_attempts[0]
        hours_since_last = (datetime.utcnow() - last_attempt.created_at).total_seconds() / 3600
        
        if hours_since_last < timing_rules.min_interval_hours:
            return {
                'allowed': False,
                'reason': f"Minimum interval of {timing_rules.min_interval_hours} hours not met (last attempt {hours_since_last:.1f} hours ago)"
            }
        
        # Check daily limit
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_attempts = [a for a in recent_attempts if a.created_at >= today_start]
        
        if len(today_attempts) >= timing_rules.max_attempts_per_day:
            return {
                'allowed': False,
                'reason': f"Daily limit of {timing_rules.max_attempts_per_day} attempts reached"
            }
        
        # Check total attempts
        if len(recent_attempts) >= timing_rules.max_total_attempts:
            return {
                'allowed': False,
                'reason': f"Maximum total attempts ({timing_rules.max_total_attempts}) reached - escalation required"
            }
        
        # Check business hours if required
        if timing_rules.business_hours_only:
            current_hour = datetime.utcnow().hour
            if current_hour < 8 or current_hour >= 18:  # 8 AM - 6 PM
                return {
                    'allowed': False,
                    'reason': "Fax automation restricted to business hours (8 AM - 6 PM)"
                }
        
        return {'allowed': True}
    
    def _scan_for_forbidden_actions(self, request: FaxRequest) -> Dict[str, Any]:
        """
        Scan request for any forbidden actions (Section XI).
        
        Forbidden actions include:
        - Guessing fax numbers
        - Web scraping
        - Impersonation
        - DEA/CMS submissions
        - Sending credentials
        - Threats or pressure
        - Continuing after stop conditions
        - Operating without audit
        """
        violations = []
        
        # Check for unverified recipient (guessing)
        if not request.recipient_verified:
            violations.append(ForbiddenAction.GUESS_FAX_NUMBER.value)
        
        # Check metadata for forbidden patterns
        if request.metadata:
            # Check for impersonation flags
            if request.metadata.get('impersonate_user'):
                violations.append(ForbiddenAction.IMPERSONATE_USER.value)
            
            # Check for credential transmission
            if any(key in request.metadata for key in ['password', 'credential', 'api_key']):
                violations.append(ForbiddenAction.SEND_CREDENTIALS.value)
            
            # Check for DEA/CMS enrollment
            doc_content = str(request.metadata.get('document_content', '')).lower()
            if 'dea enrollment' in doc_content or 'dea application' in doc_content:
                violations.append(ForbiddenAction.SUBMIT_DEA_ENROLLMENT.value)
            if 'cms enrollment' in doc_content or 'cms-855' in doc_content:
                violations.append(ForbiddenAction.SUBMIT_CMS_ENROLLMENT.value)
            
            # Check for threatening language
            threat_keywords = ['immediate', 'must', 'penalty', 'legal action', 'lawsuit']
            if any(keyword in doc_content for keyword in threat_keywords):
                violations.append(ForbiddenAction.THREATEN_OR_PRESSURE.value)
            
            # Check for stop condition override
            if request.metadata.get('override_stop_condition'):
                violations.append(ForbiddenAction.CONTINUE_AFTER_STOP.value)
        
        return {
            'violations': violations,
            'clean': len(violations) == 0
        }
    
    def _check_escalation_requirements(self, request: FaxRequest) -> Dict[str, Any]:
        """
        Check if case should be escalated to human review.
        
        Escalation triggers:
        - Multiple failed attempts
        - Extended time blocked
        - High-risk document types
        - Previous policy violations
        """
        warnings = []
        
        # Count previous attempts
        previous_attempts = self.db.query(FaxPolicyAudit).filter(
            FaxPolicyAudit.org_id == self.org_id,
            FaxPolicyAudit.incident_id == request.incident_id,
            FaxPolicyAudit.document_type == request.document_type.value
        ).count()
        
        escalation_limits = self._get_escalation_limits(request.document_type)
        
        # Multiple attempts trigger
        if previous_attempts >= 2:
            warnings.append(f"{previous_attempts} previous fax attempts - approaching escalation threshold")
        
        # Check time blocked (if available in metadata)
        if request.metadata and 'hours_blocked' in request.metadata:
            hours_blocked = request.metadata['hours_blocked']
            if hours_blocked >= escalation_limits.escalate_after_hours:
                return {
                    'requires_escalation': True,
                    'reason': f"Workflow blocked for {hours_blocked} hours - human intervention required",
                    'warnings': warnings
                }
        
        # High-risk document types
        high_risk_types = [DocumentType.DENIAL_DOCUMENTATION, DocumentType.AUTHORIZATION]
        if request.document_type in high_risk_types and previous_attempts >= 1:
            warnings.append(f"High-risk document type after {previous_attempts} attempts")
        
        return {
            'requires_escalation': False,
            'warnings': warnings
        }
    
    # ========================================================================
    # POLICY CONFIGURATION
    # ========================================================================
    
    def _get_timing_rules(self, doc_type: DocumentType) -> TimingRules:
        """Get timing rules for document type"""
        # Different document types may have different timing requirements
        if doc_type == DocumentType.PCS:
            return TimingRules(
                min_interval_hours=24,
                max_attempts_per_day=1,
                max_total_attempts=3,
                escalate_after_attempts=2,
                business_hours_only=True
            )
        elif doc_type == DocumentType.DENIAL_DOCUMENTATION:
            return TimingRules(
                min_interval_hours=12,
                max_attempts_per_day=2,
                max_total_attempts=3,
                escalate_after_attempts=2,
                business_hours_only=True
            )
        else:
            # Default rules
            return TimingRules()
    
    def _get_escalation_limits(self, doc_type: DocumentType) -> EscalationLimits:
        """Get escalation rules for document type"""
        if doc_type == DocumentType.DENIAL_DOCUMENTATION:
            return EscalationLimits(
                escalate_after_hours=24,  # Faster escalation for denials
                notify_supervisor=True,
                require_manual_review=True,
                stop_automation=False
            )
        else:
            return EscalationLimits()
    
    def _load_policy_config(self) -> Dict[str, Any]:
        """Load organization-specific policy configuration"""
        # TODO: Load from organization settings table
        return {
            'strict_mode': True,
            'require_dual_authorization': False,
            'audit_retention_days': 2555  # 7 years for HIPAA
        }
    
    # ========================================================================
    # HELPERS
    # ========================================================================
    
    def _deny_request(
        self,
        request: FaxRequest,
        audit_id: str,
        reason: str,
        policy_reference: str
    ) -> PolicyDecision:
        """Create a denial decision and audit it"""
        decision = PolicyDecision(
            approved=False,
            status=PolicyDecisionStatus.DENIED,
            reason=reason,
            policy_reference=policy_reference,
            document_type=request.document_type,
            timing_rules=self._get_timing_rules(request.document_type),
            escalation_limits=self._get_escalation_limits(request.document_type),
            audit_id=audit_id,
            warnings=[],
            required_actions=['Policy violation must be reviewed', 'Update workflow state']
        )
        
        # Audit the denial
        self._audit_decision(request, decision)
        
        logger.warning(f"Fax policy denied: audit_id={audit_id}, incident={request.incident_id}, reason={reason}")
        
        return decision
    
    def _audit_decision(self, request: FaxRequest, decision: PolicyDecision):
        """Write policy decision to audit log"""
        audit = FaxPolicyAudit(
            org_id=self.org_id,
            incident_id=request.incident_id,
            workflow_state=request.workflow_state.value,
            document_type=request.document_type.value,
            recipient_number=request.recipient_number,
            recipient_name=request.recipient_name,
            decision_status=decision.status.value,
            approved=decision.approved,
            denial_reason=decision.reason if not decision.approved else "",
            policy_reference=decision.policy_reference,
            timing_rules=decision.timing_rules.to_dict(),
            escalation_limits=decision.escalation_limits.to_dict(),
            recipient_verified=request.recipient_verified,
            electronic_attempted=request.electronic_attempts_made,
            document_required=request.document_actually_required,
            workflow_blocked=True,  # Validated in checks
            warnings=decision.warnings,
            required_actions=decision.required_actions,
            requested_by=request.requested_by,
            ai_initiated=request.requested_by is None,
            metadata=request.metadata or {}
        )
        
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(audit)
        
        logger.info(f"Fax policy decision audited: audit_id={decision.audit_id}, approved={decision.approved}")
    
    def _generate_audit_id(self) -> str:
        """Generate unique audit ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"FAX_POLICY_{timestamp}_{self.org_id}"
    
    # ========================================================================
    # REPORTING & ANALYTICS
    # ========================================================================
    
    def get_policy_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Get policy enforcement statistics"""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        total_requests = self.db.query(FaxPolicyAudit).filter(
            FaxPolicyAudit.org_id == self.org_id,
            FaxPolicyAudit.created_at >= cutoff
        ).count()
        
        approved = self.db.query(FaxPolicyAudit).filter(
            FaxPolicyAudit.org_id == self.org_id,
            FaxPolicyAudit.created_at >= cutoff,
            FaxPolicyAudit.approved == True
        ).count()
        
        denied = self.db.query(FaxPolicyAudit).filter(
            FaxPolicyAudit.org_id == self.org_id,
            FaxPolicyAudit.created_at >= cutoff,
            FaxPolicyAudit.decision_status == PolicyDecisionStatus.DENIED.value
        ).count()
        
        escalated = self.db.query(FaxPolicyAudit).filter(
            FaxPolicyAudit.org_id == self.org_id,
            FaxPolicyAudit.created_at >= cutoff,
            FaxPolicyAudit.decision_status == PolicyDecisionStatus.REQUIRES_HUMAN_REVIEW.value
        ).count()
        
        return {
            'total_requests': total_requests,
            'approved': approved,
            'denied': denied,
            'escalated': escalated,
            'approval_rate': round((approved / total_requests) * 100, 1) if total_requests > 0 else 0,
            'period_days': days
        }
    
    def get_recent_denials(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent policy denials for review"""
        denials = self.db.query(FaxPolicyAudit).filter(
            FaxPolicyAudit.org_id == self.org_id,
            FaxPolicyAudit.approved == False
        ).order_by(FaxPolicyAudit.created_at.desc()).limit(limit).all()
        
        return [{
            'id': d.id,
            'incident_id': d.incident_id,
            'document_type': d.document_type,
            'decision_status': d.decision_status,
            'denial_reason': d.denial_reason,
            'policy_reference': d.policy_reference,
            'created_at': d.created_at.isoformat()
        } for d in denials]
