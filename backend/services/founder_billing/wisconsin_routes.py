from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from core.database import get_db
from models.wisconsin_billing import (
    PatientStatementTemplate, WisconsinBillingConfig, BillingHealthSnapshot,
    StatementDeliveryLog, CollectionsEscalationRecord, AIBillingActionLog,
    TemplateType, TemplateTone, BillingHealthStatus
)
from services.founder_billing.wisconsin_service import WisconsinBillingService

router = APIRouter(prefix="/api/wisconsin-billing", tags=["Wisconsin Billing"])


class TemplateResponse(BaseModel):
    id: int
    template_type: str
    template_name: str
    version: int
    subject_line: str
    body_content: str
    tone: str
    active: bool
    approved: bool
    usage_count: int
    
    class Config:
        from_attributes = True


class TemplateCreateRequest(BaseModel):
    template_type: str
    template_name: str
    subject_line: str
    body_content: str
    tone: str = "neutral"


class TemplateUpdateRequest(BaseModel):
    subject_line: Optional[str] = None
    body_content: Optional[str] = None
    tone: Optional[str] = None


class HealthDashboardResponse(BaseModel):
    overall_status: str
    status_reason: str
    monthly_snapshot: dict
    delivery_health: dict
    collections_risk: dict
    tax_compliance: dict
    ai_explanation: str


class ConfigUpdateRequest(BaseModel):
    medical_transport_tax_rate: Optional[float] = None
    taxable_memberships: Optional[bool] = None
    taxable_subscriptions: Optional[bool] = None
    company_name: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None


def get_wisconsin_service(db: Session = Depends(get_db)) -> WisconsinBillingService:
    """Get Wisconsin Billing Service."""
    return WisconsinBillingService(db)


@router.get("/dashboard/health", response_model=HealthDashboardResponse)
async def get_billing_health_dashboard(
    db: Session = Depends(get_db),
    service: WisconsinBillingService = Depends(get_wisconsin_service)
):
    """
    Founder's Billing Health Dashboard.
    
    Answers: Is billing healthy, stable, and under control?
    
    Returns:
    - Overall status (healthy/attention_needed/at_risk)
    - Monthly snapshot (charges, payments, collection rate)
    - Delivery health (email/mail success rates)
    - Collections risk (aging, escalations)
    - Tax compliance (exempt revenue, reporting status)
    - AI explanation (one-sentence summary)
    """
    snapshot = service.generate_health_snapshot()
    db.commit()
    
    return {
        "overall_status": snapshot.overall_status.value,
        "status_reason": snapshot.status_reason,
        "monthly_snapshot": {
            "total_charges_billed": snapshot.total_charges_billed,
            "total_payments_collected": snapshot.total_payments_collected,
            "net_outstanding_balance": snapshot.net_outstanding_balance,
            "collection_rate": snapshot.collection_rate,
            "average_days_to_pay": snapshot.average_days_to_pay
        },
        "delivery_health": {
            "statements_generated": snapshot.statements_generated,
            "emails_delivered": snapshot.emails_delivered,
            "emails_bounced": snapshot.emails_bounced,
            "physical_mail_sent": snapshot.physical_mail_sent,
            "physical_mail_delivered": snapshot.physical_mail_delivered,
            "delivery_failures": snapshot.delivery_failures
        },
        "collections_risk": {
            "aging_0_30_days": snapshot.aging_0_30_days,
            "aging_31_60_days": snapshot.aging_31_60_days,
            "aging_61_90_days": snapshot.aging_61_90_days,
            "aging_over_90_days": snapshot.aging_over_90_days,
            "high_risk_balances": snapshot.high_risk_balances,
            "active_escalations": snapshot.active_escalations
        },
        "tax_compliance": {
            "tax_collected_total": snapshot.tax_collected_total,
            "revenue_tax_exempt": snapshot.revenue_tax_exempt,
            "tax_reporting_pending": snapshot.tax_reporting_pending,
            "compliance_risk_flags": snapshot.compliance_risk_flags
        },
        "ai_explanation": snapshot.ai_explanation
    }


@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    template_type: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    List patient statement templates.
    
    Templates are pre-loaded Wisconsin-compliant communications:
    - Initial Statement
    - Friendly Reminder
    - Second Notice
    - Final Notice
    - Payment Confirmation
    """
    query = db.query(PatientStatementTemplate).filter_by(state="WI")
    
    if template_type:
        query = query.filter_by(template_type=template_type)
    if active_only:
        query = query.filter_by(active=True)
    
    return query.order_by(PatientStatementTemplate.template_type, PatientStatementTemplate.version.desc()).all()


@router.get("/templates/{template_id}")
async def get_template(template_id: int, db: Session = Depends(get_db)):
    """Get template details with preview."""
    template = db.query(PatientStatementTemplate).filter_by(id=template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "template": template,
        "preview_email": f"<html><body>{template.body_content}</body></html>",
        "preview_print": f"<html><body><h1>{template.subject_line}</h1>{template.body_content}</body></html>",
        "merge_fields": template.merge_fields,
        "usage_stats": {
            "usage_count": template.usage_count,
            "last_used_at": template.last_used_at
        }
    }


@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    request: TemplateCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Create new patient statement template.
    
    Template must be approved by Founder before use.
    """
    template = PatientStatementTemplate(
        template_type=TemplateType(request.template_type),
        template_name=request.template_name,
        subject_line=request.subject_line,
        body_content=request.body_content,
        tone=TemplateTone(request.tone),
        state="WI",
        active=False,
        approved=False
    )
    db.add(template)
    db.commit()
    
    return template


@router.put("/templates/{template_id}")
async def update_template(
    template_id: int,
    request: TemplateUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update template (creates new version).
    
    Versioning ensures auditability and allows rollback.
    """
    old_template = db.query(PatientStatementTemplate).filter_by(id=template_id).first()
    if not old_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create new version
    new_template = PatientStatementTemplate(
        template_type=old_template.template_type,
        template_name=old_template.template_name,
        version=old_template.version + 1,
        subject_line=request.subject_line or old_template.subject_line,
        body_content=request.body_content or old_template.body_content,
        tone=TemplateTone(request.tone) if request.tone else old_template.tone,
        state="WI",
        active=False,
        approved=False
    )
    db.add(new_template)
    
    # Deactivate old version
    old_template.active = False
    
    db.commit()
    return {"message": "New version created", "new_version": new_template.version}


@router.post("/templates/{template_id}/approve")
async def approve_template(
    template_id: int,
    founder_user_id: int,
    db: Session = Depends(get_db)
):
    """
    Approve template for AI use.
    
    Only Founder can approve templates.
    AI may not publish or alter templates without approval.
    """
    template = db.query(PatientStatementTemplate).filter_by(id=template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.approved = True
    template.approved_by_user_id = founder_user_id
    template.approved_at = datetime.utcnow()
    template.active = True
    
    db.commit()
    return {"message": "Template approved", "template_id": template_id}


@router.get("/config")
async def get_config(db: Session = Depends(get_db)):
    """Get Wisconsin billing configuration."""
    config = db.query(WisconsinBillingConfig).filter_by(state="WI", enabled=True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return config


@router.put("/config")
async def update_config(
    request: ConfigUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update Wisconsin billing configuration.
    
    Controls:
    - Tax exemption rules
    - Escalation timing
    - Company branding
    """
    config = db.query(WisconsinBillingConfig).filter_by(state="WI", enabled=True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    return config


@router.post("/tax/calculate")
async def calculate_tax(
    service_type: str,
    revenue_amount: float,
    charge_id: int,
    db: Session = Depends(get_db),
    service: WisconsinBillingService = Depends(get_wisconsin_service)
):
    """
    Calculate Wisconsin tax for service.
    
    Default: Medical transport is tax-exempt.
    AI applies 0% tax unless explicitly configured.
    """
    result = service.calculate_tax(service_type, revenue_amount, charge_id)
    db.commit()
    
    return result


@router.post("/escalations/process")
async def process_escalations(
    db: Session = Depends(get_db),
    service: WisconsinBillingService = Depends(get_wisconsin_service)
):
    """
    Process Wisconsin collections escalations.
    
    AI follows time-based rules:
    - Day 0: Initial statement
    - Day 15: Friendly reminder
    - Day 30: Second notice
    - Day 60: Final notice
    - Day 90: Escalation flag (internal only)
    
    Escalation pauses on any payment activity.
    """
    service.process_collections_escalations()
    db.commit()
    
    return {"status": "Escalations processed"}


@router.get("/escalations")
async def get_escalations(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get collections escalation records."""
    query = db.query(CollectionsEscalationRecord)
    
    if active_only:
        query = query.filter_by(resolved=False)
    
    escalations = query.order_by(CollectionsEscalationRecord.created_at.desc()).all()
    return escalations


@router.get("/ai-activity")
async def get_ai_activity(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    AI Activity Log for Wisconsin operations.
    
    Shows what AI did, why, which policy governed the decision, and outcome.
    Builds trust and provides legal protection.
    """
    logs = db.query(AIBillingActionLog).order_by(
        AIBillingActionLog.created_at.desc()
    ).limit(limit).all()
    
    return [{
        "id": log.id,
        "timestamp": log.created_at,
        "action": log.action_type,
        "description": log.action_description,
        "executed_by": log.executed_by,
        "policy": log.policy_reference,
        "outcome": log.outcome,
        "reversible": log.reversible,
        "metadata": log.outcome_details
    } for log in logs]


@router.get("/delivery-logs")
async def get_delivery_logs(
    statement_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get statement delivery logs with Lob tracking."""
    query = db.query(StatementDeliveryLog)
    
    if statement_id:
        query = query.filter_by(statement_id=statement_id)
    
    logs = query.order_by(StatementDeliveryLog.created_at.desc()).limit(limit).all()
    return logs


@router.post("/statements/{statement_id}/send")
async def send_statement(
    statement_id: int,
    template_type: str,
    force_channel: Optional[str] = None,
    db: Session = Depends(get_db),
    service: WisconsinBillingService = Depends(get_wisconsin_service)
):
    """
    Send patient statement with Wisconsin templates.
    
    AI autonomously:
    1. Selects approved template
    2. Renders with patient data
    3. Chooses delivery channel (email → mail)
    4. Executes via Postmark or Lob
    5. Tracks delivery status
    6. Logs action with rationale
    """
    from models.founder_billing import PatientStatement
    
    statement = db.query(PatientStatement).filter_by(id=statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    log = service.send_statement(
        statement,
        TemplateType(template_type),
        force_channel
    )
    db.commit()
    
    return {
        "delivery_log_id": log.id,
        "channel": log.delivery_format.value,
        "success": log.success,
        "rationale": log.selection_rationale
    }
