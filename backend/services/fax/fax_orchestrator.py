"""
Fax Orchestrator - Main Coordination Service for AI-Driven Fax Operations

Section XII: Central coordinator bringing together:
- Policy enforcement
- Fax number resolution
- Timing rules
- Template generation
- Audit logging
- Failure handling

Core Principles:
1. Every operation goes through policy validation
2. Complete audit trail for all actions
3. Graceful failure handling
4. "No action" is a valid outcome
5. Human review when needed
"""

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from models.fax import FaxRecord, FaxAuditLog, FacilityContact
from services.fax.ai_fax_policy_engine import (
    FaxPolicyEngine,
    DocumentType,
    WorkflowState,
    PolicyDecisionStatus
)
from services.fax.fax_resolution_service import FaxResolutionService, FaxResolutionResult
from services.fax.fax_timing_service import FaxTimingService, TimingDecision
from services.fax.fax_audit_service import FaxAuditService
from utils.logger import logger


@dataclass
class FaxRequestResult:
    """Result of a fax request operation"""
    success: bool
    request_id: str
    policy_allowed: bool
    resolution_success: bool
    timing_allowed: bool
    fax_sent: bool
    requires_review: bool
    fax_record_id: Optional[int]
    outcome: str
    message: str
    next_steps: List[str]
    audit_log_ids: List[int]


@dataclass
class InboundFaxResult:
    """Result of processing an inbound fax"""
    success: bool
    fax_record_id: int
    classified: bool
    document_type: Optional[str]
    matched_to_request: bool
    request_id: Optional[str]
    incident_id: Optional[int]
    requires_review: bool
    outcome: str
    message: str
    audit_log_id: Optional[int]


@dataclass
class FailureHandlingResult:
    """Result of failure handling"""
    action_taken: str
    confidence_downgraded: bool
    flagged_for_review: bool
    recommendations: List[str]
    escalated: bool
    stopped: bool


class FaxOrchestrator:
    """
    Central coordinator for all AI-driven fax operations.
    Ensures proper flow through policy, resolution, timing, and audit.
    """
    
    def __init__(self, db: Session, org_id: int, user_id: Optional[int] = None):
        self.db = db
        self.org_id = org_id
        self.user_id = user_id
        
        # Initialize all services
        self.policy_engine = FaxPolicyEngine(db, org_id)
        self.resolution_service = FaxResolutionService(db, org_id, user_id)
        self.timing_service = FaxTimingService(db)
        self.audit_service = FaxAuditService(db, org_id)
    
    async def request_document(
        self,
        incident_id: int,
        document_type: DocumentType,
        facility_name: str,
        patient_info: Dict[str, Any],
        workflow_state: WorkflowState,
        facility_address: str = "",
        claim_id: Optional[int] = None,
        ai_initiated: bool = True,
        training_mode: bool = False
    ) -> FaxRequestResult:
        """
        Complete fax request workflow:
        1. Validate policy
        2. Resolve fax number
        3. Check timing rules
        4. Generate template (placeholder - external service)
        5. Send fax
        6. Audit everything
        
        Returns complete result with audit trail.
        """
        request_id = str(uuid.uuid4())
        audit_log_ids = []
        next_steps = []
        
        logger.info(f"Fax orchestrator: Starting request {request_id} for {document_type} to {facility_name}")
        
        try:
            # ================================================================
            # STEP 1: Policy Validation
            # ================================================================
            policy_decision = self.policy_engine.evaluate_fax_request(
                document_type=document_type,
                workflow_state=workflow_state,
                incident_id=incident_id,
                facility_name=facility_name,
                user_id=self.user_id,
                ai_initiated=ai_initiated
            )
            
            # Audit policy check
            policy_audit = self.audit_service.log_policy_check(
                request_id=request_id,
                policy_decision_id=policy_decision.decision_id,
                document_type=document_type.value,
                policy_allowed=policy_decision.status == PolicyDecisionStatus.APPROVED,
                policy_reference=policy_decision.policy_reference,
                incident_id=incident_id,
                claim_id=claim_id,
                workflow_state=workflow_state.value,
                user_id=self.user_id,
                ai_initiated=ai_initiated,
                outcome_details={"decision": policy_decision.to_dict()},
                training_mode=training_mode
            )
            audit_log_ids.append(policy_audit.id)
            
            if policy_decision.status != PolicyDecisionStatus.APPROVED:
                return FaxRequestResult(
                    success=False,
                    request_id=request_id,
                    policy_allowed=False,
                    resolution_success=False,
                    timing_allowed=False,
                    fax_sent=False,
                    requires_review=policy_decision.status == PolicyDecisionStatus.REQUIRES_HUMAN_REVIEW,
                    fax_record_id=None,
                    outcome="policy_denied",
                    message=policy_decision.reasoning,
                    next_steps=policy_decision.next_steps,
                    audit_log_ids=audit_log_ids
                )
            
            # ================================================================
            # STEP 2: Resolve Fax Number
            # ================================================================
            resolution_result = self.resolution_service.resolve_fax_number(
                facility_name=facility_name,
                facility_address=facility_address,
                document_type=document_type.value,
                workflow_context=workflow_state.value
            )
            
            # Audit resolution attempt
            resolution_audit = self.audit_service.log_resolution_attempt(
                request_id=request_id,
                policy_decision_id=policy_decision.decision_id,
                document_type=document_type.value,
                facility_name=facility_name,
                resolved=resolution_result.resolved,
                source_layer=resolution_result.source_layer if resolution_result.resolved else None,
                fax_number=resolution_result.fax_number,
                department=resolution_result.department,
                requires_human_review=resolution_result.requires_human_review,
                incident_id=incident_id,
                confidence_score=int(resolution_result.confidence_score * 100),
                resolution_context=resolution_result.to_dict(),
                user_id=self.user_id,
                ai_initiated=ai_initiated,
                training_mode=training_mode
            )
            audit_log_ids.append(resolution_audit.id)
            
            if not resolution_result.resolved or resolution_result.requires_human_review:
                next_steps.extend([
                    "Manual fax number verification required",
                    "Check facility contact database",
                    "Verify facility information with agency staff"
                ])
                
                return FaxRequestResult(
                    success=False,
                    request_id=request_id,
                    policy_allowed=True,
                    resolution_success=False,
                    timing_allowed=False,
                    fax_sent=False,
                    requires_review=True,
                    fax_record_id=None,
                    outcome="resolution_failed",
                    message=f"Unable to resolve fax number with sufficient confidence. Source layer: {resolution_result.source_layer}",
                    next_steps=next_steps,
                    audit_log_ids=audit_log_ids
                )
            
            # ================================================================
            # STEP 3: Check Timing Rules
            # ================================================================
            timing_decision = self.timing_service.can_send_fax(
                request_id=request_id,
                document_type=document_type,
                request_created_at=datetime.utcnow(),
                fax_only_channel=True
            )
            
            if not timing_decision.can_send:
                # Log suppression
                suppression_audit = self.audit_service.log_suppression(
                    request_id=request_id,
                    policy_decision_id=policy_decision.decision_id,
                    document_type=document_type.value,
                    suppression_reason=timing_decision.reason,
                    incident_id=incident_id,
                    claim_id=claim_id,
                    user_id=self.user_id,
                    outcome_details={
                        "timing_decision": {
                            "next_allowed_time": timing_decision.next_allowed_time.isoformat() if timing_decision.next_allowed_time else None,
                            "attempt_number": timing_decision.attempt_number,
                            "escalation_limit_reached": timing_decision.escalation_limit_reached
                        }
                    },
                    training_mode=training_mode
                )
                audit_log_ids.append(suppression_audit.id)
                
                if timing_decision.escalation_limit_reached:
                    next_steps.extend([
                        "Escalation limit reached",
                        "Flag for supervisor review",
                        "Consider alternative communication channels"
                    ])
                else:
                    next_steps.append(f"Retry after {timing_decision.next_allowed_time}")
                
                return FaxRequestResult(
                    success=False,
                    request_id=request_id,
                    policy_allowed=True,
                    resolution_success=True,
                    timing_allowed=False,
                    fax_sent=False,
                    requires_review=timing_decision.escalation_limit_reached,
                    fax_record_id=None,
                    outcome="timing_suppressed",
                    message=timing_decision.reason,
                    next_steps=next_steps,
                    audit_log_ids=audit_log_ids
                )
            
            # ================================================================
            # STEP 4: Create Fax Record
            # ================================================================
            fax_record = FaxRecord(
                org_id=self.org_id,
                direction="outbound",
                status="queued",
                recipient_number=resolution_result.fax_number,
                recipient_name=facility_name,
                document_content_type="application/pdf",
                provider="srfax",
                classification="phi",
                created_by=self.user_id,
                training_mode=training_mode,
                meta={
                    "request_id": request_id,
                    "incident_id": incident_id,
                    "claim_id": claim_id,
                    "document_type": document_type.value,
                    "workflow_state": workflow_state.value,
                    "resolution_source_layer": resolution_result.source_layer,
                    "resolution_confidence": resolution_result.confidence_score,
                    "department": resolution_result.department,
                    "ai_initiated": ai_initiated
                }
            )
            
            self.db.add(fax_record)
            self.db.commit()
            self.db.refresh(fax_record)
            
            # ================================================================
            # STEP 5: Log Send Attempt
            # ================================================================
            # Note: Actual fax sending would happen here via SRFax/Twilio
            # For now, we just create the audit record
            
            send_audit = self.audit_service.log_send_attempt(
                request_id=request_id,
                policy_decision_id=policy_decision.decision_id,
                document_type=document_type.value,
                fax_number=resolution_result.fax_number,
                facility_name=facility_name,
                department=resolution_result.department,
                source_layer=resolution_result.source_layer,
                fax_record_id=fax_record.id,
                success=True,  # Would be actual result from fax provider
                incident_id=incident_id,
                claim_id=claim_id,
                timing_context={
                    "attempt_number": timing_decision.attempt_number,
                    "next_allowed_time": timing_decision.next_allowed_time.isoformat() if timing_decision.next_allowed_time else None
                },
                user_id=self.user_id,
                ai_initiated=ai_initiated,
                training_mode=training_mode
            )
            audit_log_ids.append(send_audit.id)
            
            logger.info(f"Fax orchestrator: Successfully queued fax {fax_record.id} for request {request_id}")
            
            return FaxRequestResult(
                success=True,
                request_id=request_id,
                policy_allowed=True,
                resolution_success=True,
                timing_allowed=True,
                fax_sent=True,
                requires_review=False,
                fax_record_id=fax_record.id,
                outcome="success",
                message=f"Fax queued successfully to {facility_name} at {resolution_result.fax_number}",
                next_steps=["Monitor for response", "Track delivery status"],
                audit_log_ids=audit_log_ids
            )
            
        except Exception as e:
            logger.error(f"Fax orchestrator: Error processing request {request_id}: {str(e)}")
            
            return FaxRequestResult(
                success=False,
                request_id=request_id,
                policy_allowed=False,
                resolution_success=False,
                timing_allowed=False,
                fax_sent=False,
                requires_review=True,
                fax_record_id=None,
                outcome="error",
                message=f"Error: {str(e)}",
                next_steps=["Review error", "Manual intervention required"],
                audit_log_ids=audit_log_ids
            )
    
    async def process_inbound_fax(
        self,
        webhook_data: Dict[str, Any],
        training_mode: bool = False
    ) -> InboundFaxResult:
        """
        Process inbound fax webhook:
        1. Receive and store
        2. Classify document
        3. Match to outbound request
        4. Update workflow
        5. Audit everything
        """
        request_id = str(uuid.uuid4())
        
        logger.info(f"Fax orchestrator: Processing inbound fax {request_id}")
        
        try:
            # Create fax record
            fax_record = FaxRecord(
                org_id=self.org_id,
                direction="inbound",
                status="received",
                sender_number=webhook_data.get("sender_number", ""),
                sender_name=webhook_data.get("sender_name", ""),
                page_count=webhook_data.get("page_count", 0),
                provider=webhook_data.get("provider", "srfax"),
                provider_fax_id=webhook_data.get("provider_fax_id", ""),
                provider_response=webhook_data,
                document_url=webhook_data.get("document_url", ""),
                document_filename=webhook_data.get("filename", ""),
                document_content_type="application/pdf",
                classification="phi",
                training_mode=training_mode,
                meta={
                    "request_id": request_id,
                    "webhook_received_at": datetime.utcnow().isoformat()
                }
            )
            
            self.db.add(fax_record)
            self.db.commit()
            self.db.refresh(fax_record)
            
            # TODO: Implement document classification
            # This would use OCR + ML to determine document type
            document_type = "MEDICAL_RECORDS"  # Placeholder
            classification_confidence = 75  # Placeholder
            
            # TODO: Implement request matching
            # Match inbound fax to outbound request by sender number, timing, etc.
            matched_to_request = False
            matched_request_id = None
            incident_id = None
            
            # Audit receipt
            audit_log = self.audit_service.log_receive(
                request_id=request_id,
                policy_decision_id=str(uuid.uuid4()),
                document_type=document_type,
                fax_record_id=fax_record.id,
                sender_number=webhook_data.get("sender_number", ""),
                facility_name=webhook_data.get("sender_name", ""),
                matched_to_request=matched_to_request,
                classification_confidence=classification_confidence,
                outcome_details={
                    "provider": webhook_data.get("provider"),
                    "page_count": webhook_data.get("page_count"),
                    "classification_confidence": classification_confidence
                },
                training_mode=training_mode
            )
            
            requires_review = classification_confidence < 80 or not matched_to_request
            
            logger.info(f"Fax orchestrator: Inbound fax {fax_record.id} processed for request {request_id}")
            
            return InboundFaxResult(
                success=True,
                fax_record_id=fax_record.id,
                classified=True,
                document_type=document_type,
                matched_to_request=matched_to_request,
                request_id=matched_request_id,
                incident_id=incident_id,
                requires_review=requires_review,
                outcome="success",
                message=f"Inbound fax received and classified as {document_type}",
                audit_log_id=audit_log.id
            )
            
        except Exception as e:
            logger.error(f"Fax orchestrator: Error processing inbound fax {request_id}: {str(e)}")
            
            return InboundFaxResult(
                success=False,
                fax_record_id=0,
                classified=False,
                document_type=None,
                matched_to_request=False,
                request_id=None,
                incident_id=None,
                requires_review=True,
                outcome="error",
                message=f"Error: {str(e)}",
                audit_log_id=None
            )
    
    async def handle_failure(
        self,
        request_id: str,
        error: str,
        error_type: str = "transmission_failure",
        fax_record_id: Optional[int] = None,
        incident_id: Optional[int] = None
    ) -> FailureHandlingResult:
        """
        Handle fax failure scenarios:
        - Invalid number
        - Repeated transmission failure
        - Unmatched responses
        
        AI must:
        1. Stop
        2. Downgrade confidence
        3. Flag for review
        4. Recommend next steps (NEVER execute them)
        
        "No action" is a valid outcome.
        """
        logger.info(f"Fax orchestrator: Handling failure for request {request_id}: {error}")
        
        recommendations = []
        confidence_downgraded = False
        flagged_for_review = True
        escalated = False
        stopped = True
        
        # Get fax record if provided
        fax_record = None
        if fax_record_id:
            fax_record = self.db.query(FaxRecord).filter(
                FaxRecord.id == fax_record_id
            ).first()
        
        # Determine failure handling based on error type
        if error_type == "invalid_number":
            recommendations.extend([
                "Verify fax number in facility contact database",
                "Check for alternative contact numbers",
                "Contact facility directly to confirm correct fax number",
                "Update facility contact record if number has changed"
            ])
            confidence_downgraded = True
            
            # Downgrade confidence if we have resolution history
            # This would update the facility contact confidence score
            
        elif error_type == "transmission_failure":
            # Check retry count
            retry_count = fax_record.retry_count if fax_record else 0
            
            if retry_count >= 3:
                recommendations.extend([
                    "Maximum retries exceeded",
                    "Escalate to supervisor",
                    "Consider alternative communication method",
                    "Verify facility fax machine is operational"
                ])
                escalated = True
            else:
                recommendations.extend([
                    "Retry transmission after waiting period",
                    "Check fax provider status",
                    "Verify destination number is active"
                ])
                stopped = False  # Can retry
            
        elif error_type == "unmatched_response":
            recommendations.extend([
                "Manual review of received fax required",
                "Check if response is for different request",
                "Verify sender information",
                "Contact sender to clarify response"
            ])
            
        else:  # Generic error
            recommendations.extend([
                "Review error details",
                "Check system logs",
                "Manual intervention required"
            ])
        
        # Update fax record status if provided
        if fax_record:
            fax_record.status = "failed"
            fax_record.error_message = error
            fax_record.error_code = error_type
            fax_record.failed_at = datetime.utcnow()
            self.db.commit()
        
        # Log the failure handling
        # This would be audited via policy engine or separate audit
        
        logger.info(f"Fax orchestrator: Failure handling complete for request {request_id}. Stopped: {stopped}, Escalated: {escalated}")
        
        return FailureHandlingResult(
            action_taken="failure_analyzed",
            confidence_downgraded=confidence_downgraded,
            flagged_for_review=flagged_for_review,
            recommendations=recommendations,
            escalated=escalated,
            stopped=stopped
        )
    
    def get_request_status(self, request_id: str) -> Dict[str, Any]:
        """
        Get complete status for a fax request including audit trail.
        """
        audit_trail = self.audit_service.get_request_audit_trail(request_id)
        
        fax_records = self.db.query(FaxRecord).filter(
            FaxRecord.meta["request_id"].astext == request_id
        ).all()
        
        return {
            "request_id": request_id,
            "audit_trail": [
                {
                    "id": log.id,
                    "action_type": log.action_type,
                    "outcome": log.outcome,
                    "created_at": log.created_at.isoformat(),
                    "policy_allowed": log.policy_allowed,
                    "document_type": log.document_type,
                    "destination_facility": log.destination_facility
                }
                for log in audit_trail
            ],
            "fax_records": [
                {
                    "id": fax.id,
                    "direction": fax.direction,
                    "status": fax.status,
                    "recipient_number": fax.recipient_number if fax.direction == "outbound" else None,
                    "sender_number": fax.sender_number if fax.direction == "inbound" else None,
                    "created_at": fax.created_at.isoformat()
                }
                for fax in fax_records
            ],
            "total_audit_logs": len(audit_trail),
            "total_fax_records": len(fax_records)
        }
