from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from core.database import get_db
from models.founder_billing import (
    PatientStatement, StatementDelivery, BillingAuditLog, StatementEscalation,
    SoleBillerConfig, AIBillingDecision,
    StatementLifecycleState, DeliveryChannel
)
from services.founder_billing.sole_biller_service import SoleBillerService

router = APIRouter(prefix="/api/founder-billing", tags=["Founder Billing"])


class GenerateStatementRequest(BaseModel):
    patient_id: int
    call_id: Optional[int] = None
    charges: List[dict]
    insurance_paid: float
    adjustments: float


class StatementResponse(BaseModel):
    id: int
    statement_number: str
    patient_id: int
    total_charges: float
    balance_due: float
    lifecycle_state: str
    ai_generated: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeliveryResponse(BaseModel):
    id: int
    statement_id: int
    channel: str
    success: bool
    delivered_at: Optional[datetime]
    channel_selection_reason: str
    
    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    action_type: str
    action_description: str
    executed_by: str
    created_at: datetime
    metadata: dict
    
    class Config:
        from_attributes = True


class ConfigUpdateRequest(BaseModel):
    enabled: Optional[bool] = None
    auto_send_statements: Optional[bool] = None
    auto_escalate_overdue: Optional[bool] = None
    auto_offer_payment_plans: Optional[bool] = None
    ai_autonomous_approval_threshold: Optional[float] = None
    email_failover_to_mail: Optional[bool] = None
    failover_delay_hours: Optional[int] = None


def get_sole_biller_service(db: Session = Depends(get_db)) -> SoleBillerService:
    """Get SoleBillerService with active config."""
    config = db.query(SoleBillerConfig).filter_by(enabled=True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Sole Biller Mode not configured")
    return SoleBillerService(db, config)


@router.post("/statements/generate", response_model=StatementResponse)
async def generate_statement(
    request: GenerateStatementRequest,
    db: Session = Depends(get_db),
    service: SoleBillerService = Depends(get_sole_biller_service)
):
    """
    AI generates and processes patient statement autonomously.
    
    - Generates statement with itemized charges
    - Auto-finalizes if within autonomous threshold
    - Auto-sends if configured
    - Full audit trail logged
    """
    statement = service.generate_statement(
        patient_id=request.patient_id,
        call_id=request.call_id,
        charges=request.charges,
        insurance_paid=request.insurance_paid,
        adjustments=request.adjustments
    )
    db.commit()
    return statement


@router.post("/statements/{statement_id}/send", response_model=DeliveryResponse)
async def send_statement(
    statement_id: int,
    db: Session = Depends(get_db),
    service: SoleBillerService = Depends(get_sole_biller_service)
):
    """
    AI autonomously selects channel and sends statement.
    
    - Analyzes patient history and preferences
    - Selects optimal channel (email/mail/SMS)
    - Executes delivery
    - Logs decision rationale
    """
    delivery = service.send_statement(statement_id)
    db.commit()
    return delivery


@router.get("/statements", response_model=List[StatementResponse])
async def list_statements(
    patient_id: Optional[int] = None,
    lifecycle_state: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List patient statements with optional filters."""
    query = db.query(PatientStatement)
    
    if patient_id:
        query = query.filter(PatientStatement.patient_id == patient_id)
    if lifecycle_state:
        query = query.filter(PatientStatement.lifecycle_state == lifecycle_state)
    
    statements = query.order_by(PatientStatement.created_at.desc()).limit(limit).all()
    return statements


@router.get("/statements/{statement_id}")
async def get_statement_details(
    statement_id: int,
    db: Session = Depends(get_db)
):
    """Get complete statement details including deliveries and audit logs."""
    statement = db.query(PatientStatement).filter_by(id=statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    return {
        "statement": statement,
        "deliveries": statement.deliveries,
        "audit_logs": statement.audit_logs,
        "escalations": statement.escalations
    }


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    statement_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieve AI action audit logs.
    
    All logs include: "Action executed by AI agent under Founder billing authority"
    """
    query = db.query(BillingAuditLog)
    
    if statement_id:
        query = query.filter(BillingAuditLog.statement_id == statement_id)
    
    logs = query.order_by(BillingAuditLog.created_at.desc()).limit(limit).all()
    return logs


@router.get("/escalations")
async def get_escalations(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get statement escalations."""
    query = db.query(StatementEscalation)
    
    if active_only:
        query = query.filter(StatementEscalation.resolved == False)
    
    escalations = query.order_by(StatementEscalation.created_at.desc()).all()
    return escalations


@router.post("/process-failovers")
async def process_failovers(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    service: SoleBillerService = Depends(get_sole_biller_service)
):
    """
    Trigger AI to process delivery failovers.
    
    - Checks for failed email deliveries
    - Automatically escalates to physical mail
    - Logs autonomous decisions
    """
    service.process_failovers()
    db.commit()
    return {"status": "Failovers processed"}


@router.post("/process-escalations")
async def process_escalations(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    service: SoleBillerService = Depends(get_sole_biller_service)
):
    """
    Trigger AI to process overdue escalations.
    
    - Identifies overdue statements (30/60/90 days)
    - Sends follow-up communications
    - Offers payment plans automatically
    - Logs all autonomous actions
    """
    service.process_escalations()
    db.commit()
    return {"status": "Escalations processed"}


@router.get("/config")
async def get_config(db: Session = Depends(get_db)):
    """Get Sole Biller Mode configuration."""
    config = db.query(SoleBillerConfig).filter_by(enabled=True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return config


@router.put("/config")
async def update_config(
    request: ConfigUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update Sole Biller Mode configuration.
    
    Controls AI autonomous behavior boundaries:
    - Approval thresholds
    - Auto-send settings
    - Escalation rules
    - Channel preferences
    """
    config = db.query(SoleBillerConfig).filter_by(enabled=True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    return config


@router.get("/dashboard/metrics")
async def get_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Founder dashboard metrics.
    
    Real-time view of AI billing operations:
    - Statements generated today
    - Deliveries in progress
    - Escalations triggered
    - Revenue collected
    - AI decisions made
    """
    from sqlalchemy import func
    from datetime import date
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    metrics = {
        "statements_generated_today": db.query(func.count(PatientStatement.id)).filter(
            PatientStatement.created_at >= today_start,
            PatientStatement.ai_generated == True
        ).scalar(),
        
        "statements_sent_today": db.query(func.count(StatementDelivery.id)).filter(
            StatementDelivery.attempted_at >= today_start,
            StatementDelivery.success == True
        ).scalar(),
        
        "active_escalations": db.query(func.count(StatementEscalation.id)).filter(
            StatementEscalation.resolved == False
        ).scalar(),
        
        "total_balance_outstanding": db.query(func.sum(PatientStatement.balance_due)).filter(
            PatientStatement.balance_due > 0
        ).scalar() or 0,
        
        "ai_actions_today": db.query(func.count(BillingAuditLog.id)).filter(
            BillingAuditLog.created_at >= today_start
        ).scalar(),
        
        "email_success_rate": db.query(
            func.avg(func.cast(StatementDelivery.success, db.Integer))
        ).filter(
            StatementDelivery.channel == DeliveryChannel.EMAIL,
            StatementDelivery.attempted_at >= today_start
        ).scalar() or 0,
        
        "statements_by_state": dict(
            db.query(PatientStatement.lifecycle_state, func.count(PatientStatement.id))
            .group_by(PatientStatement.lifecycle_state)
            .all()
        )
    }
    
    return metrics


@router.get("/dashboard/recent-activity")
async def get_recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    """
    Recent AI actions for Founder dashboard.
    
    Shows real-time AI billing activities with full transparency.
    """
    recent_logs = db.query(BillingAuditLog).order_by(
        BillingAuditLog.created_at.desc()
    ).limit(limit).all()
    
    return [{
        "id": log.id,
        "timestamp": log.created_at,
        "action": log.action_type.value,
        "description": log.action_description,
        "executed_by": log.executed_by,
        "statement_number": log.statement.statement_number if log.statement else None,
        "metadata": log.metadata
    } for log in recent_logs]


@router.post("/statements/{statement_id}/override")
async def founder_override(
    statement_id: int,
    reason: str,
    db: Session = Depends(get_db)
):
    """
    Founder override of AI action.
    
    Allows Founder to intervene and override AI decisions.
    Preserves audit trail.
    """
    statement = db.query(PatientStatement).filter_by(id=statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    statement.founder_override = True
    statement.founder_override_reason = reason
    
    log = BillingAuditLog(
        statement_id=statement_id,
        action_type="founder_override",
        action_description=f"Founder overrode AI action. Reason: {reason}",
        executed_by="Founder (manual override)",
        founder_override=True,
        metadata={"reason": reason}
    )
    db.add(log)
    db.commit()
    
    return {"status": "Override recorded", "statement": statement}


@router.get("/lob/tracking/{lob_mail_id}")
async def get_lob_tracking(lob_mail_id: str, db: Session = Depends(get_db)):
    """Get Lob physical mail tracking details."""
    from models.founder_billing import LobMailJob
    
    job = db.query(LobMailJob).filter_by(lob_letter_id=lob_mail_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Mail job not found")
    
    return {
        "lob_letter_id": job.lob_letter_id,
        "status": job.status,
        "tracking_number": job.tracking_number,
        "expected_delivery": job.expected_delivery_date,
        "actual_delivery": job.delivery_date,
        "tracking_events": job.tracking_events,
        "cost": job.cost
    }
