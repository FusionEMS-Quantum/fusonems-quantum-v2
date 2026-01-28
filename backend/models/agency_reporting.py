from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from core.database import Base


class DocumentationTopic(str, Enum):
    ONBOARDING = "onboarding"
    INSURANCE_WORKFLOWS = "insurance_workflows"
    CLAIMS_LIFECYCLE = "claims_lifecycle"
    REMITTANCE_PAYMENTS = "remittance_payments"
    PATIENT_STATEMENTS = "patient_statements"
    COLLECTIONS_POLICY = "collections_policy"
    PAYMENT_PLANS = "payment_plans"
    COMMON_DENIALS = "common_denials"
    ANALYTICS_DASHBOARDS = "analytics_dashboards"


class FAQCategory(str, Enum):
    ONBOARDING = "onboarding"
    BILLING_STATUS = "billing_status"
    INSURANCE = "insurance"
    PAYMENTS = "payments"
    ANALYTICS = "analytics"
    TECHNICAL = "technical"


class ReportType(str, Enum):
    MONTHLY_AGENCY_REPORT = "monthly_agency_report"
    CLAIMS_PERFORMANCE = "claims_performance"
    OUTSTANDING_BALANCES = "outstanding_balances"
    PAYMENT_TRENDS = "payment_trends"
    DENIAL_BREAKDOWN = "denial_breakdown"
    REIMBURSEMENT_BY_SERVICE = "reimbursement_by_service"
    PAYER_PERFORMANCE = "payer_performance"
    PORTFOLIO_VIEW = "portfolio_view"
    REVENUE_HEALTH = "revenue_health"
    OPERATIONAL_THROUGHPUT = "operational_throughput"
    CUSTOM = "custom"


class ReportScope(str, Enum):
    AGENCY = "agency"
    FOUNDER = "founder"
    CROSS_AGENCY = "cross_agency"


class ReportStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class AgencyKnowledgeArticle(Base):
    __tablename__ = "agency_knowledge_articles"

    id = Column(Integer, primary_key=True, index=True)
    
    topic = Column(SQLEnum(DocumentationTopic), nullable=False, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    
    content = Column(Text, nullable=False)
    plain_language_summary = Column(Text, nullable=True)
    
    version = Column(Integer, default=1)
    active = Column(Boolean, default=True)
    
    searchable_keywords = Column(JSON, default=list)
    related_articles = Column(JSON, default=list)
    
    author = Column(String, default="Founder")
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    view_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgencyFAQ(Base):
    __tablename__ = "agency_faqs"

    id = Column(Integer, primary_key=True, index=True)
    
    category = Column(SQLEnum(FAQCategory), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    
    knowledge_article_reference = Column(Integer, ForeignKey("agency_knowledge_articles.id"), nullable=True)
    
    version = Column(Integer, default=1)
    active = Column(Boolean, default=True)
    
    searchable = Column(Boolean, default=True)
    
    times_suggested = Column(Integer, default=0)
    times_helpful = Column(Integer, default=0)
    deflection_rate = Column(Float, default=0.0)
    
    ai_proposed = Column(Boolean, default=False)
    approved_by = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MonthlyAgencyBillingReport(Base):
    __tablename__ = "monthly_agency_billing_reports"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("third_party_billing_agencies.id"), nullable=False)
    
    report_month = Column(String, nullable=False, index=True)
    report_year = Column(Integer, nullable=False, index=True)
    
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    charges_billed = Column(Float, default=0.0)
    payments_collected = Column(Float, default=0.0)
    net_receivables = Column(Float, default=0.0)
    
    aging_0_30 = Column(Float, default=0.0)
    aging_31_60 = Column(Float, default=0.0)
    aging_61_90 = Column(Float, default=0.0)
    aging_over_90 = Column(Float, default=0.0)
    
    collection_rate = Column(Float, default=0.0)
    average_days_to_pay = Column(Float, default=0.0)
    
    payer_mix_performance = Column(JSON, default=dict)
    denial_rate = Column(Float, default=0.0)
    major_denial_reasons = Column(JSON, default=list)
    
    payment_plan_adoption = Column(Integer, default=0)
    writeoffs = Column(Float, default=0.0)
    
    anomalies_detected = Column(JSON, default=list)
    risks_identified = Column(JSON, default=list)
    
    month_over_month_changes = Column(JSON, default=dict)
    
    ai_commentary = Column(Text, nullable=True)
    recommended_actions = Column(JSON, default=list)
    
    pdf_url = Column(String, nullable=True)
    
    delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime, nullable=True)
    
    viewed = Column(Boolean, default=False)
    viewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class AgencyReportRequest(Base):
    __tablename__ = "agency_report_requests"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("third_party_billing_agencies.id"), nullable=False)
    
    report_type = Column(SQLEnum(ReportType), nullable=False)
    report_scope = Column(SQLEnum(ReportScope), default=ReportScope.AGENCY)
    
    natural_language_request = Column(Text, nullable=False)
    
    structured_definition = Column(JSON, nullable=False)
    
    ai_interpretation = Column(Text, nullable=True)
    user_confirmed = Column(Boolean, default=False)
    
    filters = Column(JSON, default=dict)
    date_range_start = Column(DateTime, nullable=True)
    date_range_end = Column(DateTime, nullable=True)
    groupings = Column(JSON, default=list)
    
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.PENDING)
    
    result_data = Column(JSON, nullable=True)
    visualizations = Column(JSON, default=list)
    
    export_formats = Column(JSON, default=list)
    
    scheduled = Column(Boolean, default=False)
    schedule_frequency = Column(String, nullable=True)
    
    requested_by = Column(String, nullable=False)
    requested_at = Column(DateTime, default=datetime.utcnow)
    
    generated_at = Column(DateTime, nullable=True)
    
    execution_time_ms = Column(Integer, nullable=True)
    row_count = Column(Integer, nullable=True)
    
    shared = Column(Boolean, default=False)
    share_token = Column(String, nullable=True, unique=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class FounderReportRequest(Base):
    __tablename__ = "founder_report_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    report_type = Column(SQLEnum(ReportType), nullable=False)
    report_scope = Column(SQLEnum(ReportScope), nullable=False)
    
    natural_language_request = Column(Text, nullable=False)
    
    structured_definition = Column(JSON, nullable=False)
    
    ai_interpretation = Column(Text, nullable=True)
    user_confirmed = Column(Boolean, default=False)
    
    filters = Column(JSON, default=dict)
    date_range_start = Column(DateTime, nullable=True)
    date_range_end = Column(DateTime, nullable=True)
    groupings = Column(JSON, default=list)
    aggregations = Column(JSON, default=list)
    
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.PENDING)
    
    result_data = Column(JSON, nullable=True)
    visualizations = Column(JSON, default=list)
    
    cross_agency_included = Column(Boolean, default=False)
    agency_ids = Column(JSON, default=list)
    
    export_formats = Column(JSON, default=list)
    
    scheduled = Column(Boolean, default=False)
    schedule_frequency = Column(String, nullable=True)
    
    requested_by = Column(String, nullable=False)
    requested_at = Column(DateTime, default=datetime.utcnow)
    
    generated_at = Column(DateTime, nullable=True)
    
    execution_time_ms = Column(Integer, nullable=True)
    row_count = Column(Integer, nullable=True)
    
    shared_with_agencies = Column(Boolean, default=False)
    agency_scoped_shares = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class ReportExecutionLog(Base):
    __tablename__ = "report_execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    report_type = Column(String, nullable=False)
    report_scope = Column(SQLEnum(ReportScope), nullable=False)
    
    agency_id = Column(Integer, ForeignKey("third_party_billing_agencies.id"), nullable=True)
    
    executed_by = Column(String, nullable=False)
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    filters_applied = Column(JSON, nullable=False)
    date_range = Column(JSON, nullable=True)
    
    row_level_security_applied = Column(Boolean, default=True)
    agency_boundary_enforced = Column(Boolean, default=True)
    
    result_row_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    
    exported = Column(Boolean, default=False)
    export_format = Column(String, nullable=True)
    
    data_quality_warnings = Column(JSON, default=list)
    
    meta_data = Column(JSON, default=dict)


class FAQDeflectionLog(Base):
    __tablename__ = "faq_deflection_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    message_id = Column(Integer, ForeignKey("agency_portal_messages.id"), nullable=True)
    agency_id = Column(Integer, ForeignKey("third_party_billing_agencies.id"), nullable=False)
    
    question_asked = Column(Text, nullable=False)
    
    faq_suggested = Column(Integer, ForeignKey("agency_faqs.id"), nullable=True)
    article_suggested = Column(Integer, ForeignKey("agency_knowledge_articles.id"), nullable=True)
    
    suggestion_accepted = Column(Boolean, nullable=True)
    
    deflected = Column(Boolean, default=False)
    escalated_to_support = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class DocumentationAccessLog(Base):
    __tablename__ = "documentation_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    agency_id = Column(Integer, ForeignKey("third_party_billing_agencies.id"), nullable=False)
    article_id = Column(Integer, ForeignKey("agency_knowledge_articles.id"), nullable=True)
    faq_id = Column(Integer, ForeignKey("agency_faqs.id"), nullable=True)
    
    accessed_by = Column(String, nullable=False)
    accessed_at = Column(DateTime, default=datetime.utcnow)
    
    access_type = Column(String, default="view")
    
    search_query = Column(String, nullable=True)
    
    time_spent_seconds = Column(Integer, nullable=True)
    marked_helpful = Column(Boolean, nullable=True)


class ReportVisualization(Base):
    __tablename__ = "report_visualizations"

    id = Column(Integer, primary_key=True, index=True)
    
    report_request_id = Column(Integer, nullable=True)
    
    chart_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    
    data = Column(JSON, nullable=False)
    
    x_axis = Column(String, nullable=True)
    y_axis = Column(String, nullable=True)
    grouping = Column(String, nullable=True)
    
    filters = Column(JSON, default=dict)
    
    interactive = Column(Boolean, default=True)
    drilldown_enabled = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
