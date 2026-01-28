from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from core.database import Base


class TemplateType(str, Enum):
    INITIAL_STATEMENT = "initial_statement"
    FRIENDLY_REMINDER = "friendly_reminder"
    SECOND_NOTICE = "second_notice"
    FINAL_NOTICE = "final_notice"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    PAID_IN_FULL = "paid_in_full"
    ADDRESS_ISSUE = "address_issue"


class TemplateTone(str, Enum):
    FRIENDLY = "friendly"
    NEUTRAL = "neutral"
    FIRM = "firm"


class DeliveryFormat(str, Enum):
    EMAIL = "email"
    PRINT_PDF = "print_pdf"
    LOB_PHYSICAL = "lob_physical"


class BillingHealthStatus(str, Enum):
    HEALTHY = "healthy"
    ATTENTION_NEEDED = "attention_needed"
    AT_RISK = "at_risk"


class PatientStatementTemplate(Base):
    __tablename__ = "patient_statement_templates"

    id = Column(Integer, primary_key=True, index=True)
    
    template_type = Column(SQLEnum(TemplateType), nullable=False, index=True)
    template_name = Column(String, nullable=False)
    version = Column(Integer, default=1)
    
    subject_line = Column(String, nullable=False)
    body_content = Column(Text, nullable=False)
    
    tone = Column(SQLEnum(TemplateTone), default=TemplateTone.NEUTRAL)
    
    supports_email = Column(Boolean, default=True)
    supports_pdf = Column(Boolean, default=True)
    supports_lob_print = Column(Boolean, default=True)
    
    merge_fields = Column(JSON, default=list)
    conditional_sections = Column(JSON, default=list)
    
    state_specific_disclosure = Column(Text, nullable=True)
    state = Column(String, default="WI")
    
    active = Column(Boolean, default=True)
    approved = Column(Boolean, default=False)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    branding_config = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)


class WisconsinBillingConfig(Base):
    __tablename__ = "wisconsin_billing_config"

    id = Column(Integer, primary_key=True, index=True)
    
    enabled = Column(Boolean, default=True)
    state = Column(String, default="WI")
    
    medical_transport_tax_rate = Column(Float, default=0.0)
    tax_exempt_by_default = Column(Boolean, default=True)
    
    taxable_memberships = Column(Boolean, default=False)
    taxable_subscriptions = Column(Boolean, default=False)
    taxable_event_standby = Column(Boolean, default=False)
    taxable_non_medical = Column(Boolean, default=False)
    
    escalation_day_0 = Column(String, default="Initial statement")
    escalation_day_15 = Column(String, default="Friendly reminder")
    escalation_day_30 = Column(String, default="Second notice")
    escalation_day_60 = Column(String, default="Final notice")
    escalation_day_90 = Column(String, default="Escalation flag (internal only)")
    
    pause_on_payment = Column(Boolean, default=True)
    stop_small_balances_early = Column(Boolean, default=True)
    small_balance_threshold = Column(Float, default=25.0)
    
    external_collections_enabled = Column(Boolean, default=False)
    legal_language_enabled = Column(Boolean, default=False)
    
    company_name = Column(String, nullable=True)
    company_phone = Column(String, nullable=True)
    company_email = Column(String, nullable=True)
    company_logo_url = Column(String, nullable=True)
    footer_disclaimer = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BillingHealthSnapshot(Base):
    __tablename__ = "billing_health_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    
    snapshot_date = Column(DateTime, default=datetime.utcnow, index=True)
    period = Column(String, nullable=False)
    
    overall_status = Column(SQLEnum(BillingHealthStatus), nullable=False)
    status_reason = Column(Text, nullable=True)
    
    total_charges_billed = Column(Float, default=0.0)
    total_payments_collected = Column(Float, default=0.0)
    net_outstanding_balance = Column(Float, default=0.0)
    collection_rate = Column(Float, default=0.0)
    average_days_to_pay = Column(Float, default=0.0)
    
    statements_generated = Column(Integer, default=0)
    emails_delivered = Column(Integer, default=0)
    emails_bounced = Column(Integer, default=0)
    physical_mail_sent = Column(Integer, default=0)
    physical_mail_delivered = Column(Integer, default=0)
    delivery_failures = Column(Integer, default=0)
    
    aging_0_30_days = Column(Float, default=0.0)
    aging_31_60_days = Column(Float, default=0.0)
    aging_61_90_days = Column(Float, default=0.0)
    aging_over_90_days = Column(Float, default=0.0)
    
    high_risk_balances = Column(Integer, default=0)
    active_escalations = Column(Integer, default=0)
    accounts_on_hold = Column(Integer, default=0)
    disputed_accounts = Column(Integer, default=0)
    
    tax_collected_total = Column(Float, default=0.0)
    revenue_tax_exempt = Column(Float, default=0.0)
    tax_reporting_pending = Column(Boolean, default=False)
    compliance_risk_flags = Column(Integer, default=0)
    
    change_summary = Column(Text, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class StatementDeliveryLog(Base):
    __tablename__ = "statement_delivery_logs"

    id = Column(Integer, primary_key=True, index=True)
    statement_id = Column(Integer, ForeignKey("patient_statements.id"), nullable=False)
    
    delivery_format = Column(SQLEnum(DeliveryFormat), nullable=False)
    template_id = Column(Integer, ForeignKey("patient_statement_templates.id"), nullable=False)
    template_version = Column(Integer, nullable=False)
    
    recipient_email = Column(String, nullable=True)
    recipient_address = Column(JSON, nullable=True)
    
    subject_line = Column(String, nullable=True)
    rendered_content = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    
    lob_mail_id = Column(String, nullable=True, index=True)
    lob_tracking_number = Column(String, nullable=True)
    lob_proof_url = Column(String, nullable=True)
    
    postmark_message_id = Column(String, nullable=True, index=True)
    
    sent_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    
    success = Column(Boolean, default=False)
    failure_reason = Column(Text, nullable=True)
    corrective_action = Column(Text, nullable=True)
    
    ai_selected = Column(Boolean, default=True)
    selection_rationale = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class TaxExemptionRecord(Base):
    __tablename__ = "tax_exemption_records"

    id = Column(Integer, primary_key=True, index=True)
    charge_id = Column(Integer, ForeignKey("billing_claims.id"), nullable=False)
    
    state = Column(String, default="WI")
    service_type = Column(String, nullable=False)
    
    exempt = Column(Boolean, default=True)
    exemption_reason = Column(Text, nullable=False)
    
    revenue_amount = Column(Float, nullable=False)
    tax_rate_applied = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    
    rule_reference = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class CollectionsEscalationRecord(Base):
    __tablename__ = "collections_escalation_records"

    id = Column(Integer, primary_key=True, index=True)
    statement_id = Column(Integer, ForeignKey("patient_statements.id"), nullable=False)
    
    escalation_day = Column(Integer, nullable=False)
    escalation_stage = Column(String, nullable=False)
    
    triggered_at = Column(DateTime, default=datetime.utcnow)
    triggered_by = Column(String, default="AI Agent")
    
    balance_at_escalation = Column(Float, nullable=False)
    days_overdue = Column(Integer, nullable=False)
    
    action_taken = Column(Text, nullable=False)
    template_used = Column(Integer, ForeignKey("patient_statement_templates.id"), nullable=True)
    
    paused = Column(Boolean, default=False)
    pause_reason = Column(String, nullable=True)
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    
    policy_reference = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class AIBillingActionLog(Base):
    __tablename__ = "ai_billing_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    action_type = Column(String, nullable=False, index=True)
    action_description = Column(Text, nullable=False)
    
    executed_by = Column(String, default="AI Agent under Founder billing authority (Wisconsin)")
    
    statement_id = Column(Integer, ForeignKey("patient_statements.id"), nullable=True)
    
    policy_reference = Column(String, nullable=True)
    decision_rationale = Column(Text, nullable=True)
    
    outcome = Column(String, nullable=True)
    outcome_details = Column(JSON, nullable=True)
    
    reversible = Column(Boolean, default=True)
    reversed = Column(Boolean, default=False)
    reversed_at = Column(DateTime, nullable=True)
    
    meta_data = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
