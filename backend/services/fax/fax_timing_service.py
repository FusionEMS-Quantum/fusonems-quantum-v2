"""
Fax Timing and Escalation Control Service
Section VI: Timing Rules
Section VII: Escalation Limits
Anti-spam compliance engine
"""
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from models.fax import FaxAttemptLog, DocumentType


class SuppressionReason(str, Enum):
    RESPONSE_RECEIVED = "response_received"
    RECIPIENT_REQUESTED = "recipient_requested_no_fax"
    WORKFLOW_UNBLOCKED = "workflow_state_changed"
    DOCUMENT_RECEIVED = "document_received_other_channel"
    ESCALATION_LIMIT = "escalation_limit_reached"
    TIMING_VIOLATION = "timing_rule_violation"


@dataclass
class TimingDecision:
    can_send: bool
    next_allowed_time: Optional[datetime]
    reason: str
    attempt_number: int
    escalation_limit_reached: bool
    suppressed: bool
    suppression_reason: Optional[str]


class FaxTimingService:
    """
    Enforces timing rules and escalation limits for automated fax operations.
    Prevents spam and ensures compliance with Section VI and VII.
    """
    
    # Section VI: Initial Wait Periods (hours)
    INITIAL_WAIT_PERIODS = {
        DocumentType.PCS: 24,
        DocumentType.AUTHORIZATION: 24,
        DocumentType.MEDICAL_RECORDS: 48,
        DocumentType.DENIAL_DOCUMENTATION: 24,
        DocumentType.BILL: 24,  # Default
        DocumentType.CLAIM: 24,  # Default
    }
    
    # Section VI: Minimum interval between attempts (hours)
    MINIMUM_INTERVAL_HOURS = 72
    
    # Section VII: Maximum attempts per document type
    ESCALATION_LIMITS = {
        DocumentType.PCS: 3,
        DocumentType.AUTHORIZATION: 3,
        DocumentType.MEDICAL_RECORDS: 2,
        DocumentType.DENIAL_DOCUMENTATION: 2,
        DocumentType.BILL: 3,  # Default
        DocumentType.CLAIM: 3,  # Default
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def can_send_fax(
        self,
        request_id: str,
        document_type: DocumentType,
        request_created_at: datetime,
        fax_only_channel: bool = False
    ) -> TimingDecision:
        """
        Determines if a fax can be sent based on timing rules and escalation limits.
        
        Args:
            request_id: Unique identifier for the request
            document_type: Type of document being faxed
            request_created_at: When the original request was created
            fax_only_channel: True if fax is the ONLY supported channel
            
        Returns:
            TimingDecision with can_send flag and detailed reasoning
        """
        now = datetime.utcnow()
        
        # Check suppression conditions first
        suppression_check = self.check_suppression(request_id)
        if suppression_check["suppressed"]:
            return TimingDecision(
                can_send=False,
                next_allowed_time=None,
                reason=f"Suppressed: {suppression_check['reason']}",
                attempt_number=suppression_check["attempt_count"],
                escalation_limit_reached=True,
                suppressed=True,
                suppression_reason=suppression_check["reason"]
            )
        
        # Get attempt history
        attempts = self.db.query(FaxAttemptLog).filter(
            FaxAttemptLog.request_id == request_id
        ).order_by(desc(FaxAttemptLog.timestamp)).all()
        
        attempt_count = len([a for a in attempts if a.outcome == "sent"])
        
        # Check escalation limits (Section VII)
        max_attempts = self.ESCALATION_LIMITS.get(document_type, 3)
        if attempt_count >= max_attempts:
            return TimingDecision(
                can_send=False,
                next_allowed_time=None,
                reason=f"Escalation limit reached: {attempt_count}/{max_attempts} attempts",
                attempt_number=attempt_count,
                escalation_limit_reached=True,
                suppressed=False,
                suppression_reason=None
            )
        
        # If fax is the only channel, allow immediate send on first attempt
        if fax_only_channel and attempt_count == 0:
            return TimingDecision(
                can_send=True,
                next_allowed_time=now,
                reason="Fax-only channel: immediate send allowed",
                attempt_number=attempt_count + 1,
                escalation_limit_reached=False,
                suppressed=False,
                suppression_reason=None
            )
        
        # Check initial wait period (Section VI)
        if attempt_count == 0:
            initial_wait_hours = self.INITIAL_WAIT_PERIODS.get(document_type, 24)
            earliest_send_time = request_created_at + timedelta(hours=initial_wait_hours)
            
            if now < earliest_send_time:
                return TimingDecision(
                    can_send=False,
                    next_allowed_time=earliest_send_time,
                    reason=f"Initial wait period: {initial_wait_hours}h from request creation",
                    attempt_number=1,
                    escalation_limit_reached=False,
                    suppressed=False,
                    suppression_reason=None
                )
        
        # Check minimum interval between attempts (Section VI)
        if attempts:
            last_attempt = attempts[0]  # Already ordered by timestamp desc
            if last_attempt.outcome == "sent":
                next_allowed = last_attempt.timestamp + timedelta(hours=self.MINIMUM_INTERVAL_HOURS)
                
                if now < next_allowed:
                    return TimingDecision(
                        can_send=False,
                        next_allowed_time=next_allowed,
                        reason=f"Minimum interval: {self.MINIMUM_INTERVAL_HOURS}h between attempts",
                        attempt_number=attempt_count + 1,
                        escalation_limit_reached=False,
                        suppressed=False,
                        suppression_reason=None
                    )
        
        # All checks passed
        return TimingDecision(
            can_send=True,
            next_allowed_time=now,
            reason=f"Timing rules satisfied: attempt {attempt_count + 1}/{max_attempts}",
            attempt_number=attempt_count + 1,
            escalation_limit_reached=False,
            suppressed=False,
            suppression_reason=None
        )
    
    def record_attempt(
        self,
        request_id: str,
        document_type: DocumentType,
        outcome: str,
        next_allowed_time: Optional[datetime] = None,
        escalation_limit_reached: bool = False,
        suppressed: bool = False,
        suppression_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> FaxAttemptLog:
        """
        Records a fax attempt with timestamp and outcome.
        
        Args:
            request_id: Unique identifier for the request
            document_type: Type of document
            outcome: Result of attempt (sent, failed, suppressed)
            next_allowed_time: When next attempt can be made
            escalation_limit_reached: Whether limit was reached
            suppressed: Whether attempt was suppressed
            suppression_reason: Reason for suppression
            metadata: Additional audit data
            
        Returns:
            Created FaxAttemptLog record
        """
        # Get current attempt number
        attempt_count = self.db.query(FaxAttemptLog).filter(
            FaxAttemptLog.request_id == request_id
        ).count()
        
        log_entry = FaxAttemptLog(
            request_id=request_id,
            document_type=document_type,
            attempt_number=attempt_count + 1,
            timestamp=datetime.utcnow(),
            outcome=outcome,
            next_allowed_time=next_allowed_time,
            escalation_limit_reached=escalation_limit_reached,
            suppressed=suppressed,
            suppression_reason=suppression_reason,
            metadata=metadata or {}
        )
        
        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)
        
        return log_entry
    
    def check_suppression(self, request_id: str) -> Dict[str, Any]:
        """
        Checks all suppression conditions for a request.
        
        Returns dict with:
            - suppressed: bool
            - reason: Optional[str]
            - attempt_count: int
        """
        # Check if already marked as suppressed in log
        suppressed_log = self.db.query(FaxAttemptLog).filter(
            and_(
                FaxAttemptLog.request_id == request_id,
                FaxAttemptLog.suppressed == True
            )
        ).first()
        
        if suppressed_log:
            attempt_count = self.db.query(FaxAttemptLog).filter(
                FaxAttemptLog.request_id == request_id
            ).count()
            
            return {
                "suppressed": True,
                "reason": suppressed_log.suppression_reason or "Previously suppressed",
                "attempt_count": attempt_count
            }
        
        # Check if escalation limit reached
        attempts = self.db.query(FaxAttemptLog).filter(
            FaxAttemptLog.request_id == request_id
        ).all()
        
        attempt_count = len([a for a in attempts if a.outcome == "sent"])
        
        for attempt in attempts:
            if attempt.escalation_limit_reached:
                return {
                    "suppressed": True,
                    "reason": SuppressionReason.ESCALATION_LIMIT,
                    "attempt_count": attempt_count
                }
        
        # No suppression conditions met
        return {
            "suppressed": False,
            "reason": None,
            "attempt_count": attempt_count
        }
    
    def suppress_request(
        self,
        request_id: str,
        reason: SuppressionReason,
        document_type: DocumentType
    ) -> None:
        """
        Manually suppresses a request to prevent further fax attempts.
        
        Used when:
        - Response is received
        - Recipient requests no further fax
        - Workflow state changes (unblocked)
        - Document received through another channel
        """
        self.record_attempt(
            request_id=request_id,
            document_type=document_type,
            outcome="suppressed",
            suppressed=True,
            suppression_reason=reason,
            metadata={"manual_suppression": True}
        )
    
    def get_attempt_history(self, request_id: str) -> list[FaxAttemptLog]:
        """
        Retrieves complete attempt history for audit purposes.
        """
        return self.db.query(FaxAttemptLog).filter(
            FaxAttemptLog.request_id == request_id
        ).order_by(FaxAttemptLog.timestamp).all()
    
    def get_timing_summary(self, request_id: str) -> Dict[str, Any]:
        """
        Returns a summary of timing and escalation status for a request.
        """
        attempts = self.get_attempt_history(request_id)
        
        if not attempts:
            return {
                "total_attempts": 0,
                "successful_sends": 0,
                "last_attempt": None,
                "next_allowed": None,
                "suppressed": False,
                "escalation_limit_reached": False
            }
        
        successful_sends = [a for a in attempts if a.outcome == "sent"]
        last_attempt = attempts[-1]
        
        return {
            "total_attempts": len(attempts),
            "successful_sends": len(successful_sends),
            "last_attempt": last_attempt.timestamp,
            "next_allowed": last_attempt.next_allowed_time,
            "suppressed": last_attempt.suppressed,
            "escalation_limit_reached": last_attempt.escalation_limit_reached,
            "suppression_reason": last_attempt.suppression_reason
        }
