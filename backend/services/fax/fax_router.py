"""
Fax Router - API Endpoints for Fax Orchestration System

Provides REST API for:
- Requesting document faxes
- Processing inbound fax webhooks
- Handling failures
- Viewing audit trails
- Request status tracking
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import get_current_user
from models.user import User
from services.fax.fax_orchestrator import FaxOrchestrator
from services.fax.ai_fax_policy_engine import DocumentType, WorkflowState
from services.fax.fax_audit_service import FaxAuditService
from utils.logger import logger


router = APIRouter(prefix="/api/fax", tags=["fax"])


# ============================================================================
# REQUEST MODELS
# ============================================================================

class FaxRequestPayload(BaseModel):
    """Request to send a fax"""
    incident_id: int
    document_type: DocumentType
    facility_name: str
    facility_address: str = ""
    workflow_state: WorkflowState
    patient_info: dict = Field(default_factory=dict)
    claim_id: Optional[int] = None
    training_mode: bool = False


class InboundFaxWebhook(BaseModel):
    """Webhook payload from fax provider"""
    provider: str = "srfax"
    provider_fax_id: str
    sender_number: str
    sender_name: str = ""
    page_count: int = 0
    document_url: str
    filename: str
    received_at: str
    meta: dict = Field(default_factory=dict)


class FailureHandlingPayload(BaseModel):
    """Report a fax failure"""
    request_id: str
    error: str
    error_type: str = "transmission_failure"
    fax_record_id: Optional[int] = None
    incident_id: Optional[int] = None


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class FaxRequestResponse(BaseModel):
    """Response from fax request"""
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


class InboundFaxResponse(BaseModel):
    """Response from inbound fax processing"""
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


class FailureHandlingResponse(BaseModel):
    """Response from failure handling"""
    action_taken: str
    confidence_downgraded: bool
    flagged_for_review: bool
    recommendations: List[str]
    escalated: bool
    stopped: bool


class AuditLogResponse(BaseModel):
    """Audit log entry"""
    id: int
    created_at: str
    action_type: str
    request_id: str
    incident_id: Optional[int]
    claim_id: Optional[int]
    policy_decision_id: str
    policy_allowed: bool
    policy_reference: str
    document_type: str
    destination_source_layer: Optional[int]
    destination_fax_number: str
    destination_facility: str
    destination_department: str
    outcome: str
    outcome_details: dict
    error_message: str
    user_id: Optional[int]
    ai_initiated: bool
    ai_confidence_score: int
    fax_record_id: Optional[int]
    audit_hash: str


class RequestStatusResponse(BaseModel):
    """Complete request status"""
    request_id: str
    audit_trail: List[dict]
    fax_records: List[dict]
    total_audit_logs: int
    total_fax_records: int


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/request", response_model=FaxRequestResponse)
async def request_fax(
    payload: FaxRequestPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request a fax to be sent through the orchestration system.
    
    Complete workflow:
    1. Policy validation
    2. Fax number resolution
    3. Timing rules check
    4. Fax sending
    5. Audit logging
    """
    try:
        orchestrator = FaxOrchestrator(
            db=db,
            org_id=current_user.org_id,
            user_id=current_user.id
        )
        
        result = await orchestrator.request_document(
            incident_id=payload.incident_id,
            document_type=payload.document_type,
            facility_name=payload.facility_name,
            patient_info=payload.patient_info,
            workflow_state=payload.workflow_state,
            facility_address=payload.facility_address,
            claim_id=payload.claim_id,
            ai_initiated=False,  # User-initiated
            training_mode=payload.training_mode
        )
        
        return FaxRequestResponse(
            success=result.success,
            request_id=result.request_id,
            policy_allowed=result.policy_allowed,
            resolution_success=result.resolution_success,
            timing_allowed=result.timing_allowed,
            fax_sent=result.fax_sent,
            requires_review=result.requires_review,
            fax_record_id=result.fax_record_id,
            outcome=result.outcome,
            message=result.message,
            next_steps=result.next_steps,
            audit_log_ids=result.audit_log_ids
        )
        
    except Exception as e:
        logger.error(f"Error in request_fax: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/inbound", response_model=InboundFaxResponse)
async def process_inbound_fax(
    payload: InboundFaxWebhook,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for inbound fax processing.
    Called by fax provider (SRFax, Twilio, etc.)
    
    Processes:
    1. Store fax record
    2. Classify document
    3. Match to outbound request
    4. Update workflows
    5. Audit logging
    """
    try:
        # Use system org_id for webhook processing
        # Actual org would be determined by receiving fax number
        orchestrator = FaxOrchestrator(
            db=db,
            org_id=1,  # TODO: Lookup org by receiving fax number
            user_id=None
        )
        
        result = await orchestrator.process_inbound_fax(
            webhook_data=payload.dict(),
            training_mode=False
        )
        
        return InboundFaxResponse(
            success=result.success,
            fax_record_id=result.fax_record_id,
            classified=result.classified,
            document_type=result.document_type,
            matched_to_request=result.matched_to_request,
            request_id=result.request_id,
            incident_id=result.incident_id,
            requires_review=result.requires_review,
            outcome=result.outcome,
            message=result.message,
            audit_log_id=result.audit_log_id
        )
        
    except Exception as e:
        logger.error(f"Error in process_inbound_fax: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/failure", response_model=FailureHandlingResponse)
async def handle_failure(
    payload: FailureHandlingPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Handle fax failure scenarios.
    
    AI will:
    1. Stop
    2. Downgrade confidence
    3. Flag for review
    4. Recommend next steps (NEVER execute them)
    """
    try:
        orchestrator = FaxOrchestrator(
            db=db,
            org_id=current_user.org_id,
            user_id=current_user.id
        )
        
        result = await orchestrator.handle_failure(
            request_id=payload.request_id,
            error=payload.error,
            error_type=payload.error_type,
            fax_record_id=payload.fax_record_id,
            incident_id=payload.incident_id
        )
        
        return FailureHandlingResponse(
            action_taken=result.action_taken,
            confidence_downgraded=result.confidence_downgraded,
            flagged_for_review=result.flagged_for_review,
            recommendations=result.recommendations,
            escalated=result.escalated,
            stopped=result.stopped
        )
        
    except Exception as e:
        logger.error(f"Error in handle_failure: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/request/{request_id}", response_model=RequestStatusResponse)
async def get_request_status(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete status and audit trail for a fax request.
    """
    try:
        orchestrator = FaxOrchestrator(
            db=db,
            org_id=current_user.org_id,
            user_id=current_user.id
        )
        
        status = orchestrator.get_request_status(request_id)
        
        return RequestStatusResponse(**status)
        
    except Exception as e:
        logger.error(f"Error in get_request_status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/incident/{incident_id}", response_model=List[AuditLogResponse])
async def get_incident_audit_trail(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete audit trail for all fax operations on an incident.
    """
    try:
        audit_service = FaxAuditService(db, current_user.org_id)
        logs = audit_service.get_incident_audit_trail(incident_id)
        
        return [
            AuditLogResponse(
                id=log.id,
                created_at=log.created_at.isoformat(),
                action_type=log.action_type,
                request_id=log.request_id,
                incident_id=log.incident_id,
                claim_id=log.claim_id,
                policy_decision_id=log.policy_decision_id,
                policy_allowed=log.policy_allowed,
                policy_reference=log.policy_reference,
                document_type=log.document_type,
                destination_source_layer=log.destination_source_layer,
                destination_fax_number=log.destination_fax_number,
                destination_facility=log.destination_facility,
                destination_department=log.destination_department,
                outcome=log.outcome,
                outcome_details=log.outcome_details,
                error_message=log.error_message,
                user_id=log.user_id,
                ai_initiated=log.ai_initiated,
                ai_confidence_score=log.ai_confidence_score,
                fax_record_id=log.fax_record_id,
                audit_hash=log.audit_hash
            )
            for log in logs
        ]
        
    except Exception as e:
        logger.error(f"Error in get_incident_audit_trail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/claim/{claim_id}", response_model=List[AuditLogResponse])
async def get_claim_audit_trail(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete audit trail for all fax operations on a claim.
    """
    try:
        audit_service = FaxAuditService(db, current_user.org_id)
        logs = audit_service.get_claim_audit_trail(claim_id)
        
        return [
            AuditLogResponse(
                id=log.id,
                created_at=log.created_at.isoformat(),
                action_type=log.action_type,
                request_id=log.request_id,
                incident_id=log.incident_id,
                claim_id=log.claim_id,
                policy_decision_id=log.policy_decision_id,
                policy_allowed=log.policy_allowed,
                policy_reference=log.policy_reference,
                document_type=log.document_type,
                destination_source_layer=log.destination_source_layer,
                destination_fax_number=log.destination_fax_number,
                destination_facility=log.destination_facility,
                destination_department=log.destination_department,
                outcome=log.outcome,
                outcome_details=log.outcome_details,
                error_message=log.error_message,
                user_id=log.user_id,
                ai_initiated=log.ai_initiated,
                ai_confidence_score=log.ai_confidence_score,
                fax_record_id=log.fax_record_id,
                audit_hash=log.audit_hash
            )
            for log in logs
        ]
        
    except Exception as e:
        logger.error(f"Error in get_claim_audit_trail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/summary")
async def get_audit_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit summary statistics for fax operations.
    """
    try:
        audit_service = FaxAuditService(db, current_user.org_id)
        
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None
        
        summary = audit_service.get_audit_summary(
            start_date=start,
            end_date=end,
            action_type=action_type,
            document_type=document_type
        )
        
        return summary
        
    except Exception as e:
        logger.error(f"Error in get_audit_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audit/verify/{audit_log_id}")
async def verify_audit_integrity(
    audit_log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verify audit log integrity (tamper detection).
    """
    try:
        from models.fax import FaxAuditLog
        
        audit_log = db.query(FaxAuditLog).filter(
            FaxAuditLog.id == audit_log_id,
            FaxAuditLog.org_id == current_user.org_id
        ).first()
        
        if not audit_log:
            raise HTTPException(status_code=404, detail="Audit log not found")
        
        audit_service = FaxAuditService(db, current_user.org_id)
        is_valid = audit_service.verify_audit_integrity(audit_log)
        
        return {
            "audit_log_id": audit_log_id,
            "is_valid": is_valid,
            "message": "Audit log integrity verified" if is_valid else "Audit log has been tampered with"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_audit_integrity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/telnyx")
async def telnyx_fax_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Telnyx-specific fax webhook endpoint.
    Handles fax.received and fax.status events from Telnyx.
    """
    try:
        body = await request.json()
        event_type = body.get('data', {}).get('event_type', 'unknown')
        payload = body.get('data', {}).get('payload', {})
        fax_id = payload.get('fax_id') or payload.get('id', 'unknown')
        
        logger.info(f"Telnyx fax webhook: {event_type} for fax_id={fax_id}")
        
        if event_type == 'fax.received':
            from_number = payload.get('from', {}).get('phone_number', '')
            to_number = payload.get('to', '')
            pages = payload.get('page_count', 0)
            media_url = payload.get('media_url', '')
            
            from models.telnyx import TelnyxFaxRecord
            record = TelnyxFaxRecord(
                org_id=1,
                fax_sid=fax_id,
                sender_number=from_number,
                status='received',
                classification='INBOUND',
                fax_metadata={
                    'event_type': event_type,
                    'from': from_number,
                    'to': to_number,
                    'pages': pages,
                    'media_url': media_url,
                    'raw_payload': payload
                }
            )
            db.add(record)
            db.commit()
            logger.info(f"Stored inbound fax from {from_number}: {fax_id}")
        
        return {"status": "ok", "event_type": event_type, "fax_id": fax_id}
        
    except Exception as e:
        logger.error(f"Telnyx webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}
