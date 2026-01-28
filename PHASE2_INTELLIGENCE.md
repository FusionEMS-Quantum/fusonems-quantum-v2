# Phase 2 Intelligence — Architecture & Integration Guide

## Executive Summary

Phase 2 Intelligence enables FusionEMS Quantum to **anticipate risk, recommend safer decisions, and prevent downstream failure** — while keeping humans firmly in control.

## Global Operating Rules (Non-Negotiable)

1. **Human authority is final** — AI recommends, never mandates
2. **Explainability is mandatory** — Every output must be explainable in plain language
3. **Intelligence must be reversible** — All outputs tolerate override with audit logging
4. **Uncertainty must be visible** — Confidence levels always disclosed
5. **Safety > speed > cost** — This priority order applies everywhere, always

---

## System Architecture

### Database Models (`models/intelligence.py`)

#### Forecasting & Predictive Ops
- **CallVolumeForecast**: Hour/4hr/12hr/day/week forecasts with surge probability
- **CoverageRiskSnapshot**: Real-time coverage adequacy assessment
- **ForecastHorizon**, **CallVolumeType**, **ConfidenceLevel** enums

#### Advanced Recommendations
- **UnitTurnaroundPrediction**: Scene/transport/dwell/documentation time predictions
- **CrewFatigueScore**: Duty hours, call count, acuity-based fatigue assessment

#### Smart Notifications
- **IntelligentAlert**: Role-aware alerts (dispatcher/supervisor/clinical/billing)
- **AlertType**, **AlertSeverity**, **AlertAudience** enums

#### Documentation & Compliance
- **DocumentationRiskAssessment**: Medical necessity, completeness, NEMSIS risk
- **NEMSISValidationPrediction**: Pre-submission error detection

#### Learning & Feedback
- **AIRecommendationOutcome**: Acceptance/override tracking
- **UserAIFeedback**: Explicit user feedback (good/missed context/unsafe/incorrect/helpful)
- **AIAuditLog**: Complete audit trail for all intelligence operations

### Service Layer

#### `PredictiveOpsService` (DOMAIN 1)
```python
async def forecast_call_volume(organization_id, horizon, call_type, zone_id)
async def assess_coverage_risk(organization_id, zone_id)
```
- Historical data analysis (90-day lookback)
- Time-of-day and day-of-week patterns
- Surge probability calculation
- "Last available unit" detection

#### `AdvancedRecommendationService` (DOMAIN 2)
```python
async def predict_unit_turnaround(unit_id, incident_id)
async def calculate_crew_fatigue(unit_id)
```
- Historical unit performance
- Facility-specific dwell times
- Shift duration and call intensity
- HEMS regulatory limit enforcement

#### `SmartNotificationService` (DOMAIN 3 & 4)
```python
async def detect_incident_escalation(incident_id)
async def assess_documentation_risk(incident_id, epcr_id)
async def predict_nemsis_validation(incident_id, epcr_id)
```
- Unit stuck en route detection (>30min)
- Excessive scene time (>45min)
- Delayed hospital offload (>40min)
- Missing NEMSIS elements
- Medical necessity risk scoring

#### `LearningFeedbackService` (DOMAIN 5)
```python
async def record_recommendation_outcome(...)
async def record_user_feedback(...)
async def analyze_override_patterns(recommendation_type, lookback_days)
async def calculate_model_performance(recommendation_type, lookback_days)
```
- Override reason tracking
- Systematic issue identification
- Prediction accuracy calculation
- Continuous improvement data

#### `AIAgentOrchestrator`
Coordinates all domains, enforces global rules, provides unified API.

---

## API Endpoints

### POST /api/intelligence/operational
**DOMAIN 1: Predictive Operations**

Request:
```json
{
  "organization_id": "org-001",
  "zone_id": "zone-downtown"
}
```

Response:
```json
{
  "domain": "predictive_operations",
  "forecasts": {
    "next_hour": {
      "forecast_for": "2026-01-27T15:00:00Z",
      "predicted_volume": 12.5,
      "baseline_volume": 10.0,
      "surge_probability": 0.7,
      "confidence": "HIGH",
      "confidence_band": { "lower": 10.2, "upper": 14.8 },
      "explanation": "High surge probability (70%); Above baseline by 25%"
    },
    "next_4_hours": { ... }
  },
  "coverage_risk": {
    "risk_level": "MODERATE",
    "available_units": 3,
    "required_minimum": 2,
    "active_incidents": 2,
    "explanation": "Coverage is marginal: 3 units available, 2 required."
  }
}
```

**Authority**: Advisory only, never alters dispatch

---

### POST /api/intelligence/unit
**DOMAIN 2: Advanced Unit Intelligence**

Request:
```json
{
  "unit_id": "unit-m17",
  "incident_id": "incident-001"
}
```

Response:
```json
{
  "domain": "advanced_unit_intelligence",
  "fatigue_assessment": {
    "fatigue_score": 0.75,
    "risk_level": "LOW",
    "hours_on_duty": 4.5,
    "calls_this_shift": 3,
    "explanation": "Crew is well-rested and alert",
    "recommendation_impact": "No ranking impact; crew is well-rested."
  },
  "turnaround_prediction": {
    "total_minutes": 52.3,
    "breakdown": {
      "scene": 15.0,
      "transport": 22.0,
      "hospital_dwell": 20.0,
      "documentation": 5.0
    },
    "confidence": "HIGH",
    "explanation": "Standard turnaround expected"
  }
}
```

**Authority**: Influences recommendations, dispatcher override always allowed

---

### POST /api/intelligence/incident/monitor
**DOMAIN 3: Smart Notifications**

Request:
```json
{
  "incident_id": "incident-stuck-001"
}
```

Response:
```json
{
  "domain": "smart_notifications",
  "escalation_detected": true,
  "escalation_details": {
    "alert_id": "alert-001",
    "severity": "WARNING",
    "issues": ["unit_stuck_en_route"],
    "suggested_actions": [
      "Contact unit via radio to confirm status",
      "Dispatch supervisor to check on unit",
      "Consider dispatching backup unit"
    ]
  }
}
```

**Authority**: Alerts only, no automated escalation

---

### POST /api/intelligence/documentation/assess
**DOMAIN 4: Documentation & Compliance**

Request:
```json
{
  "incident_id": "incident-001",
  "epcr_id": "epcr-001"
}
```

Response:
```json
{
  "domain": "documentation_compliance",
  "documentation_risk": {
    "denial_probability": 0.45,
    "medical_necessity_risk": 0.5,
    "completeness_score": 0.7,
    "nemsis_risk": 0.2,
    "missing_elements": [
      "Chief Complaint (eResponse.05)",
      "Vital Signs (eVitals)"
    ],
    "suggestions": [
      "Add Chief Complaint (eResponse.05)",
      "Add Vital Signs (eVitals)"
    ]
  },
  "nemsis_validation": {
    "submission_ready": 0.7,
    "rejection_probability": 0.3,
    "predicted_errors": [
      "Missing eDisposition.21",
      "Invalid ePatient.13 format"
    ]
  }
}
```

**Authority**: Advisory only, no auto-editing of records

---

### POST /api/intelligence/learning/outcome
**DOMAIN 5: Learning & Feedback**

Request:
```json
{
  "recommendation_type": "unit_recommendation",
  "recommendation_id": "rec-001",
  "ai_suggested": { "unit_id": "unit-m17" },
  "user_action": { "unit_id": "unit-m20" },
  "user_id": "dispatcher-001",
  "was_accepted": false,
  "override_reason": "Unit M-20 has better equipment for this call"
}
```

Response:
```json
{
  "domain": "learning_feedback",
  "outcome_recorded": true,
  "outcome_id": "outcome-001"
}
```

---

### POST /api/intelligence/feedback
**DOMAIN 5: User Feedback**

Request:
```json
{
  "user_id": "dispatcher-001",
  "feedback_type": "GOOD_RECOMMENDATION",
  "entity_type": "unit_recommendation",
  "entity_id": "rec-002",
  "rating": 5,
  "comment": "Recommended unit was perfect for this call type"
}
```

Feedback Types:
- `GOOD_RECOMMENDATION`
- `MISSED_CONTEXT`
- `UNSAFE_SUGGESTION`
- `INCORRECT_PREDICTION`
- `HELPFUL_WARNING`

---

### GET /api/intelligence/learning/insights/{recommendation_type}
**DOMAIN 5: Learning Insights**

Response:
```json
{
  "domain": "learning_feedback",
  "recommendation_type": "unit_recommendation",
  "override_analysis": {
    "total_recommendations": 150,
    "accepted_rate": 0.72,
    "override_rate": 0.28,
    "top_override_reasons": [
      ["Better equipment", 15],
      ["Closer to scene", 12],
      ["Crew familiarity", 8]
    ],
    "systematic_issues": []
  },
  "model_performance": {
    "total_with_outcome": 120,
    "accuracy": 0.85,
    "performance_level": "EXCELLENT"
  }
}
```

---

## Frontend Components

### `OperationalIntelligenceDashboard.tsx`
**Props:**
```typescript
{
  organizationId: string
  zoneId?: string
  refreshInterval?: number  // default: 60000ms
}
```

**Features:**
- Coverage risk badge (SAFE/MODERATE/CRITICAL/LAST_UNIT)
- 1-hour and 4-hour call volume forecasts
- Surge probability indicators
- Confidence bands visualization
- Auto-refresh with manual override
- Explainability text for all predictions

### `IntelligentAlerts.tsx`
**Props:**
```typescript
{
  userId: string
  userRole: 'DISPATCHER' | 'SUPERVISOR' | 'CLINICAL_LEADERSHIP' | 'BILLING_COMPLIANCE'
  refreshInterval?: number  // default: 30000ms
}
```

**Features:**
- Role-aware alert filtering
- New vs. acknowledged alerts
- Alert details drawer with suggested actions
- Dismiss with reason tracking
- Confidence indicators
- Time-sensitive prioritization

---

## Integration Points

### Phase 1 Unit Recommendations
Phase 2 enhances Phase 1 by providing:
- Fatigue scores → adjust unit ranking weights
- Turnaround predictions → improve coverage risk calculations
- Override learning → tune recommendation weights over time

### Routing & Traffic Layer
- Turnaround predictions use routing service for transport time estimates
- Coverage risk assessment incorporates traffic-aware ETAs

### ePCR System
- Documentation risk runs on ePCR save/submit
- NEMSIS validation pre-checks before state submission
- Suggested improvements surface in ePCR UI

### Billing & Compliance
- Medical necessity risk alerts billing team
- Denial probability triggers pre-claim review
- Historical denial data feeds machine learning

---

## Audit & Forensics

Every AI operation logs to `AIAuditLog`:
- **Inputs**: All parameters used
- **Outputs**: All recommendations/predictions
- **Confidence**: Level disclosed
- **User Override**: Action taken + reason
- **Outcome**: Final result recorded

Query examples:
```sql
-- All high-confidence forecasts that were wrong
SELECT * FROM ai_audit_logs 
WHERE intelligence_domain = 'predictive_ops'
AND confidence = 'HIGH'
AND outcome = 'INACCURATE';

-- All unit recommendations that were overridden
SELECT * FROM ai_recommendation_outcomes
WHERE was_overridden = true
AND recommendation_type = 'unit_recommendation'
ORDER BY created_at DESC;
```

---

## Bias & Fairness

The AI must NOT:
- ❌ Penalize specific crews unfairly
- ❌ Create hidden priority bias
- ❌ Optimize for cost at the expense of safety

Safeguards:
- ✅ Override reasons captured for bias detection
- ✅ Systematic issue identification in learning analysis
- ✅ No demographic/identity data used in scoring
- ✅ Transparent weight configurations per call type

---

## What Phase 2 Intelligence NEVER Does

❌ Auto-dispatch units  
❌ Auto-escalate to external agencies  
❌ Auto-submit billing or compliance filings  
❌ Conceal uncertainty  
❌ Replace dispatcher judgment  
❌ Act without audit traceability

---

## Completion Criteria

Phase 2 intelligence is complete when:
- ✅ Dispatchers report reduced cognitive load
- ✅ Supervisors receive earlier warnings
- ✅ Coverage failures decrease
- ✅ Billing denials drop
- ✅ Overrides decrease without removing control
- ✅ All intelligence remains explainable

---

## Deployment Checklist

### Backend
- [ ] Run database migrations for `intelligence.py` models
- [ ] Verify `intelligence_router` registered in `main.py`
- [ ] Seed default `RecommendationWeight` records for 911/IFT/HEMS
- [ ] Configure coverage minimum thresholds per organization
- [ ] Enable background jobs for continuous learning analysis

### Frontend
- [ ] Add `<OperationalIntelligenceDashboard>` to dispatcher view
- [ ] Add `<IntelligentAlerts>` to all user roles
- [ ] Wire feedback buttons to `/api/intelligence/feedback`
- [ ] Display confidence indicators on all AI outputs
- [ ] Test role-aware alert routing

### Monitoring
- [ ] Dashboard for AI accuracy metrics
- [ ] Alert fatigue monitoring (dismissal rates)
- [ ] Override pattern analysis (weekly review)
- [ ] Model drift detection
- [ ] Explainability audit (spot-check explanations)

---

## Support & Troubleshooting

**Low confidence warnings appearing frequently**
- Check historical data completeness (need 7+ days minimum)
- Verify time-of-day patterns are captured
- Review data quality for missing timestamps

**High override rates**
- Run `/api/intelligence/learning/insights/{type}`
- Review top override reasons
- Adjust weights if systematic misalignment detected

**Alerts not routing correctly**
- Verify user role in session/JWT
- Check `AlertAudience` enum matches user role
- Confirm alert creation includes correct `audience` field

**Fatigue scores not affecting recommendations**
- Verify `CrewFatigueScore` records are being created
- Check `hours_on_duty` and `calls_this_shift` data accuracy
- Confirm Phase 1 recommendations service reads fatigue scores

---

## One-Sentence Mission Statement

**Phase 2 Intelligence enables FusionEMS Quantum to anticipate risk, recommend safer decisions, and prevent downstream failure — while keeping humans firmly in control.**
