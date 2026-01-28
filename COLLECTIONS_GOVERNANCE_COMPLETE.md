# Collections Governance - Immutable Policy Implementation

## Complete Implementation ✅

### Authoritative Rules

**Collections Model**: Internal Collections Only
- ✅ Internal collections enabled
- ✅ Pre-collections phase enabled (90+ days)
- ❌ External collections **DISABLED**
- ❌ Credit bureau reporting **DISABLED**
- ❌ Legal action **DISABLED**
- ❌ Third-party referrals **DISABLED**

**Immutability**: Governance policy locked once activated
- Cannot be altered by AI
- Cannot be altered by workflows
- Can only be changed by Founder through explicit governance update
- All actions reference active governance version

**Escalation Timeline** (Time-Based, Not Discretionary)
- Day 0: Initial statement
- Day 15: Friendly reminder
- Day 30: Second notice
- Day 60: Final notice
- Day 90: Final internal notice (Pre-Collections phase)
- 90+ days: Flag for Founder decision

**Payment Pause Rule**
- ✅ Any payment activity immediately pauses escalation
- ✅ Timeline resets on payment
- ✅ No further notices sent while paused

**Write-Off Policy**
- Small balance threshold: $25.00 (default)
- Write-offs **require Founder approval** (cannot be automated)
- AI may recommend, but cannot execute without approval
- All write-offs logged with rationale and governance version

**AI Boundaries**
- ✅ Can send notices per escalation schedule
- ✅ Can pause escalation on payment
- ✅ Can flag accounts for Founder decision
- ✅ Can recommend write-offs
- ❌ Cannot write off without approval
- ❌ Cannot use threatening language
- ❌ Cannot reference credit reporting
- ❌ Cannot reference legal action
- ❌ Cannot send to external collections

**Prohibited Language** (Hard-Coded Blocks)
- "credit report"
- "credit bureau"
- "legal action"
- "lawsuit"
- "collections agency"
- "garnish"
- "lien"

## Database Models (`backend/models/collections_governance.py`)

### 1. CollectionsGovernancePolicy
Immutable governance policy - authoritative rules for collections.

**Fields:**
- `version` - Policy version (e.g., "v1.0")
- `immutable` - True (locked once activated)
- `active` - Current active policy
- `internal_collections_enabled` - True
- `external_collections_enabled` - False
- `credit_reporting_enabled` - False
- `legal_action_enabled` - False
- `escalation_day_0/15/30/60/90` - Time-based schedule
- `pause_on_any_payment` - True
- `small_balance_threshold` - $25.00
- `write_off_requires_founder_approval` - True
- `flag_for_decision_at_days` - 90
- `final_internal_notice_template` - Pre-approved text
- `prohibited_language` - JSON array of blocked terms
- `ai_authority_statement` - "AI Agent under Founder billing authority (Wisconsin)"

### 2. CollectionsAccount
Collections account tracking for each statement.

**Fields:**
- `statement_id`, `patient_id`
- `current_phase` - internal | pre_collections | decision_required | written_off | resolved
- `original_balance`, `current_balance`, `total_paid`
- `days_since_due` - Calculated daily
- `escalation_paused` - Payment pause flag
- `pause_reason` - Why paused
- `notices_sent` - Count of notices
- `last_notice_sent_at` - Timestamp
- `delivery_proof` - JSON array of delivery confirmation
- `flagged_for_founder_decision` - True at 90+ days
- `founder_decision` - write_off | continue_collections | hold
- `write_off_eligible` - Below threshold flag
- `written_off` - True if written off
- `insurance_pending` - Flag for insurance holds
- `payment_attempts` - Count of payment attempts
- `communication_history` - JSON log
- `governance_version` - Policy version applied

### 3. CollectionsActionLog
Complete audit trail of every collections action.

**Fields:**
- `account_id`
- `action` - statement_sent | reminder_sent | notice_sent | final_internal_notice_sent | escalation_paused | flagged_for_decision | written_off | resolved
- `action_description` - Human-readable description
- `executed_by` - "AI Agent under Founder billing authority (Wisconsin)"
- `executed_at` - Timestamp
- `governance_version` - Policy version
- `policy_reference` - Specific policy rule
- `balance_at_action` - Balance when action occurred
- `days_overdue_at_action` - Days overdue when action occurred
- `reversible` - Can action be reversed?
- `reversed` - Has it been reversed?

### 4. CollectionsDecisionRequest
Founder decision request at 90+ days.

**Fields:**
- `account_id`
- `requested_at`
- `balance` - Current balance
- `days_overdue` - Days overdue
- `notices_sent_count` - Total notices sent
- `delivery_proof_summary` - Proof all notices delivered
- `payment_attempts` - Number of payment attempts
- `insurance_status` - Pending or None
- `communication_summary` - Patient contact history
- `ai_recommendation` - write_off_small_balance | continue_internal_collections | hold_for_insurance | founder_review_required
- `ai_recommendation_rationale` - Why AI recommends this
- `founder_reviewed` - True when Founder reviews
- `founder_decision` - Founder's decision
- `founder_decision_rationale` - Founder's reasoning
- `outcome` - Final outcome

### 5. WriteOffRecord
Write-off audit record.

**Fields:**
- `account_id`, `statement_id`, `patient_id`
- `original_balance`, `amount_paid`, `write_off_amount`
- `reason` - small_balance | cost_exceeds_balance | undeliverable | deceased_patient | founder_decision
- `detailed_rationale` - Explanation
- `cost_benefit_analysis` - JSON (optional)
- `approved_by` - "Founder (user_id: X)"
- `approved_at` - Timestamp
- `governance_version` - Policy version
- `reversible` - False (permanent)

### 6. CollectionsProhibitedAction
Log of blocked prohibited actions.

**Fields:**
- `action_attempted` - What was tried
- `prohibited_reason` - Why blocked
- `attempted_by` - Who/what tried
- `attempted_at` - Timestamp
- `governance_version` - Policy version
- `blocked` - True

## Service Layer (`backend/services/founder_billing/collections_governance_service.py`)

### CollectionsGovernanceService

**Core Methods:**

#### `create_collections_account(statement)`
Creates collections account automatically when statement generated.
- Links to statement
- Sets initial balance
- Records governance version
- Logs creation

#### `process_collections_cycle()`
Main collections processing loop (runs daily).
- Updates days_since_due for all accounts
- Determines escalation stage
- Sends appropriate notice (15/30/60/90 days)
- Respects payment pauses
- Flags accounts at 90+ days for Founder decision
- Logs all actions with policy references

#### `record_payment(account, payment_amount)`
Records payment and pauses escalation immediately.
- Updates balance
- Increments payment_attempts
- Pauses escalation if `pause_on_any_payment=True`
- Logs payment with rationale
- Resolves account if balance reaches $0

#### `_flag_for_founder_decision(account, statement)`
Flags account for Founder review at 90+ days.
- Sets `flagged_for_founder_decision=True`
- Changes phase to `DECISION_REQUIRED`
- Creates `CollectionsDecisionRequest` with:
  - Complete factual summary
  - Balance, days overdue, notices sent
  - Delivery proof
  - Payment attempts
  - Insurance status
  - AI recommendation with rationale
- No irreversible action without Founder intent

#### `process_founder_decision(decision_request_id, founder_decision, founder_rationale)`
Executes Founder decision.
- Decisions: write_off | continue_collections | hold
- If write_off: Calls `write_off_account()`
- If continue: Resumes escalation
- If hold: Pauses indefinitely
- Logs decision with rationale

#### `write_off_account(account, reason, rationale, approved_by)`
Writes off balance (requires Founder approval).
- Validates `approved_by` is not "AI"
- Creates `WriteOffRecord`
- Updates account: `written_off=True`, `current_balance=0`
- Sets phase to `WRITTEN_OFF`
- Logs with governance version

#### `block_prohibited_action(action_name, reason, attempted_by)`
Blocks prohibited actions per immutable governance.
- Logs attempt in `CollectionsProhibitedAction`
- Raises `PermissionError` with governance reference
- Examples:
  - "send_to_external_collections"
  - "report_to_credit_bureau"
  - "initiate_legal_action"

## API Routes (`backend/services/founder_billing/collections_governance_routes.py` - 12 endpoints)

### Policy & Configuration
- `GET /api/collections-governance/policy` - Get immutable governance policy

### Account Management
- `GET /api/collections-governance/accounts` - List collections accounts
- `GET /api/collections-governance/accounts/{id}` - Account details with full history
- `GET /api/collections-governance/summary` - Collections summary dashboard

### Operations
- `POST /api/collections-governance/cycle/process` - Process collections cycle
- `POST /api/collections-governance/payment/record` - Record payment (pauses escalation)

### Founder Decisions
- `GET /api/collections-governance/decisions/pending` - Pending Founder decisions
- `POST /api/collections-governance/decisions/founder` - Process Founder decision

### Write-Offs
- `POST /api/collections-governance/writeoff` - Write off account (Founder only)
- `GET /api/collections-governance/writeoffs` - List all write-offs

### Audit & Compliance
- `GET /api/collections-governance/audit-log` - Complete action log
- `GET /api/collections-governance/prohibited-actions` - Blocked actions log

## Final Internal Notice Template (Pre-Loaded)

```
Hello {{PatientName}},

This notice is regarding the outstanding balance for emergency medical services provided on {{ServiceDate}}.

Our records indicate that the balance below remains unresolved despite prior statements.

Outstanding Balance: {{BalanceDue}}

If you have insurance information to provide, questions about this statement, or would like to discuss payment options, please contact us as soon as possible. We are happy to assist.

If we do not hear from you, this account may require further internal review.

Thank you for your attention to this matter.

{{CompanyName}}
{{CompanyPhone}}
{{CompanyEmail}}
```

**Template Rules:**
- Pre-approved word-for-word
- Cannot be altered by AI without Founder approval
- Tone: Firm but respectful
- No threatening language
- No credit/legal references
- Invitation to contact
- Clear next step (internal review only)

## Founder Decision Workflow

### 1. Account Reaches 90+ Days
- AI flags account: `flagged_for_founder_decision=True`
- Phase changes to `DECISION_REQUIRED`
- No further automatic action

### 2. Decision Request Created
AI presents factual summary:
```json
{
  "account_id": 123,
  "balance": 450.00,
  "days_overdue": 95,
  "notices_sent": 5,
  "delivery_proof": ["Email delivered", "Physical mail delivered"],
  "payment_attempts": 0,
  "insurance_status": "None",
  "ai_recommendation": "continue_internal_collections",
  "ai_rationale": "5 notices sent with confirmed delivery but no response. Balance above threshold. Recommend continued follow-up."
}
```

### 3. Founder Reviews
Founder sees:
- Complete account history
- All notices sent (with dates)
- Delivery proof
- Communication attempts
- AI recommendation

### 4. Founder Decides
Options:
- **Write Off**: Approve write-off with reason
- **Continue Collections**: Resume internal follow-up
- **Hold**: Pause indefinitely (e.g., waiting for insurance)
- **External** (Blocked): Cannot escalate to external collections

### 5. Decision Executed
AI executes Founder decision:
- Logs decision with rationale
- Updates account status
- Records governance version
- Preserves audit trail

## Write-Off Decision Matrix

| Condition | Threshold | Auto-Eligible | Founder Approval Required |
|-----------|-----------|---------------|---------------------------|
| Small Balance | < $25 | Yes | Yes |
| Cost > Balance | Any | Yes | Yes |
| Undeliverable | Any | No | Yes |
| Deceased Patient | Any | No | Yes |
| Founder Discretion | Any | No | Yes |

**All write-offs logged with:**
- Original balance
- Amount paid
- Write-off amount
- Reason
- Detailed rationale
- Cost-benefit analysis (if applicable)
- Approved by Founder (user ID)
- Governance version
- Timestamp

## Collections Dashboard Summary

```json
{
  "total_accounts": 45,
  "accounts_by_phase": {
    "internal": 30,
    "pre_collections": 8,
    "decision_required": 5,
    "written_off": 2,
    "resolved": 0
  },
  "total_balance_in_collections": 12500.00,
  "pending_founder_decisions": 5,
  "accounts_paused": 12,
  "writeoffs_this_month": 2
}
```

## Operating Principle

**"Consistency over aggression. Clarity, fairness, and respect while protecting financial integrity."**

The Founder:
- Defines rules via immutable governance
- Reviews flagged accounts (90+ days)
- Approves all write-offs
- Can override AI decisions anytime

The AI:
- Executes rules exactly as defined
- Never deviates from approved templates
- Flags decision points (never decides alone)
- Logs every action with policy reference
- Blocks prohibited actions automatically

## Audit Trail Example

```
[2024-01-27 10:15:00] Collections account created. Initial balance: $450.00
  Executed by: AI Agent under Founder billing authority (Wisconsin)
  Policy: Governance v1.0 - Internal Collections - Day 0

[2024-02-11 10:00:00] Day 15 reminder sent. Balance: $450.00
  Executed by: AI Agent under Founder billing authority (Wisconsin)
  Policy: Governance v1.0 - Day 15 Escalation

[2024-02-26 10:00:00] Day 30 second notice sent. Balance: $450.00
  Executed by: AI Agent under Founder billing authority (Wisconsin)
  Policy: Governance v1.0 - Day 30 Escalation

[2024-02-28 14:30:00] Payment received: $100.00. Escalation paused. Remaining balance: $350.00
  Executed by: AI Agent under Founder billing authority (Wisconsin)
  Policy: Governance v1.0 - Payment Pause Rule

[2024-03-28 10:00:00] Day 60 final notice sent. Balance: $350.00
  Executed by: AI Agent under Founder billing authority (Wisconsin)
  Policy: Governance v1.0 - Day 60 Escalation

[2024-04-27 10:00:00] Day 90 final internal notice sent. Pre-Collections phase. Balance: $350.00
  Executed by: AI Agent under Founder billing authority (Wisconsin)
  Policy: Governance v1.0 - Day 90 Pre-Collections

[2024-05-02 10:00:00] Account flagged for Founder decision. 95 days overdue. Balance: $350.00. 5 notices sent.
  Executed by: AI Agent under Founder billing authority (Wisconsin)
  Policy: Governance v1.0 - Decision Required at 90+ days

[2024-05-03 15:45:00] Founder decision: continue_collections. Rationale: Patient indicated insurance filing in progress.
  Executed by: Founder (user_id: 1)
  Policy: Governance v1.0 - Founder Decision Workflow
```

## Integration with Main System

1. **Statement Generation** → Automatically creates `CollectionsAccount`
2. **Payment Posted** → Calls `record_payment()` → Pauses escalation
3. **Daily Cron Job** → Calls `process_collections_cycle()`
4. **Founder Dashboard** → Shows pending decisions
5. **Write-Off Approval** → Requires Founder user session

## Implementation Status

✅ **Immutable Governance Policy** - Locked once activated
✅ **Collections Account Tracking** - Full lifecycle management
✅ **Time-Based Escalation** - 0/15/30/60/90 days
✅ **Payment Pause Logic** - Immediate pause on payment
✅ **Founder Decision Workflow** - Flag at 90+ days
✅ **Write-Off Policy** - Founder approval required
✅ **Prohibited Action Blocking** - External collections disabled
✅ **Complete Audit Trail** - Every action logged
✅ **Final Internal Notice** - Pre-approved template
✅ **AI Boundaries** - Hard-coded limits
✅ **12 API Endpoints** - Full management interface

---

**This specification constitutes the authoritative and immutable collections governance for the platform until explicitly revised by the Founder.**
