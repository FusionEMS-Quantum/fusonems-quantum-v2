# Wisconsin Billing - Founder's Dashboard Implementation

## Complete Implementation ✅

### Database Models (`backend/models/wisconsin_billing.py`)

1. **PatientStatementTemplate** - Versioned, pre-approved communication templates
   - Template types: Initial Statement, Friendly Reminder, Second Notice, Final Notice, Payment Confirmation
   - Supports email, PDF, and Lob physical printing
   - Merge fields for patient/billing data
   - Approval workflow (Founder must approve before AI can use)

2. **WisconsinBillingConfig** - State-specific configuration
   - Tax exemption rules (medical transport tax-exempt by default)
   - Escalation schedule (0/15/30/60/90 days)
   - Company branding (name, phone, email, logo, footer)
   - Taxable service flags (disabled by default)

3. **BillingHealthSnapshot** - Dashboard metrics
   - Overall status (healthy/attention_needed/at_risk)
   - Monthly snapshot (charges, payments, collection rate, days to pay)
   - Delivery health (email/mail success rates)
   - Aging buckets (0-30, 31-60, 61-90, 90+ days)
   - Tax compliance (exempt revenue, tax collected)
   - AI explanation (one-sentence summary)

4. **StatementDeliveryLog** - Complete delivery tracking
   - Delivery format (email/print/Lob physical)
   - Template version used
   - Postmark message ID (email tracking)
   - Lob mail ID + tracking number (physical mail)
   - Success/failure + corrective action
   - AI selection rationale

5. **TaxExemptionRecord** - Tax audit trail
   - Service type
   - Exempt status + reason
   - Revenue amount
   - Tax rate applied (0% for medical transport)
   - Rule reference

6. **CollectionsEscalationRecord** - Escalation tracking
   - Escalation day (0/15/30/60/90)
   - Stage description
   - Balance at escalation
   - Action taken + template used
   - Pause/resolution tracking
   - Policy reference

7. **AIBillingActionLog** - Full AI transparency
   - Action type + description
   - "Executed by: AI Agent under Founder billing authority (Wisconsin)"
   - Policy reference
   - Decision rationale
   - Outcome + metadata
   - Reversible flag

### Service Layer (`backend/services/founder_billing/wisconsin_service.py`)

**WisconsinBillingService** - Complete autonomous billing operations

#### Tax Calculation
- `calculate_tax()` - Default: Medical transport 0% tax
- Only applies tax if explicitly configured (memberships, subscriptions, event standby, non-medical)
- Creates audit record for every calculation
- Never guesses taxability

#### Template Management
- `get_template()` - Retrieves active approved template
- `render_template()` - Populates merge fields with patient/billing data
- Supports email and print formats
- Adds branding for physical mail

#### Statement Delivery
- `send_statement()` - Autonomous channel selection + delivery
- Channel priority: Email → Physical Mail → SMS
- Integrates Postmark for email
- Integrates Lob for physical printing
- Tracks success/failure with corrective actions
- Logs AI decision rationale

#### Collections Escalations
- `process_collections_escalations()` - Time-based Wisconsin rules
- Day 0: Initial statement
- Day 15: Friendly reminder
- Day 30: Second notice
- Day 60: Final notice
- Day 90: Escalation flag (internal only)
- Pauses on payment activity
- Stops small balances early (<$25)

#### Health Dashboard
- `generate_health_snapshot()` - Complete billing health metrics
- Determines status: healthy/attention_needed/at_risk
- Calculates collection rate, aging, delivery success
- Generates one-sentence AI explanation

### API Routes (`backend/services/founder_billing/wisconsin_routes.py` - 14 endpoints)

#### Dashboard
- `GET /api/wisconsin-billing/dashboard/health` - Billing health dashboard
  - Overall status with reason
  - Monthly snapshot
  - Delivery health
  - Collections risk (aging + escalations)
  - Tax compliance
  - AI explanation

#### Templates
- `GET /api/wisconsin-billing/templates` - List all templates
- `GET /api/wisconsin-billing/templates/{id}` - Template details + preview
- `POST /api/wisconsin-billing/templates` - Create new template
- `PUT /api/wisconsin-billing/templates/{id}` - Update (creates new version)
- `POST /api/wisconsin-billing/templates/{id}/approve` - Founder approval

#### Configuration
- `GET /api/wisconsin-billing/config` - Get Wisconsin config
- `PUT /api/wisconsin-billing/config` - Update config

#### Operations
- `POST /api/wisconsin-billing/tax/calculate` - Calculate tax for service
- `POST /api/wisconsin-billing/escalations/process` - Process escalations
- `GET /api/wisconsin-billing/escalations` - List escalations
- `POST /api/wisconsin-billing/statements/{id}/send` - Send statement
- `GET /api/wisconsin-billing/delivery-logs` - Delivery tracking
- `GET /api/wisconsin-billing/ai-activity` - AI action log

## Authoritative Rules Implementation

### Tax (Wisconsin)
✅ Medical transport tax-exempt by default (0%)
✅ Taxable categories disabled unless explicitly enabled
✅ Never guesses taxability
✅ Full audit trail for every calculation
✅ AI prepares reports but never files taxes

### Collections (Wisconsin)
✅ Time-based rules: 0/15/30/60/90 days
✅ Escalation pauses on any payment
✅ Small balances stop early
✅ External collections disabled by default
✅ No legal language unless explicitly enabled

### Templates (Pre-Loaded)
✅ Initial Statement (friendly tone)
✅ Friendly Reminder (friendly tone)
✅ Second Notice (neutral tone)
✅ Final Notice (firm tone)
✅ Payment Confirmation (friendly tone)
✅ All templates versioned and auditable
✅ Founder approval required before AI can use

### Communication Channels
✅ Priority: Email → Physical Mail → SMS notification
✅ Email via Postmark (with open tracking)
✅ Physical mail via Lob (with USPS tracking)
✅ SMS notification only (never contains sensitive content)
✅ No statement remains undelivered

### Lob Integration
✅ Validates Wisconsin addresses
✅ Generates print-safe PDFs
✅ Submits to Lob with tracking
✅ Attaches Lob Mail ID to statement
✅ Tracks delivery status
✅ Retries or escalates on failure

### AI Authority
✅ Generates statements autonomously
✅ Selects delivery channels intelligently
✅ Applies Wisconsin tax rules
✅ Escalates per policy
✅ Tracks delivery and payment
✅ Updates lifecycle states

### AI Boundaries
✅ Cannot change balances outside rules
✅ Cannot apply taxes incorrectly
✅ Cannot alter clinical records
✅ Cannot use threatening language
✅ Cannot send to external collections without approval

### Legal Delegation
✅ "AI Agent under Founder billing authority (Wisconsin)"
✅ All actions logged with timestamp
✅ Policy reference for every decision
✅ Decision rationale recorded
✅ All actions reversible and auditable
✅ Ultimate authority remains with Founder

## Billing Health Dashboard Structure

### Top Status Indicator
```
[HEALTHY] Billing performance is strong and stable
```
or
```
[ATTENTION NEEDED] Minor issues detected, monitoring required
```
or
```
[AT RISK] Collection rate or delivery issues require attention
```

### Monthly Snapshot
- Total Charges Billed: $45,000
- Total Payments Collected: $38,250
- Net Outstanding Balance: $6,750
- Collection Rate: 85%
- Average Days to Pay: 32

**AI Explanation:** "Collection rate increased 3% this month due to improved email delivery."

### Delivery Health
- Statements Generated: 150
- Emails Delivered: 120
- Emails Bounced: 10
- Physical Mail Sent: 30
- Physical Mail Delivered: 28
- Delivery Failures: 12

**AI Note:** "12 delivery failures corrected by switching to physical mail."

### Collections Risk
- Aging 0-30 days: $2,500
- Aging 31-60 days: $2,000
- Aging 61-90 days: $1,500
- Aging 90+ days: $750
- High-Risk Balances: 5
- Active Escalations: 8
- Accounts on Hold: 0
- Disputed Accounts: 1

### Tax Compliance
- Tax Collected: $0 (medical transport exempt)
- Revenue Tax-Exempt: $45,000
- Tax Reporting Pending: No
- Compliance Risk Flags: 0

## Template Builder Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Documents → Templates → Billing & Patient Communications    │
├─────────────────┬───────────────────────┬───────────────────┤
│ Template List   │ Editor                │ Preview           │
│                 │                       │                   │
│ ✓ Initial       │ Subject:              │ Email Preview     │
│   Statement     │ [_______________]     │ ┌───────────────┐ │
│                 │                       │ │ Subject: ...  │ │
│ ✓ Friendly      │ Body:                 │ │               │ │
│   Reminder      │ ┌─────────────────┐  │ │ Hello John,   │ │
│                 │ │                 │  │ │ ...           │ │
│ ✓ Second        │ │ Hello {{...}}   │  │ └───────────────┘ │
│   Notice        │ │                 │  │                   │
│                 │ │                 │  │ Print Preview     │
│ ✓ Final Notice  │ │                 │  │ ┌───────────────┐ │
│                 │ └─────────────────┘  │ │ [Logo]        │ │
│ ✓ Payment       │                       │ │               │ │
│   Confirmation  │ Tone: [Friendly ▼]   │ │ Statement #... │ │
│                 │                       │ │               │ │
│ + New Template  │ Merge Fields:         │ └───────────────┘ │
│                 │ • PatientName         │                   │
│                 │ • BalanceDue          │ Version History   │
│                 │ • ServiceDate         │ v1 (current)      │
│                 │                       │ v2 (draft)        │
│                 │ [Approve] [Save Draft]│                   │
└─────────────────┴───────────────────────┴───────────────────┘
```

## Seeding Wisconsin Templates

Run: `python backend/scripts/seed_wisconsin_templates.py`

Creates 5 pre-approved templates with Wisconsin compliance.

## Integration Status

✅ **Database Models** - 7 models created
✅ **Service Layer** - WisconsinBillingService complete
✅ **API Routes** - 14 endpoints implemented
✅ **Tax Rules** - Wisconsin medical transport exempt
✅ **Collections** - Time-based escalation (0/15/30/60/90)
✅ **Templates** - 5 starter templates with versioning
✅ **Lob Integration** - Physical mail ready
✅ **Postmark Integration** - Email ready
✅ **Health Dashboard** - Complete metrics
✅ **AI Transparency** - Full audit trail
✅ **Founder Control** - Template approval workflow

## Operating Principle

**"In Wisconsin operations, AI executes billing and patient communications consistently, respectfully, and compliantly, allowing the Founder to oversee outcomes rather than perform manual billing tasks."**

All actions are:
- Measurable (KPI-driven status)
- Auditable (full log with rationale)
- Reversible (no permanent damage)
- Policy-driven (no AI discretion)
- Transparent (one-sentence explanations)

The Founder defines rules. The AI executes consistently. Ultimate authority remains with the Founder.
