"""
Fax Audit Logging Service - IMMUTABLE Audit Trail for All Fax Operations

Section X Compliance: Every fax action must be logged with complete context.

Core Principles:
1. IMMUTABLE - Audit logs cannot be modified or deleted
2. COMPLETE - Every fax action is logged with full context
3. TAMPER-PROOF - SHA256 hash verification
4. TRACEABLE - Request ID links all related actions
5. COMPLIANT - Healthcare audit trail requirements

Audit Requirements:
- Why fax was initiated
- Which policy allowed it
- Document type
- Destination source layer
- Timestamp
- Outcome
- Original fax images and metadata preserved
"""

import hashlib
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from models.fax import FaxAuditLog, FaxRecord, FaxResolutionHistory
from utils.logger import logger


class FaxAuditService:
    """
    Comprehensive audit logging for all fax operations.
    Ensures complete traceability and compliance.
    """
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
    
    def _generate_audit_hash(
        self,
        request_id: str,
        action_type: str,
        timestamp: datetime,
        outcome: str,
        policy_decision_id: str
    ) -> str:
        """
        Generate SHA256 hash for tamper detection.
        Hash includes key immutable fields.
        """
        hash_input = f"{request_id}:{action_type}:{timestamp.isoformat()}:{outcome}:{policy_decision_id}"
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    def log_policy_check(
        self,
        request_id: str,
        policy_decision_id: str,
        document_type: str,
        policy_allowed: bool,
        policy_reference: str,
        incident_id: Optional[int] = None,
        claim_id: Optional[int] = None,
        workflow_state: str = "",
        user_id: Optional[int] = None,
        ai_initiated: bool = True,
        outcome_details: Optional[Dict[str, Any]] = None,
        training_mode: bool = False
    ) -> FaxAuditLog:
        """
        Log policy evaluation for fax operation.
        
        Records:
        - Policy decision
        - Allowed/denied status
        - Context that triggered check
        """
        timestamp = datetime.utcnow()
        outcome = "approved" if policy_allowed else "denied"
        
        audit_hash = self._generate_audit_hash(
            request_id, "policy_check", timestamp, outcome, policy_decision_id
        )
        
        audit_log = FaxAuditLog(
            org_id=self.org_id,
            created_at=timestamp,
            action_type="policy_check",
            request_id=request_id,
            incident_id=incident_id,
            claim_id=claim_id,
            policy_decision_id=policy_decision_id,
            policy_allowed=policy_allowed,
            policy_reference=policy_reference,
            document_type=document_type,
            outcome=outcome,
            outcome_details=outcome_details or {},
            user_id=user_id,
            ai_initiated=ai_initiated,
            workflow_state=workflow_state,
            audit_hash=audit_hash,
            training_mode=training_mode
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        logger.info(f"Audit logged: policy_check for request {request_id} - {outcome}")
        return audit_log
    
    def log_resolution_attempt(
        self,
        request_id: str,
        policy_decision_id: str,
        document_type: str,
        facility_name: str,
        resolved: bool,
        source_layer: Optional[int],
        fax_number: Optional[str],
        department: str,
        requires_human_review: bool,
        resolution_history_id: Optional[int] = None,
        incident_id: Optional[int] = None,
        confidence_score: int = 0,
        resolution_context: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        ai_initiated: bool = True,
        training_mode: bool = False
    ) -> FaxAuditLog:
        """
        Log fax number resolution attempt.
        
        Records:
        - Which source layer was used
        - Confidence score
        - Whether human review is required
        - Complete resolution context
        """
        timestamp = datetime.utcnow()
        
        if resolved and not requires_human_review:
            outcome = "success"
        elif resolved and requires_human_review:
            outcome = "pending_review"
        else:
            outcome = "failed"
        
        audit_hash = self._generate_audit_hash(
            request_id, "resolution", timestamp, outcome, policy_decision_id
        )
        
        audit_log = FaxAuditLog(
            org_id=self.org_id,
            created_at=timestamp,
            action_type="resolution",
            request_id=request_id,
            incident_id=incident_id,
            policy_decision_id=policy_decision_id,
            policy_allowed=resolved,
            policy_reference=f"Layer {source_layer} resolution" if source_layer else "No resolution",
            document_type=document_type,
            destination_source_layer=source_layer,
            destination_fax_number=fax_number or "",
            destination_facility=facility_name,
            destination_department=department,
            outcome=outcome,
            outcome_details={
                "requires_human_review": requires_human_review,
                "confidence_score": confidence_score
            },
            resolution_history_id=resolution_history_id,
            user_id=user_id,
            ai_initiated=ai_initiated,
            ai_confidence_score=confidence_score,
            resolution_context=resolution_context or {},
            audit_hash=audit_hash,
            training_mode=training_mode
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        logger.info(f"Audit logged: resolution for request {request_id} - {outcome}")
        return audit_log
    
    def log_send_attempt(
        self,
        request_id: str,
        policy_decision_id: str,
        document_type: str,
        fax_number: str,
        facility_name: str,
        department: str,
        source_layer: int,
        fax_record_id: int,
        success: bool,
        incident_id: Optional[int] = None,
        claim_id: Optional[int] = None,
        error_message: str = "",
        error_code: str = "",
        timing_context: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        ai_initiated: bool = True,
        training_mode: bool = False
    ) -> FaxAuditLog:
        """
        Log fax send attempt.
        
        Records:
        - Destination details
        - Success/failure
        - Timing constraints
        - Error details if failed
        """
        timestamp = datetime.utcnow()
        outcome = "success" if success else "failed"
        
        audit_hash = self._generate_audit_hash(
            request_id, "send_attempt", timestamp, outcome, policy_decision_id
        )
        
        audit_log = FaxAuditLog(
            org_id=self.org_id,
            created_at=timestamp,
            action_type="send_attempt",
            request_id=request_id,
            incident_id=incident_id,
            claim_id=claim_id,
            policy_decision_id=policy_decision_id,
            policy_allowed=True,
            policy_reference=f"Layer {source_layer} authorized send",
            document_type=document_type,
            destination_source_layer=source_layer,
            destination_fax_number=fax_number,
            destination_facility=facility_name,
            destination_department=department,
            outcome=outcome,
            outcome_details={
                "fax_record_id": fax_record_id,
                "success": success
            },
            error_message=error_message,
            error_code=error_code,
            fax_record_id=fax_record_id,
            timing_context=timing_context or {},
            user_id=user_id,
            ai_initiated=ai_initiated,
            audit_hash=audit_hash,
            training_mode=training_mode
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        logger.info(f"Audit logged: send_attempt for request {request_id} - {outcome}")
        return audit_log
    
    def log_receive(
        self,
        request_id: str,
        policy_decision_id: str,
        document_type: str,
        fax_record_id: int,
        sender_number: str,
        facility_name: str = "",
        incident_id: Optional[int] = None,
        claim_id: Optional[int] = None,
        matched_to_request: bool = False,
        classification_confidence: int = 0,
        outcome_details: Optional[Dict[str, Any]] = None,
        training_mode: bool = False
    ) -> FaxAuditLog:
        """
        Log inbound fax receipt.
        
        Records:
        - Sender information
        - Classification result
        - Match to outbound request (if applicable)
        """
        timestamp = datetime.utcnow()
        outcome = "success"
        
        audit_hash = self._generate_audit_hash(
            request_id, "receive", timestamp, outcome, policy_decision_id
        )
        
        audit_log = FaxAuditLog(
            org_id=self.org_id,
            created_at=timestamp,
            action_type="receive",
            request_id=request_id,
            incident_id=incident_id,
            claim_id=claim_id,
            policy_decision_id=policy_decision_id,
            policy_allowed=True,
            policy_reference="Inbound fax received",
            document_type=document_type,
            destination_fax_number=sender_number,
            destination_facility=facility_name,
            outcome=outcome,
            outcome_details=outcome_details or {
                "matched_to_request": matched_to_request,
                "classification_confidence": classification_confidence
            },
            fax_record_id=fax_record_id,
            ai_initiated=False,
            ai_confidence_score=classification_confidence,
            audit_hash=audit_hash,
            training_mode=training_mode
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        logger.info(f"Audit logged: receive for request {request_id}")
        return audit_log
    
    def log_human_review(
        self,
        request_id: str,
        policy_decision_id: str,
        document_type: str,
        review_action: str,
        user_id: int,
        incident_id: Optional[int] = None,
        claim_id: Optional[int] = None,
        fax_record_id: Optional[int] = None,
        outcome_details: Optional[Dict[str, Any]] = None,
        training_mode: bool = False
    ) -> FaxAuditLog:
        """
        Log human review action.
        
        Records:
        - Reviewer identity
        - Review decision
        - Action taken
        """
        timestamp = datetime.utcnow()
        outcome = review_action  # approved, rejected, escalated, etc.
        
        audit_hash = self._generate_audit_hash(
            request_id, "review", timestamp, outcome, policy_decision_id
        )
        
        audit_log = FaxAuditLog(
            org_id=self.org_id,
            created_at=timestamp,
            action_type="review",
            request_id=request_id,
            incident_id=incident_id,
            claim_id=claim_id,
            policy_decision_id=policy_decision_id,
            policy_allowed=True,
            policy_reference="Human review performed",
            document_type=document_type,
            outcome=outcome,
            outcome_details=outcome_details or {},
            fax_record_id=fax_record_id,
            user_id=user_id,
            ai_initiated=False,
            audit_hash=audit_hash,
            training_mode=training_mode
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        logger.info(f"Audit logged: review by user {user_id} for request {request_id} - {outcome}")
        return audit_log
    
    def log_suppression(
        self,
        request_id: str,
        policy_decision_id: str,
        document_type: str,
        suppression_reason: str,
        incident_id: Optional[int] = None,
        claim_id: Optional[int] = None,
        user_id: Optional[int] = None,
        outcome_details: Optional[Dict[str, Any]] = None,
        training_mode: bool = False
    ) -> FaxAuditLog:
        """
        Log fax suppression (AI chose not to send).
        
        Records:
        - Why fax was suppressed
        - Policy/timing constraints that prevented send
        - "No action" is valid outcome
        """
        timestamp = datetime.utcnow()
        outcome = "suppressed"
        
        audit_hash = self._generate_audit_hash(
            request_id, "suppression", timestamp, outcome, policy_decision_id
        )
        
        audit_log = FaxAuditLog(
            org_id=self.org_id,
            created_at=timestamp,
            action_type="suppression",
            request_id=request_id,
            incident_id=incident_id,
            claim_id=claim_id,
            policy_decision_id=policy_decision_id,
            policy_allowed=False,
            policy_reference=suppression_reason,
            document_type=document_type,
            outcome=outcome,
            outcome_details=outcome_details or {"reason": suppression_reason},
            user_id=user_id,
            ai_initiated=True,
            audit_hash=audit_hash,
            training_mode=training_mode
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        logger.info(f"Audit logged: suppression for request {request_id} - {suppression_reason}")
        return audit_log
    
    def get_request_audit_trail(self, request_id: str) -> List[FaxAuditLog]:
        """
        Retrieve complete audit trail for a request ID.
        Returns all logs in chronological order.
        """
        return self.db.query(FaxAuditLog).filter(
            and_(
                FaxAuditLog.org_id == self.org_id,
                FaxAuditLog.request_id == request_id
            )
        ).order_by(FaxAuditLog.created_at.asc()).all()
    
    def get_incident_audit_trail(self, incident_id: int) -> List[FaxAuditLog]:
        """
        Retrieve all fax audit logs for an incident.
        """
        return self.db.query(FaxAuditLog).filter(
            and_(
                FaxAuditLog.org_id == self.org_id,
                FaxAuditLog.incident_id == incident_id
            )
        ).order_by(FaxAuditLog.created_at.asc()).all()
    
    def get_claim_audit_trail(self, claim_id: int) -> List[FaxAuditLog]:
        """
        Retrieve all fax audit logs for a claim.
        """
        return self.db.query(FaxAuditLog).filter(
            and_(
                FaxAuditLog.org_id == self.org_id,
                FaxAuditLog.claim_id == claim_id
            )
        ).order_by(FaxAuditLog.created_at.asc()).all()
    
    def verify_audit_integrity(self, audit_log: FaxAuditLog) -> bool:
        """
        Verify audit log has not been tampered with by recomputing hash.
        """
        expected_hash = self._generate_audit_hash(
            audit_log.request_id,
            audit_log.action_type,
            audit_log.created_at,
            audit_log.outcome,
            audit_log.policy_decision_id
        )
        
        is_valid = expected_hash == audit_log.audit_hash
        
        if not is_valid:
            logger.error(f"Audit integrity violation detected for log ID {audit_log.id}")
        
        return is_valid
    
    def get_audit_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action_type: Optional[str] = None,
        document_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate audit summary report with statistics.
        """
        query = self.db.query(FaxAuditLog).filter(
            FaxAuditLog.org_id == self.org_id
        )
        
        if start_date:
            query = query.filter(FaxAuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(FaxAuditLog.created_at <= end_date)
        if action_type:
            query = query.filter(FaxAuditLog.action_type == action_type)
        if document_type:
            query = query.filter(FaxAuditLog.document_type == document_type)
        
        logs = query.all()
        
        summary = {
            "total_logs": len(logs),
            "by_action_type": {},
            "by_outcome": {},
            "by_document_type": {},
            "ai_initiated_count": 0,
            "human_initiated_count": 0,
            "policy_denied_count": 0,
            "requires_review_count": 0,
            "training_mode_count": 0
        }
        
        for log in logs:
            # Count by action type
            summary["by_action_type"][log.action_type] = \
                summary["by_action_type"].get(log.action_type, 0) + 1
            
            # Count by outcome
            summary["by_outcome"][log.outcome] = \
                summary["by_outcome"].get(log.outcome, 0) + 1
            
            # Count by document type
            summary["by_document_type"][log.document_type] = \
                summary["by_document_type"].get(log.document_type, 0) + 1
            
            # Count initiator
            if log.ai_initiated:
                summary["ai_initiated_count"] += 1
            else:
                summary["human_initiated_count"] += 1
            
            # Count policy denied
            if not log.policy_allowed:
                summary["policy_denied_count"] += 1
            
            # Count pending review
            if log.outcome == "pending_review":
                summary["requires_review_count"] += 1
            
            # Count training mode
            if log.training_mode:
                summary["training_mode_count"] += 1
        
        return summary
