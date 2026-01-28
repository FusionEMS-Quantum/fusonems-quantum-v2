# Unit Recommendation Intelligence

## Overview
AI-powered unit recommendation system with traffic-aware ETAs, weighted scoring model, and complete audit trail.

## Architecture

### Database Models (`models/recommendations.py`)
- **UnitRecommendationRun**: Audit log of each recommendation calculation
- **UnitCandidateScore**: Detailed score breakdown per unit per run
- **RecommendationWeight**: Configurable weights per call type (911/IFT/HEMS)
- **Enums**: CallType, RecommendationConfidence, DispatcherAction

### Scoring Algorithm

#### Call-Type Specific Weights

**911 Emergency (ETA-focused)**
- ETA: 35%
- Availability: 25%
- Capability: 15%
- Fatigue: 10%
- Coverage: 10%
- Cost: 5%

**IFT (Capability/Cost-focused)**
- ETA: 20%
- Availability: 25%
- Capability: 20%
- Fatigue: 5%
- Coverage: 15%
- Cost: 15%

**HEMS (Safety/Fatigue-focused)**
- ETA: 25%
- Availability: 25%
- Capability: 15%
- Fatigue: 20%
- Coverage: 10%
- Cost: 5%

#### Eligibility Gates (Hard Rules)
1. Unit status must be AVAILABLE or STAGING
2. Unit must have all required capabilities
3. Unit cannot be out_of_service or in maintenance_mode
4. HEMS units must have < 12 flight hours today

#### Scoring Components

**ETA Score (Traffic-Aware)**
- Integrates with routing service for traffic-aware calculations
- Uses paid Mapbox API for 911 calls, OSM+Valhalla for IFT/HEMS
- 911: <= 8min = 1.0, <= 15min = 0.8, <= 25min = 0.5, > 25min = 0.2
- IFT: <= 20min = 1.0, <= 40min = 0.7, <= 60min = 0.4, > 60min = 0.1

**Availability Score**
- AVAILABLE = 1.0
- STAGING = 0.8
- Other = 0.0

**Capability Score**
- Base: 0.6
- +0.2 for ALS
- +0.1 for CRITICAL_CARE
- +0.05 for BARIATRIC
- +0.05 for NEONATAL

**Fatigue Score**
- HEMS: < 4hr = 1.0, < 8hr = 0.8, < 10hr = 0.5, >= 10hr = 0.2
- Ground: < 8hr = 1.0, < 12hr = 0.8, < 16hr = 0.5, >= 16hr = 0.3

**Coverage Score**
- Placeholder: 0.7 (to be enhanced with station coverage analysis)

**Cost Score**
- IFT: < $5/mi = 1.0, < $8/mi = 0.7, >= $8/mi = 0.4
- HEMS: 0.5 (fixed)
- Other: 0.7

### Backend Service (`services/recommendations/service.py`)

**UnitRecommendationService**
- `recommend_units()` - Main entry point, returns top N ranked units
- `_get_weights()` - Fetches org-specific or default weights
- `_get_eligible_units()` - Applies eligibility gates
- `_score_units()` - Calculates all scores and total
- `_calculate_eta_score()` - Traffic-aware ETA via routing service
- `_calculate_confidence()` - HIGH/MEDIUM/LOW based on top score
- `_generate_explanation()` - Human-readable score justification
- `log_dispatcher_action()` - Records ACCEPTED/OVERRIDDEN/MODIFIED actions

### API Endpoints (`services/recommendations/routes.py`)

**POST /api/recommendations/units**
```json
{
  "call_id": "call-123",
  "call_type": "EMERGENCY_911",
  "scene_lat": 40.7128,
  "scene_lon": -74.0060,
  "required_capabilities": ["ALS", "CARDIAC"],
  "patient_acuity": "CRITICAL",
  "transport_destination_lat": 40.7489,
  "transport_destination_lon": -73.9680,
  "organization_id": "org-456",
  "top_n": 3
}
```

Response:
```json
{
  "run_id": "uuid",
  "recommendations": [
    {
      "unit_id": "unit-789",
      "unit_name": "M-17",
      "unit_type": "ALS",
      "eta_minutes": 5.2,
      "eta_score": 0.95,
      "availability_score": 1.0,
      "capability_score": 0.85,
      "fatigue_score": 0.90,
      "coverage_score": 0.70,
      "cost_score": 0.80,
      "total_score": 0.89,
      "explanation": "Quick response time (ETA score: 0.95); Immediately available; High capability match; Well-rested crew"
    }
  ],
  "all_candidates": [...],
  "confidence": "HIGH",
  "weights_used": {
    "eta": 0.35,
    "availability": 0.25,
    "capability": 0.15,
    "fatigue": 0.10,
    "coverage": 0.10,
    "cost": 0.05
  }
}
```

**POST /api/recommendations/log-action**
```json
{
  "run_id": "uuid",
  "action": "ACCEPTED",
  "selected_unit_id": "unit-789",
  "override_reason": null,
  "dispatcher_user_id": "user-123"
}
```

### Frontend Component (`cad-dashboard/src/components/UnitRecommendations.tsx`)

**Features**
- Top 3 recommendation cards with ETA, scores, and progress bar
- Confidence indicator (HIGH/MEDIUM/LOW)
- Auto-refresh every 30 seconds + manual refresh button
- "Dispatch", "Add Backup", "Explain" buttons per unit
- "Show more candidates" expandable list
- "Explain" drawer with detailed score breakdown and weighted calculation
- Real-time loading states and error handling

**Props**
```typescript
interface UnitRecommendationsProps {
  callId: string
  callType: '911' | 'IFT' | 'HEMS'
  sceneLat: number
  sceneLon: number
  requiredCapabilities: string[]
  patientAcuity?: string
  destinationLat?: number
  destinationLon?: number
  organizationId?: string
  onDispatch: (unitId: string) => void
  onAddBackup: (unitId: string) => void
}
```

## Integration Points

1. **Routing Service**: Provides traffic-aware ETAs
2. **Unit Model**: Current location, status, capabilities, fatigue metrics
3. **WebSocket**: Real-time unit status updates trigger re-calculation
4. **Audit Trail**: Every recommendation and dispatcher action logged

## Acceptance Tests (`backend/tests/test_recommendations.py`)

- **test_911_scenario()**: Validates ETA-focused scoring for emergency calls
- **test_ift_scenario()**: Validates capability/cost-focused scoring for transfers
- **test_hems_scenario()**: Validates safety/fatigue-focused scoring for flights

## Dispatcher Authority

- System provides recommendations, never forces dispatch
- Dispatcher can accept, override, or modify recommendation
- All actions logged with reason codes
- Override reasons required for compliance/training

## Future Enhancements

1. **Coverage Score Enhancement**: Real-time station coverage gap analysis
2. **Machine Learning**: Learn from dispatcher overrides to improve weights
3. **Historical Performance**: Factor unit historical on-time performance
4. **Predicted Availability**: Use ML to predict unit clear times
5. **Multi-Unit Coordination**: Recommend optimal unit pairs for intercept scenarios
