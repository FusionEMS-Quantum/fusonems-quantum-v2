"""
Founder's Dashboard - Sole Biller Mode
AI-Managed Billing with Autonomous Operations

This module implements an AI billing agent that operates under explicit Founder delegation
with autonomous authority to generate and send patient statements without per-action approval.

Key Features:
1. AI Autonomous Statement Generation - Creates patient statements automatically from charges
2. Intelligent Channel Selection - Email → Physical Mail → SMS failover logic
3. Lob Integration - Physical mail fulfillment with tracking
4. Postmark Email - Email delivery with open/click tracking
5. Statement Lifecycle Management - Drafted → Finalized → Sent → Delivered → Paid
6. Autonomous Escalations - 30/60/90 day overdue follow-ups
7. Payment Plan Automation - AI offers payment plans for eligible balances
8. Full Audit Trail - All actions logged: "Action executed by AI agent under Founder billing authority"

Architecture:
- Models: `/backend/models/founder_billing.py`
- Service: `/backend/services/founder_billing/sole_biller_service.py`
- API: `/backend/services/founder_billing/routes.py`

Database Models:
1. PatientStatement - Statement with lifecycle states
2. StatementDelivery - Delivery attempts across channels
3. BillingAuditLog - AI action audit trail
4. StatementEscalation - Overdue escalation tracking
5. LobMailJob - Physical mail tracking
6. SoleBillerConfig - AI behavior configuration
7. AIBillingDecision - AI decision rationale logging

API Endpoints:
POST   /api/founder-billing/statements/generate - AI generates statement
POST   /api/founder-billing/statements/{id}/send - AI sends statement
GET    /api/founder-billing/statements - List statements
GET    /api/founder-billing/statements/{id} - Statement details
GET    /api/founder-billing/audit-logs - AI action logs
GET    /api/founder-billing/escalations - Overdue escalations
POST   /api/founder-billing/process-failovers - Trigger email→mail failover
POST   /api/founder-billing/process-escalations - Trigger overdue escalations
GET    /api/founder-billing/dashboard/metrics - Real-time metrics
GET    /api/founder-billing/dashboard/recent-activity - Recent AI actions
POST   /api/founder-billing/statements/{id}/override - Founder override
GET    /api/founder-billing/config - Get configuration
PUT    /api/founder-billing/config - Update configuration
GET    /api/founder-billing/lob/tracking/{id} - Lob mail tracking

AI Authority & Boundaries:
✓ Can generate statements automatically
✓ Can select delivery channel autonomously
✓ Can send statements via email/mail/SMS
✓ Can escalate overdue accounts (30/60/90 days)
✓ Can offer payment plans
✓ Can retry failed deliveries

✗ Cannot alter balances or charges
✗ Cannot modify clinical documentation
✗ Cannot submit legal filings
✗ Cannot forgive balances without config

Configuration Example:
{
  "enabled": true,
  "ai_autonomous_approval_threshold": 500.0,
  "auto_send_statements": true,
  "auto_escalate_overdue": true,
  "auto_offer_payment_plans": true,
  "preferred_channel_order": ["email", "physical_mail", "sms"],
  "email_failover_to_mail": true,
  "failover_delay_hours": 48,
  "escalation_schedule_days": [30, 60, 90],
  "payment_plan_min_balance": 200.0,
  "hard_boundaries": {
    "cannot_alter_balances": true,
    "cannot_modify_clinical_docs": true,
    "cannot_submit_legal_filings": true
  }
}

Usage Example:
```python
# Generate and send statement autonomously
response = requests.post(
    "http://api/founder-billing/statements/generate",
    json={
        "patient_id": 123,
        "call_id": 456,
        "charges": [
            {"description": "BLS Transport", "date": "2024-01-15", "amount": 450.00},
            {"description": "Mileage", "date": "2024-01-15", "amount": 50.00}
        ],
        "insurance_paid": 0.0,
        "adjustments": 0.0
    }
)
# AI automatically:
# 1. Generates statement
# 2. Finalizes (if under threshold)
# 3. Selects channel (email preferred)
# 4. Sends statement
# 5. Logs all actions with "executed by AI agent under Founder billing authority"
```

Audit Trail Example:
```
[2024-01-27 10:15:30] AI Agent under Founder billing authority: Generated statement #STMT-202401-00123
[2024-01-27 10:15:31] AI Agent under Founder billing authority: Finalized statement #STMT-202401-00123
[2024-01-27 10:15:32] AI Agent under Founder billing authority: Selected email channel (reason: Email success rate 85%)
[2024-01-27 10:15:35] AI Agent under Founder billing authority: Sent statement #STMT-202401-00123 via email
[2024-01-29 10:15:32] AI Agent under Founder billing authority: Email delivery failed, scheduling physical mail failover
[2024-01-31 10:15:32] AI Agent under Founder billing authority: Sent statement #STMT-202401-00123 via physical mail
```

Background Tasks (Scheduled):
- process_failovers() - Every 6 hours, retry failed email with physical mail
- process_escalations() - Daily, check for overdue statements and send follow-ups

Founder Dashboard Metrics:
- Statements generated today (by AI)
- Statements sent today (success rate by channel)
- Active escalations
- Total balance outstanding
- AI actions today
- Email success rate
- Statements by lifecycle state
- Recent AI activity feed
"""

__all__ = [
    "PatientStatement",
    "StatementDelivery",
    "BillingAuditLog",
    "StatementEscalation",
    "LobMailJob",
    "SoleBillerConfig",
    "AIBillingDecision",
    "SoleBillerService",
]
