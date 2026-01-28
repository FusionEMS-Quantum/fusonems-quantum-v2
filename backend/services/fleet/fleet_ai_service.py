from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from models.fleet import (
    FleetVehicle,
    FleetTelemetry,
    FleetMaintenance,
    FleetDVIR,
    FleetAIInsight,
    FleetSubscription,
)
from models.user import User
from utils.events import publish_event


class FleetAIService:
    """AI-powered fleet management predictions and insights"""

    def __init__(self, db: Session, org_id: int, training_mode: bool = False):
        self.db = db
        self.org_id = org_id
        self.training_mode = training_mode

    def predict_battery_failure(self, vehicle_id: int) -> Optional[Dict]:
        """Predict battery failure based on voltage trends"""
        telemetry_records = (
            self.db.query(FleetTelemetry)
            .filter(
                FleetTelemetry.vehicle_id == vehicle_id,
                FleetTelemetry.org_id == self.org_id,
                FleetTelemetry.training_mode == self.training_mode,
                FleetTelemetry.created_at >= datetime.utcnow() - timedelta(days=30),
            )
            .order_by(desc(FleetTelemetry.created_at))
            .limit(100)
            .all()
        )

        if len(telemetry_records) < 10:
            return None

        voltages = [float(t.payload.get("battery_voltage", 12.6)) for t in telemetry_records if t.payload.get("battery_voltage")]
        
        if not voltages:
            return None

        avg_voltage = sum(voltages) / len(voltages)
        voltage_trend = (voltages[0] - voltages[-1]) / len(voltages) if len(voltages) > 1 else 0
        
        if avg_voltage < 12.2:
            confidence = 0.95
            days_until_failure = 7
            probability = 0.85
        elif avg_voltage < 12.4:
            confidence = 0.88
            days_until_failure = 14
            probability = 0.65
        elif voltage_trend < -0.01:
            confidence = 0.75
            days_until_failure = 30
            probability = 0.40
        else:
            return None

        return {
            "component": "battery",
            "probability": probability,
            "days_until_failure": days_until_failure,
            "confidence": confidence,
            "current_voltage": avg_voltage,
            "voltage_trend": voltage_trend,
        }

    def predict_brake_wear(self, vehicle_id: int) -> Optional[Dict]:
        """Predict brake wear based on hard braking events and mileage"""
        telemetry_records = (
            self.db.query(FleetTelemetry)
            .filter(
                FleetTelemetry.vehicle_id == vehicle_id,
                FleetTelemetry.org_id == self.org_id,
                FleetTelemetry.training_mode == self.training_mode,
                FleetTelemetry.created_at >= datetime.utcnow() - timedelta(days=30),
            )
            .order_by(desc(FleetTelemetry.created_at))
            .limit(200)
            .all()
        )

        if len(telemetry_records) < 20:
            return None

        hard_braking_events = sum(
            1 for i in range(len(telemetry_records) - 1)
            if abs(float(telemetry_records[i].payload.get("speed_kmh", 0)) - 
                   float(telemetry_records[i + 1].payload.get("speed_kmh", 0))) > 20
        )

        vehicle = self.db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
        if not vehicle:
            return None

        mileage = float(vehicle.payload.get("mileage_km", 0))
        last_brake_service = vehicle.payload.get("last_brake_service_km", 0)
        km_since_brake_service = mileage - last_brake_service if last_brake_service else mileage

        brake_wear_estimate = (km_since_brake_service / 60000) + (hard_braking_events / 1000)

        if brake_wear_estimate > 0.85:
            confidence = 0.88
            km_remaining = 5000
            probability = 0.90
        elif brake_wear_estimate > 0.70:
            confidence = 0.82
            km_remaining = 10000
            probability = 0.65
        else:
            return None

        return {
            "component": "brakes",
            "probability": probability,
            "km_remaining": km_remaining,
            "confidence": confidence,
            "hard_braking_events": hard_braking_events,
            "brake_wear_percent": min(int(brake_wear_estimate * 100), 100),
        }

    def analyze_fuel_efficiency(self, vehicle_id: int) -> Optional[Dict]:
        """Analyze fuel efficiency and identify waste"""
        telemetry_records = (
            self.db.query(FleetTelemetry)
            .filter(
                FleetTelemetry.vehicle_id == vehicle_id,
                FleetTelemetry.org_id == self.org_id,
                FleetTelemetry.training_mode == self.training_mode,
                FleetTelemetry.created_at >= datetime.utcnow() - timedelta(days=30),
            )
            .all()
        )

        if len(telemetry_records) < 50:
            return None

        idle_count = sum(1 for t in telemetry_records if float(t.payload.get("engine_rpm", 0)) > 600 and float(t.payload.get("speed_kmh", 0)) == 0)
        idle_percent = (idle_count / len(telemetry_records)) * 100

        fuel_levels = [float(t.payload.get("fuel_level_percent", 100)) for t in telemetry_records if t.payload.get("fuel_level_percent")]
        if not fuel_levels or len(fuel_levels) < 2:
            return None

        fuel_consumption_rate = abs(fuel_levels[0] - fuel_levels[-1]) / len(telemetry_records)

        inefficiency_cost = 0
        root_causes = []

        if idle_percent > 25:
            inefficiency_cost += int(idle_percent * 25)
            root_causes.append({
                "cause": "Excessive idling",
                "impact_percent": min(int(idle_percent * 2), 50),
                "fix": "Driver training + auto-shutoff after 5 min",
                "savings": int(idle_percent * 20),
            })

        if fuel_consumption_rate > 0.15:
            inefficiency_cost += 400
            root_causes.append({
                "cause": "Aggressive driving",
                "impact_percent": 30,
                "fix": "Driver behavior training",
                "savings": 400,
            })

        if not root_causes:
            return None

        return {
            "idle_percent": round(idle_percent, 1),
            "fuel_consumption_rate": round(fuel_consumption_rate, 3),
            "inefficiency_cost_annual": inefficiency_cost,
            "root_causes": root_causes,
        }

    def analyze_driver_behavior(self, vehicle_id: int) -> Optional[Dict]:
        """Analyze driver impact on maintenance costs"""
        telemetry_records = (
            self.db.query(FleetTelemetry)
            .filter(
                FleetTelemetry.vehicle_id == vehicle_id,
                FleetTelemetry.org_id == self.org_id,
                FleetTelemetry.training_mode == self.training_mode,
                FleetTelemetry.created_at >= datetime.utcnow() - timedelta(days=30),
            )
            .order_by(desc(FleetTelemetry.created_at))
            .limit(500)
            .all()
        )

        if len(telemetry_records) < 50:
            return None

        hard_braking = sum(
            1 for i in range(len(telemetry_records) - 1)
            if abs(float(telemetry_records[i].payload.get("speed_kmh", 0)) - 
                   float(telemetry_records[i + 1].payload.get("speed_kmh", 0))) > 20
        )

        rapid_acceleration = sum(
            1 for i in range(len(telemetry_records) - 1)
            if float(telemetry_records[i + 1].payload.get("engine_rpm", 0)) - 
               float(telemetry_records[i].payload.get("engine_rpm", 0)) > 1000
        )

        idle_time = sum(1 for t in telemetry_records if float(t.payload.get("engine_rpm", 0)) > 600 and float(t.payload.get("speed_kmh", 0)) == 0)

        total_distance = sum(float(t.payload.get("speed_kmh", 0)) for t in telemetry_records) / 60

        hard_braking_per_100km = (hard_braking / max(total_distance, 1)) * 100 if total_distance > 0 else 0
        aggressive_score = min((hard_braking + rapid_acceleration) / 50, 10)
        idle_hours = idle_time / 120

        maintenance_cost_premium = int(hard_braking_per_100km * 100 + aggressive_score * 150)

        recommendations = []
        if hard_braking_per_100km > 8:
            recommendations.append({
                "action": "Driver training: Reduce hard braking",
                "savings": int(hard_braking_per_100km * 80),
            })
        if idle_hours > 30:
            recommendations.append({
                "action": "Install auto-shutoff timers",
                "savings": int(idle_hours * 15),
            })

        if not recommendations:
            return None

        return {
            "hard_braking_events_per_100km": round(hard_braking_per_100km, 1),
            "excessive_idling_hours": round(idle_hours, 1),
            "aggressive_acceleration_score": round(aggressive_score, 1),
            "maintenance_cost_premium": maintenance_cost_premium,
            "recommendations": recommendations,
        }

    def generate_insights(self, vehicle_id: Optional[int] = None) -> List[FleetAIInsight]:
        """Generate AI insights for vehicle(s)"""
        insights = []

        vehicles = []
        if vehicle_id:
            vehicle = self.db.query(FleetVehicle).filter(
                FleetVehicle.id == vehicle_id,
                FleetVehicle.org_id == self.org_id,
            ).first()
            if vehicle:
                vehicles = [vehicle]
        else:
            vehicles = self.db.query(FleetVehicle).filter(
                FleetVehicle.org_id == self.org_id,
                FleetVehicle.training_mode == self.training_mode,
            ).all()

        for vehicle in vehicles:
            battery_pred = self.predict_battery_failure(vehicle.id)
            if battery_pred:
                insight = FleetAIInsight(
                    org_id=self.org_id,
                    vehicle_id=vehicle.id,
                    insight_type="predictive",
                    priority="critical" if battery_pred["days_until_failure"] < 10 else "high",
                    title=f"Battery failure predicted: {vehicle.call_sign}",
                    description=f"Battery failure likely in {battery_pred['days_until_failure']} days ({int(battery_pred['confidence']*100)}% confidence). Current voltage: {battery_pred['current_voltage']:.1f}V",
                    estimated_savings=None,
                    confidence=int(battery_pred["confidence"] * 100),
                    action_required="Schedule battery replacement immediately",
                    action_deadline=datetime.utcnow() + timedelta(days=battery_pred["days_until_failure"]),
                    status="active",
                    payload=battery_pred,
                    training_mode=self.training_mode,
                )
                insights.append(insight)

            brake_pred = self.predict_brake_wear(vehicle.id)
            if brake_pred:
                insight = FleetAIInsight(
                    org_id=self.org_id,
                    vehicle_id=vehicle.id,
                    insight_type="predictive",
                    priority="high" if brake_pred["km_remaining"] < 2000 else "medium",
                    title=f"Brake wear detected: {vehicle.call_sign}",
                    description=f"Brakes at {brake_pred['brake_wear_percent']}% wear. Estimated {brake_pred['km_remaining']} km remaining ({int(brake_pred['confidence']*100)}% confidence)",
                    estimated_savings=None,
                    confidence=int(brake_pred["confidence"] * 100),
                    action_required=f"Inspect and replace brakes within {brake_pred['km_remaining']} km",
                    action_deadline=None,
                    status="active",
                    payload=brake_pred,
                    training_mode=self.training_mode,
                )
                insights.append(insight)

            fuel_analysis = self.analyze_fuel_efficiency(vehicle.id)
            if fuel_analysis:
                insight = FleetAIInsight(
                    org_id=self.org_id,
                    vehicle_id=vehicle.id,
                    insight_type="fuel",
                    priority="medium",
                    title=f"Fuel inefficiency: {vehicle.call_sign}",
                    description=f"Fuel waste detected: {fuel_analysis['idle_percent']:.1f}% idle time. Potential ${fuel_analysis['inefficiency_cost_annual']}/year savings",
                    estimated_savings=fuel_analysis["inefficiency_cost_annual"],
                    confidence=85,
                    action_required="; ".join([rc["fix"] for rc in fuel_analysis["root_causes"]]),
                    action_deadline=None,
                    status="active",
                    payload=fuel_analysis,
                    training_mode=self.training_mode,
                )
                insights.append(insight)

            driver_behavior = self.analyze_driver_behavior(vehicle.id)
            if driver_behavior:
                total_savings = sum(r["savings"] for r in driver_behavior["recommendations"])
                insight = FleetAIInsight(
                    org_id=self.org_id,
                    vehicle_id=vehicle.id,
                    insight_type="optimization",
                    priority="medium",
                    title=f"Driver behavior optimization: {vehicle.call_sign}",
                    description=f"Aggressive driving detected: {driver_behavior['hard_braking_events_per_100km']:.1f} hard braking events per 100km. Potential ${total_savings}/year savings",
                    estimated_savings=total_savings,
                    confidence=82,
                    action_required="; ".join([r["action"] for r in driver_behavior["recommendations"]]),
                    action_deadline=None,
                    status="active",
                    payload=driver_behavior,
                    training_mode=self.training_mode,
                )
                insights.append(insight)

        for insight in insights:
            self.db.add(insight)
        
        if insights:
            self.db.commit()

        return insights

    def notify_subscribers(
        self,
        event_type: str,
        vehicle: FleetVehicle,
        message: str,
        priority: str = "normal",
        data: Optional[Dict] = None,
    ):
        """Send notifications to subscribed users"""
        current_hour = datetime.utcnow().hour

        subscriptions = (
            self.db.query(FleetSubscription, User)
            .join(User, FleetSubscription.user_id == User.id)
            .filter(
                FleetSubscription.org_id == self.org_id,
                FleetSubscription.training_mode == self.training_mode,
            )
            .all()
        )

        for subscription, user in subscriptions:
            if not getattr(subscription, event_type, False):
                continue

            if subscription.vehicle_ids and vehicle.id not in subscription.vehicle_ids:
                continue

            if (
                subscription.quiet_hours_start <= current_hour
                or current_hour < subscription.quiet_hours_end
            ) and priority != "critical":
                continue

            if subscription.push_enabled:
                publish_event(
                    self.db,
                    "fleet.notification.push",
                    {
                        "user_id": user.id,
                        "vehicle_id": vehicle.id,
                        "message": message,
                        "priority": priority,
                        "data": data or {},
                    },
                )

            if subscription.email_enabled:
                publish_event(
                    self.db,
                    "fleet.notification.email",
                    {
                        "to": user.email,
                        "subject": f"Fleet Alert: {vehicle.call_sign}",
                        "message": message,
                        "priority": priority,
                        "data": data or {},
                    },
                )

            if subscription.sms_enabled and priority in ["urgent", "critical"]:
                publish_event(
                    self.db,
                    "fleet.notification.sms",
                    {
                        "user_id": user.id,
                        "message": message,
                        "priority": priority,
                    },
                )
