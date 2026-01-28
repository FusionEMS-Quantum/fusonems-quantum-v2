"""
Intelligent Fax System

AI-driven fax automation with policy constraints, compliance-grade auditability,
and zero guessing. Implements the complete AI Build Specification for fax operations.

Core Components:
- AIFaxPolicyEngine: Policy validation and authorization
- FaxResolutionService: 4-layer fax number resolution
- FaxTimingService: Timing rules and escalation limits
- InboundFaxService: Inbound classification and workflow matching
- FaxTemplatesService: Locked templates with approved language
- FaxAuditService: Immutable audit logging
- FaxOrchestrator: Main coordination service
"""

from services.fax.ai_fax_policy_engine import (
    FaxPolicyEngine,
    FaxRequest,
    PolicyDecision,
    DocumentType,
    WorkflowState,
)
from services.fax.fax_resolution_service import (
    FaxResolutionService,
    FaxResolutionResult,
)
from services.fax.fax_timing_service import (
    FaxTimingService,
    TimingDecision,
)
from services.fax.inbound_fax_service import (
    InboundFaxService,
)
from services.fax.fax_templates_service import (
    FaxTemplatesService,
    TemplateContext,
)
from services.fax.fax_audit_service import (
    FaxAuditService,
)
from services.fax.fax_orchestrator import (
    FaxOrchestrator,
    FaxRequestResult,
    InboundFaxResult,
)
from services.fax.fax_router import router as fax_router

__all__ = [
    "FaxPolicyEngine",
    "FaxRequest",
    "PolicyDecision",
    "DocumentType",
    "WorkflowState",
    "FaxResolutionService",
    "FaxResolutionResult",
    "FaxTimingService",
    "TimingDecision",
    "InboundFaxService",
    "FaxTemplatesService",
    "TemplateContext",
    "FaxAuditService",
    "FaxOrchestrator",
    "FaxRequestResult",
    "InboundFaxResult",
    "fax_router",
]
