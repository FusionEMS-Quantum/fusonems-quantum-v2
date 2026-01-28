# Fleet Maintenance Sub-Role System + AI Suggestions

## 1. Proposed User Roles for Fleet Module

### Primary Roles
```python
class FleetRole(str, Enum):
    fleet_manager = "fleet_manager"          # Strategic oversight, budget, compliance
    fleet_mechanic = "fleet_mechanic"        # Hands-on repairs, DVIR review
    fleet_supervisor = "fleet_supervisor"    # Daily operations, crew scheduling
    fleet_technician = "fleet_technician"    # Diagnostics, OBD analysis, preventive maintenance
    fleet_admin = "fleet_admin"              # Full fleet system access
```

### Permission Matrix
| Role | View Vehicles | Edit Vehicles | Create Maintenance | Complete Maintenance | View Telemetry | AI Insights | Approve Budget |
|------|--------------|--------------|-------------------|---------------------|----------------|-------------|----------------|
| **fleet_admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **fleet_manager** | ✓ | ✓ | ✓ | View Only | ✓ | ✓ | ✓ |
| **fleet_supervisor** | ✓ | Limited | ✓ | View Only | ✓ | View Only | ✗ |
| **fleet_mechanic** | ✓ | Status Only | View Only | ✓ | ✓ | View Only | ✗ |
| **fleet_technician** | ✓ | ✗ | ✓ (diagnostics) | ✗ | ✓ | ✓ (diagnostics) | ✗ |

---

## 2. Subscription System (Push Notifications + Email)

### Database Model: `FleetSubscription`
```python
class FleetSubscription(Base):
    __tablename__ = "fleet_subscriptions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Subscription channels
    push_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    
    # Event types (opt-in per category)
    critical_alerts = Column(Boolean, default=True)        # Check engine, low fuel, safety issues
    maintenance_due = Column(Boolean, default=True)        # Scheduled service approaching
    maintenance_overdue = Column(Boolean, default=True)    # Past due maintenance
    dvir_defects = Column(Boolean, default=True)           # Failed DVIR inspection
    daily_summary = Column(Boolean, default=False)         # Daily fleet status report
    weekly_summary = Column(Boolean, default=False)        # Weekly analytics report
    ai_recommendations = Column(Boolean, default=True)     # AI-powered insights
    vehicle_down = Column(Boolean, default=True)           # Vehicle out of service
    fuel_alerts = Column(Boolean, default=False)           # Fuel below 20%
    
    # Vehicle filters (optional - subscribe to specific vehicles)
    vehicle_ids = Column(JSON, default=list)  # Empty = all vehicles
    
    # Notification timing
    quiet_hours_start = Column(Integer, default=22)  # 10 PM
    quiet_hours_end = Column(Integer, default=6)     # 6 AM
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Notification Trigger Examples
```python
# 1. Check engine detected via OBD (already implemented in fleet_router.py)
if payload.check_engine:
    notify_subscribers(
        event_type="critical_alert",
        vehicle=vehicle,
        message=f"🚨 Check engine light detected on {vehicle.call_sign}",
        priority="urgent"
    )

# 2. Maintenance overdue
if vehicle.next_service_mileage_km < vehicle.mileage_km:
    notify_subscribers(
        event_type="maintenance_overdue",
        vehicle=vehicle,
        message=f"⚠️ {vehicle.call_sign} is overdue for service by {vehicle.mileage_km - vehicle.next_service_mileage_km} km",
        priority="normal"
    )

# 3. DVIR defect found
if dvir.defects_found and not dvir.vehicle_safe_to_operate:
    notify_subscribers(
        event_type="dvir_defects",
        vehicle=vehicle,
        message=f"🔴 {vehicle.call_sign} failed DVIR - NOT SAFE TO OPERATE",
        priority="critical"
    )

# 4. Daily summary (cron job at 7 AM)
def send_daily_fleet_summary():
    summary = {
        "vehicles_in_service": count_in_service(),
        "critical_alerts": count_critical_alerts(),
        "maintenance_due_today": get_maintenance_due_today(),
        "dvir_completion": calculate_dvir_completion_rate(),
    }
    notify_subscribers(
        event_type="daily_summary",
        message=f"📊 Daily Fleet Report: {summary['vehicles_in_service']} in service, {summary['critical_alerts']} critical alerts",
        data=summary
    )
```

---

## 3. AI-Powered Suggestions & Insights

### A. Predictive Maintenance Engine

**Data Sources:**
- OBD-II telemetry (speed, RPM, fuel, battery, check engine)
- Maintenance history (frequency, type, cost)
- Mileage accumulation rate
- DVIR defect patterns
- Vehicle age & make/model

**AI Models:**

#### 1. **Failure Prediction** (Classification Model)
```python
def predict_component_failure(vehicle_id: int) -> dict:
    """
    Predict likelihood of component failures in next 30/60/90 days
    Returns:
    {
        "engine": {"probability": 0.15, "days_until_failure": 45, "confidence": 0.82},
        "transmission": {"probability": 0.08, "days_until_failure": 120, "confidence": 0.75},
        "brakes": {"probability": 0.32, "days_until_failure": 30, "confidence": 0.88},
        "battery": {"probability": 0.65, "days_until_failure": 15, "confidence": 0.91}
    }
    """
    # Features: avg_rpm, hard_braking_events, battery_voltage_trend, check_engine_history
    # Model: Random Forest or XGBoost trained on historical failure data
```

**Notification:**
```
🤖 AI Insight: M101 battery likely to fail in 15 days (91% confidence)
   → Recommend replacement during next scheduled service
   → Estimated cost: $180 + 1 hr labor
```

#### 2. **Optimal Service Intervals** (Time-Series Forecasting)
```python
def calculate_optimal_service_interval(vehicle_id: int) -> dict:
    """
    Analyze usage patterns to recommend custom service intervals
    Returns:
    {
        "current_interval_km": 8000,
        "recommended_interval_km": 6500,
        "rationale": "High-idle usage detected (35% of runtime). Reduce interval by 20%.",
        "annual_cost_impact": -450  # Negative = saves money by preventing breakdowns
    }
    """
    # Factors: avg_daily_mileage, idle_time_percent, terrain (city vs highway), load_factor
```

**Notification:**
```
💡 AI Recommendation: M101 has high idle time (35% of runtime)
   → Reduce oil change interval from 8,000 km to 6,500 km
   → Prevents estimated $2,400/year in breakdown costs
```

#### 3. **Driver Behavior Impact** (Anomaly Detection)
```python
def analyze_driver_impact_on_maintenance(vehicle_id: int) -> dict:
    """
    Correlate driver behavior with maintenance costs
    Returns:
    {
        "hard_braking_events_per_100km": 12.5,  # Fleet avg: 6.2
        "excessive_idling_hours": 45,            # Fleet avg: 22
        "aggressive_acceleration_score": 7.8,    # 0-10 scale
        "maintenance_cost_premium": 1850,        # $1,850/year above average
        "recommendations": [
            "Driver training: Reduce hard braking events by 50% (save $900/year)",
            "Reduce idling: Install auto-shutoff timers (save $600/year)"
        ]
    }
    """
```

**Notification:**
```
🎯 Fleet Optimization: M101 has 2x fleet average hard braking events
   → Driver training recommended (estimated $900/year savings)
```

#### 4. **Cost Optimization** (Regression Model)
```python
def suggest_cost_optimizations(org_id: int) -> list:
    """
    Identify cost-saving opportunities across fleet
    Returns list of suggestions with ROI estimates:
    [
        {
            "type": "bulk_tire_purchase",
            "vehicles": ["M101", "M102", "M103"],
            "current_annual_cost": 12000,
            "optimized_cost": 9600,
            "savings": 2400,
            "action": "Bundle tire replacements in Q2 for 20% bulk discount"
        },
        {
            "type": "replace_vehicle",
            "vehicle": "M104",
            "rationale": "2012 Ford - maintenance cost ($8,500/yr) exceeds 40% of replacement value",
            "recommendation": "Replace with 2020 used vehicle",
            "3yr_savings": 18000
        }
    ]
    """
```

**Notification:**
```
💰 Cost Optimization Alert: Bundle tire replacements for M101, M102, M103
   → Save $2,400/year with bulk purchase discount
   → Action: Schedule all replacements in Q2
```

#### 5. **Fuel Efficiency Analysis** (Clustering + Regression)
```python
def analyze_fuel_efficiency(vehicle_id: int) -> dict:
    """
    Identify fuel waste and optimization opportunities
    Returns:
    {
        "current_mpg": 8.2,
        "fleet_avg_mpg": 9.5,
        "inefficiency_cost_annual": 1200,
        "root_causes": [
            {"cause": "Excessive idling", "impact_percent": 45, "fix": "Driver training + auto-shutoff"},
            {"cause": "Underinflated tires", "impact_percent": 30, "fix": "Weekly tire pressure checks"},
            {"cause": "Dirty air filter", "impact_percent": 25, "fix": "Replace air filter (overdue 2,000 km)"}
        ]
    }
    """
```

**Notification:**
```
⛽ Fuel Alert: M101 is 15% less efficient than fleet average
   → Root cause: Excessive idling (45% impact)
   → Fix: Enable auto-shutoff after 5 min idle (save $540/year)
```

#### 6. **Warranty & Recall Intelligence**
```python
def check_warranty_recall_status(vehicle: FleetVehicle) -> dict:
    """
    Cross-reference VIN with manufacturer warranty/recall databases
    Returns:
    {
        "active_recalls": [
            {
                "recall_id": "NHTSA-2023-12345",
                "issue": "Fuel pump failure risk",
                "severity": "high",
                "repair_available": True,
                "cost": 0  # Covered by recall
            }
        ],
        "warranty_coverage": {
            "powertrain_expires_km": 160000,
            "remaining_km": 35000,
            "expires_date": "2025-08-15"
        },
        "recommendation": "Schedule recall repair immediately (free). Delay major engine work until after warranty expires."
    }
    """
```

**Notification:**
```
🔔 Recall Alert: M101 (VIN 1FDEE3FL8KDC12345) has active NHTSA recall
   → Issue: Fuel pump failure risk (high severity)
   → Repair: FREE at authorized dealer
   → Action: Schedule within 30 days
```

---

## 4. AI Insight Dashboard (Fleet PWA Enhancement)

### New Section: "🤖 AI Insights"
```tsx
interface AIInsight {
  id: string
  type: 'predictive' | 'optimization' | 'cost_saving' | 'safety' | 'fuel'
  priority: 'low' | 'medium' | 'high' | 'critical'
  vehicle_id: number | null  // null = fleet-wide insight
  title: string
  description: string
  estimated_savings: number | null  // Annual $ savings
  confidence: number  // 0-1 scale
  action_required: string
  action_deadline: string | null
}
```

**Example UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Fleet Insights (Last 24 Hours)                        │
├─────────────────────────────────────────────────────────────┤
│ 🚨 CRITICAL (2)                                             │
│   • M101: Battery failure predicted in 8 days (94% conf.)  │
│     → Schedule replacement immediately                      │
│   • M104: Brake wear 85% - replace within 500 km           │
│                                                             │
│ 💰 COST SAVINGS (3)                                         │
│   • Bundle tire replacements: Save $2,400/year             │
│   • M102: Reduce idling → $680/year fuel savings           │
│   • Replace M105 (2011) → $5,200/year TCO reduction        │
│                                                             │
│ ⚠️ MAINTENANCE OPTIMIZATION (4)                             │
│   • M101: Reduce oil change interval to 6,500 km           │
│   • M103: Driver behavior causing 2x brake wear            │
│   • Fleet-wide: DVIR completion rate dropped to 72%        │
│   • M106: Active recall - free fuel pump repair available  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Roadmap

### Phase 1: Role System + Subscriptions (Week 1-2)
- [ ] Add fleet roles to `UserRole` enum
- [ ] Create `FleetSubscription` model + migration
- [ ] Build subscription management UI in Fleet PWA
- [ ] Implement `notify_subscribers()` function with push/email/SMS
- [ ] Hook notifications into existing triggers (check engine, DVIR defects)

### Phase 2: Basic AI Insights (Week 3-4)
- [ ] Failure prediction model (battery, brakes)
- [ ] Fuel efficiency analysis
- [ ] Driver behavior scoring
- [ ] AI Insights dashboard section in Fleet PWA

### Phase 3: Advanced AI Features (Week 5-8)
- [ ] Predictive maintenance for all components
- [ ] Cost optimization recommendations
- [ ] Warranty/recall intelligence (integrate NHTSA API)
- [ ] Optimal service interval calculator
- [ ] Fleet rightsizing recommendations

### Phase 4: Integration & Automation (Week 9-12)
- [ ] Auto-create work orders from AI predictions
- [ ] Parts inventory integration (predict stock needs)
- [ ] Vendor pricing API (real-time cost estimates)
- [ ] Mobile app for mechanics with AI-guided diagnostics
- [ ] Voice assistant: "Hey Quantum, what's wrong with M101?"

---

## 6. Sample Use Cases

### Use Case 1: Fleet Mechanic Daily Workflow
**Morning:**
1. Mechanic logs into Fleet PWA with `fleet_mechanic` role
2. AI Insights shows: "🚨 M101: Check engine (P0301 - Cylinder 1 misfire)"
3. AI suggests: "Likely spark plug failure (82% confidence). Replace all 6 plugs ($180 + 1 hr)."
4. Mechanic accepts work order, completes repair
5. Updates maintenance record → AI learns for future predictions

### Use Case 2: Fleet Manager Monthly Review
**Role:** `fleet_manager`
**Subscriptions:** Weekly summaries, AI recommendations, cost alerts

**Monday 8 AM Email:**
```
📊 Weekly Fleet Report (Jan 22-28, 2026)

🚑 Vehicles in Service: 12 / 15 (80%)
   • M104, M107, M109 in maintenance

💰 Cost Insights:
   • Total maintenance spend: $4,250 (15% below budget)
   • AI-suggested savings identified: $8,200/year

🤖 Top AI Recommendations:
   1. Replace M105 (2011 Ford) → $5,200/year TCO reduction
   2. Bundle Q2 tire replacements → $2,400/year savings
   3. Driver training for M101 crew → $680/year fuel savings

⚠️ Critical Alerts:
   • M101: Battery replacement needed (14 days)
   • M103: DVIR defect - brake light out (safe to operate)

📋 DVIR Compliance: 88% (target: 95%)
```

### Use Case 3: Dispatcher Needs Vehicle
**Scenario:** Dispatcher assigns M101 to emergency call

**Fleet API Check:**
```python
# Before dispatch, check AI health score
health = get_vehicle_health_score("M101")
# Returns: {"score": 72, "issues": ["Battery end-of-life (14 days)"], "safe": True}

if health["score"] < 50:
    suggest_alternative_vehicle()  # Recommend M102 instead
```

**Notification to Fleet Supervisor:**
```
📍 M101 dispatched with known issue (battery EOL in 14 days)
   → Monitor closely. Backup unit M102 on standby.
```

---

## 7. Data Privacy & Security

- **Role-based access:** Only fleet roles can access telemetry/maintenance data
- **Audit logging:** All AI recommendations logged with decision outcomes
- **Opt-in subscriptions:** Users control notification frequency/types
- **Data retention:** Telemetry older than 90 days aggregated (no GPS tracking)
- **Training mode:** Sandbox AI models don't affect production insights

---

## 8. ROI Metrics

### Expected Impact (12-month projection):
| Metric | Baseline | With AI | Improvement | Annual Value |
|--------|----------|---------|-------------|--------------|
| Unplanned downtime (days/vehicle/year) | 12 | 6 | -50% | $48,000 |
| Maintenance cost per vehicle | $8,500 | $6,800 | -20% | $25,500 |
| Fuel cost per vehicle | $15,000 | $13,500 | -10% | $22,500 |
| DVIR compliance rate | 78% | 95% | +17 pts | $12,000 (avoid fines) |
| Fleet utilization rate | 72% | 85% | +13 pts | $65,000 (defer purchases) |
| **Total Annual Savings** | | | | **$173,000** |

**AI System Cost:** ~$12,000/year (infrastructure + model training)
**Net ROI:** 1,342% first year

---

## Next Steps

1. **Approve role structure** → Add to `UserRole` enum
2. **Design subscription UI** → Self-service notification preferences
3. **Prioritize AI features** → Start with battery/brake failure prediction (highest ROI)
4. **Pilot program** → Test with 5 vehicles for 30 days before full rollout

Let me know which features you want to build first!
