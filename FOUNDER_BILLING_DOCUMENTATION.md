# Founder's Dashboard - Sole Biller Mode

## Overview
AI-managed billing system where AI operates autonomously under Founder's explicit delegation. No per-action approval required within configured boundaries.

## Core Architecture

### Autonomous Authority Model
- **Delegation**: Founder delegates billing authority to AI agent
- **Boundaries**: Hard-coded safety limits prevent dangerous actions
- **Audit**: Every action logged as "Action executed by AI agent under Founder billing authority"
- **Override**: Founder can intervene and override any AI decision

### Statement Lifecycle
```
DRAFTED → FINALIZED → SENT → DELIVERED → OPENED → PAID
                            ↓
                        ESCALATED (if overdue)
                            ↓
                        FAILED (delivery failure)
```

## Database Models

### 1. PatientStatement
Patient billing statement with full lifecycle tracking.

**Fields:**
- `id`, `patient_id`, `call_id`
- `statement_number` - Unique identifier (STMT-202401-00001)
- `statement_date`, `due_date`
- `total_charges`, `insurance_paid`, `adjustments`, `patient_responsibility`, `balance_due`
- `lifecycle_state` - Current state (drafted/finalized/sent/delivered/paid/escalated)
- `ai_generated` - True if AI created
- `ai_approved_at` - Timestamp of AI approval
- `founder_override` - True if Founder manually intervened
- `itemized_charges` - JSON array of charge details

### 2. StatementDelivery
Tracks delivery attempts across channels (email/mail/SMS).

**Fields:**
- `id`, `statement_id`
- `channel` - email | physical_mail | sms | patient_portal
- `attempted_at`, `delivered_at`, `opened_at`
- `success` - Delivery success flag
- `failure_reason` - Error details if failed
- `email_address`, `postmark_message_id` - Email delivery tracking
- `physical_address`, `lob_mail_id` - Physical mail tracking
- `ai_selected_channel` - True if AI chose channel
- `channel_selection_reason` - AI decision rationale
- `retry_count`, `next_retry_at` - Failover scheduling

### 3. BillingAuditLog
Complete audit trail of all AI actions.

**Fields:**
- `id`, `statement_id`, `delivery_id`
- `action_type` - statement_generated | statement_finalized | statement_sent | channel_selected | escalation_triggered
- `action_description` - Human-readable description
- `executed_by` - Always "AI Agent under Founder billing authority"
- `founder_override` - True if action was Founder manual override
- `previous_state`, `new_state` - State transitions
- `metadata` - JSON of decision context
- `created_at` - Timestamp

### 4. StatementEscalation
Tracks overdue escalations (30/60/90 day follow-ups).

**Fields:**
- `id`, `statement_id`
- `escalation_level` - 1, 2, 3 (corresponding to 30/60/90 days)
- `triggered_at`, `triggered_by` - When and who (usually "AI Agent")
- `trigger_reason` - Why escalated (e.g., "Statement 35 days overdue")
- `days_overdue`
- `action_taken` - What AI did
- `payment_plan_offered` - True if AI offered payment plan
- `payment_plan_terms` - JSON of plan details
- `resolved` - True when paid or resolved
- `next_escalation_at` - When to escalate again

### 5. LobMailJob
Physical mail tracking via Lob API.

**Fields:**
- `id`, `delivery_id`
- `lob_letter_id` - Lob's unique ID
- `lob_url` - PDF preview URL
- `to_address`, `from_address` - JSON address objects
- `tracking_number` - USPS tracking number
- `tracking_events` - JSON array of tracking updates
- `status` - created | processed | in_transit | delivered
- `send_date`, `delivery_date`, `expected_delivery_date`
- `cost` - Postage cost
- `address_validated` - True if Lob validated address

### 6. SoleBillerConfig
AI behavior configuration (Founder-controlled).

**Fields:**
- `id`, `enabled`, `founder_user_id`
- `ai_autonomous_approval_threshold` - Balance below which AI auto-approves ($500 default)
- `auto_send_statements` - AI sends without asking
- `auto_escalate_overdue` - AI escalates overdue statements
- `auto_offer_payment_plans` - AI offers payment plans
- `preferred_channel_order` - ["email", "physical_mail", "sms"]
- `email_failover_to_mail` - Automatically retry failed email via mail
- `failover_delay_hours` - Wait time before failover (48 hours default)
- `escalation_schedule_days` - [30, 60, 90]
- `payment_plan_min_balance` - Minimum balance for payment plan ($200)
- `payment_plan_max_months` - Max installments (12)
- `hard_boundaries` - JSON safety limits
- `lob_api_key`, `postmark_api_key`, `twilio_account_sid` - API credentials

### 7. AIBillingDecision
Logs AI decision-making process for transparency.

**Fields:**
- `id`, `statement_id`
- `decision_type` - channel_selection | escalation | payment_plan | etc.
- `decision_rationale` - Why AI chose this action
- `confidence_score` - AI confidence (0.0-1.0)
- `risk_assessment` - low | medium | high
- `factors_considered` - JSON array of decision factors
- `alternative_actions` - JSON array of other options considered
- `auto_executed` - True if AI executed without approval
- `requires_founder_approval` - True if above threshold
- `outcome`, `outcome_metrics` - Results of decision

## AI Service: SoleBillerService

### Core Methods

#### `generate_statement(patient_id, call_id, charges, insurance_paid, adjustments)`
Creates patient statement. Auto-finalizes if under threshold.

**AI Decision Logic:**
1. Calculate total charges and patient responsibility
2. Generate unique statement number (STMT-202401-00001)
3. Log: "AI generated statement #... for patient X. Balance: $Y"
4. If balance ≤ threshold: Auto-finalize and send
5. If balance > threshold: Hold for Founder approval

#### `send_statement(statement_id)`
Selects channel and sends statement autonomously.

**AI Decision Logic:**
1. Analyze patient delivery history (email success rate, mail success rate)
2. Check balance amount (high balances → certified mail)
3. Apply configuration preferences
4. Select optimal channel with rationale
5. Execute delivery
6. Log: "AI sent statement #... via {channel}. Success: {bool}. Reason: {rationale}"
7. If failed + email_failover_to_mail: Schedule physical mail retry

#### `_select_optimal_channel(statement)`
AI channel selection algorithm.

**Decision Factors:**
- Previous delivery success rates
- Balance amount (>$1000 → physical mail)
- Patient contact info availability
- Configuration preferences
- Historical patterns

**Returns:** `(channel, reason)` tuple

#### `process_failovers()`
Background task: Retry failed email deliveries via physical mail.

**Logic:**
1. Find deliveries where success=False, next_retry_at ≤ now
2. For each: Create new delivery with channel=physical_mail
3. Send via Lob
4. Log: "AI escalated delivery to physical mail after email failure"

#### `process_escalations()`
Background task: Escalate overdue statements.

**Logic:**
1. Find statements with balance_due > 0, due_date < now
2. Calculate days_overdue
3. Check escalation schedule (30/60/90 days)
4. If threshold reached and not already escalated at this level:
   - Create escalation record
   - Offer payment plan if eligible
   - Send follow-up statement
   - Log: "AI triggered level X escalation. Y days overdue."

## API Endpoints

### POST /api/founder-billing/statements/generate
Generate statement (AI autonomous).

**Request:**
```json
{
  "patient_id": 123,
  "call_id": 456,
  "charges": [
    {"description": "BLS Transport", "date": "2024-01-15", "amount": 450.00},
    {"description": "Mileage", "date": "2024-01-15", "amount": 50.00}
  ],
  "insurance_paid": 0.0,
  "adjustments": 0.0
}
```

**Response:**
```json
{
  "id": 789,
  "statement_number": "STMT-202401-00123",
  "patient_id": 123,
  "total_charges": 500.00,
  "balance_due": 500.00,
  "lifecycle_state": "finalized",
  "ai_generated": true,
  "created_at": "2024-01-27T10:15:30Z"
}
```

### POST /api/founder-billing/statements/{id}/send
Send statement (AI selects channel).

**Response:**
```json
{
  "id": 234,
  "statement_id": 789,
  "channel": "email",
  "success": true,
  "delivered_at": "2024-01-27T10:15:35Z",
  "channel_selection_reason": "Email success rate 85% with valid email"
}
```

### GET /api/founder-billing/audit-logs
Retrieve AI action logs.

**Response:**
```json
[
  {
    "id": 1,
    "action_type": "statement_generated",
    "action_description": "AI generated statement #STMT-202401-00123 for patient 123. Balance: $500.00",
    "executed_by": "AI Agent under Founder billing authority",
    "created_at": "2024-01-27T10:15:30Z",
    "metadata": {
      "total_charges": 500.00,
      "patient_responsibility": 500.00
    }
  }
]
```

### GET /api/founder-billing/dashboard/metrics
Real-time Founder dashboard metrics.

**Response:**
```json
{
  "statements_generated_today": 15,
  "statements_sent_today": 12,
  "active_escalations": 8,
  "total_balance_outstanding": 45000.00,
  "ai_actions_today": 32,
  "email_success_rate": 0.85,
  "statements_by_state": {
    "drafted": 2,
    "finalized": 1,
    "sent": 10,
    "delivered": 8,
    "paid": 3,
    "escalated": 5
  }
}
```

### GET /api/founder-billing/dashboard/recent-activity
Recent AI actions (live feed).

**Response:**
```json
[
  {
    "id": 32,
    "timestamp": "2024-01-27T10:15:35Z",
    "action": "statement_sent",
    "description": "AI sent statement #STMT-202401-00123 via email",
    "executed_by": "AI Agent under Founder billing authority",
    "statement_number": "STMT-202401-00123",
    "metadata": {"channel": "email", "success": true}
  }
]
```

### POST /api/founder-billing/statements/{id}/override
Founder manual override.

**Request:**
```json
{
  "reason": "Patient called, negotiated settlement"
}
```

**Effect:**
- Sets `statement.founder_override = True`
- Logs: "Founder overrode AI action. Reason: {reason}"
- Preserves full audit trail

## Integration: Lob Physical Mail

### Setup
1. Get Lob API key from https://dashboard.lob.com
2. Store in `SoleBillerConfig.lob_api_key`

### Workflow
1. AI generates statement HTML
2. Calls `lob_client.Letter.create()` with:
   - `to_address` - Patient address (validated by Lob)
   - `from_address` - Agency billing address
   - `file` - HTML content
   - `mail_type` - usps_first_class
   - `color` - True
3. Lob returns:
   - `letter.id` - Tracking ID
   - `letter.url` - PDF preview
   - `letter.tracking_number` - USPS tracking
   - `letter.expected_delivery_date`
4. Store in `LobMailJob`
5. Track status via Lob webhooks

### Cost
- First Class: ~$1.00-$1.50 per letter
- Certified Mail: ~$7.00-$9.00

## Integration: Postmark Email

### Setup
1. Get Postmark API key from https://postmarkapp.com
2. Store in `SoleBillerConfig.postmark_api_key`

### Workflow
1. AI generates statement HTML
2. Calls Postmark API:
```python
POST https://api.postmarkapp.com/email
{
  "From": "billing@fusionems.com",
  "To": "patient@example.com",
  "Subject": "Statement #STMT-202401-00123",
  "HtmlBody": "<html>...",
  "TrackOpens": true,
  "TrackLinks": "HtmlOnly"
}
```
3. Postmark returns `MessageID`
4. Track opens/clicks via webhooks

## Background Jobs (Celery/APScheduler)

### Failover Job (Every 6 Hours)
```python
@scheduler.scheduled_job('interval', hours=6)
def process_failovers():
    service.process_failovers()
```

### Escalation Job (Daily at 9 AM)
```python
@scheduler.scheduled_job('cron', hour=9)
def process_escalations():
    service.process_escalations()
```

## Safety & Compliance

### Hard Boundaries (Enforced)
- ✗ AI CANNOT alter balances or charges
- ✗ AI CANNOT modify clinical documentation
- ✗ AI CANNOT submit legal filings
- ✗ AI CANNOT forgive balances without config
- ✗ AI CANNOT access or modify patient medical records

### Audit Requirements
- All AI actions logged with timestamp
- Executed_by: "AI Agent under Founder billing authority"
- Metadata includes decision rationale
- Founder override capability always available

### HIPAA Compliance
- Email: Use TLS encryption (Postmark provides)
- Physical Mail: Secure printing facility (Lob certified)
- Audit logs: Encrypted at rest
- Access control: Founder-level permissions required

## Configuration Best Practices

### Initial Setup (Conservative)
```json
{
  "enabled": true,
  "ai_autonomous_approval_threshold": 200.0,
  "auto_send_statements": false,
  "auto_escalate_overdue": false,
  "auto_offer_payment_plans": false,
  "email_failover_to_mail": true,
  "failover_delay_hours": 72
}
```

### Production Setup (Aggressive)
```json
{
  "enabled": true,
  "ai_autonomous_approval_threshold": 1000.0,
  "auto_send_statements": true,
  "auto_escalate_overdue": true,
  "auto_offer_payment_plans": true,
  "email_failover_to_mail": true,
  "failover_delay_hours": 48,
  "escalation_schedule_days": [30, 60, 90]
}
```

## Metrics & Monitoring

### Key Metrics
1. **AI Autonomy Rate** - % statements sent without Founder approval
2. **Email Success Rate** - % emails delivered successfully
3. **Mail Failover Rate** - % requiring physical mail fallback
4. **Escalation Effectiveness** - Payment rate after escalation
5. **Payment Plan Acceptance** - % offered plans accepted

### Alerts
- Email success rate < 70%
- Physical mail cost > $500/day
- Escalation level 3 (90 days) reached
- Founder override rate > 10%

## Future Enhancements
1. **SMS Integration** - Twilio for text message statements
2. **Patient Portal** - Online statement viewing
3. **Payment Gateway** - Stripe/Square integration
4. **Machine Learning** - Optimize channel selection based on success patterns
5. **Natural Language** - AI-generated personalized messages
6. **Predictive Analytics** - Likelihood-to-pay scoring

---

**Implementation Status:** ✅ Complete
**Database Models:** 7 models created
**API Endpoints:** 13 endpoints implemented
**Integration:** Lob + Postmark ready
**Audit Trail:** Full transparency
**Safety Boundaries:** Hard-coded
