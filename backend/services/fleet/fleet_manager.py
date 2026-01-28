"""
Fleet Management - Vehicle Maintenance, DVIR, Fuel Tracking
DOT Compliance for EMS/Fire Vehicles
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class VehicleType(Enum):
    AMBULANCE_TYPE_I = "ambulance_type_i"
    AMBULANCE_TYPE_II = "ambulance_type_ii"
    AMBULANCE_TYPE_III = "ambulance_type_iii"
    ENGINE = "engine"
    LADDER = "ladder"
    RESCUE = "rescue"
    TANKER = "tanker"
    CHIEF = "chief"
    UTILITY = "utility"
    HELICOPTER = "helicopter"


class VehicleStatus(Enum):
    IN_SERVICE = "in_service"
    OUT_OF_SERVICE = "out_of_service"
    MAINTENANCE = "maintenance"
    RESERVE = "reserve"
    DECOMMISSIONED = "decommissioned"


@dataclass
class Vehicle:
    id: int
    unit_number: str
    vin: str
    vehicle_type: VehicleType
    make: str
    model: str
    year: int
    license_plate: str
    station_assigned: str
    status: VehicleStatus
    mileage: int
    engine_hours: Optional[int]
    fuel_type: str
    fuel_capacity_gallons: float
    gvwr_lbs: int


@dataclass
class DVIRReport:
    """Driver Vehicle Inspection Report - DOT Compliance"""
    id: int
    vehicle_id: int
    driver_id: int
    inspection_date: datetime
    inspection_type: str  # pre_trip, post_trip
    mileage_at_inspection: int
    
    # DOT Required Items
    brakes_ok: bool
    steering_ok: bool
    lights_ok: bool
    horn_ok: bool
    windshield_wipers_ok: bool
    mirrors_ok: bool
    tires_ok: bool
    wheels_ok: bool
    emergency_equipment_ok: bool
    fire_extinguisher_ok: bool
    reflective_triangles_ok: bool
    
    # EMS Specific
    stretcher_ok: Optional[bool]
    suction_ok: Optional[bool]
    oxygen_ok: Optional[bool]
    medical_equipment_ok: Optional[bool]
    
    # Fire Specific
    pump_ok: Optional[bool]
    aerial_ok: Optional[bool]
    ground_ladders_ok: Optional[bool]
    
    defects_noted: list[str]
    defects_corrected: bool
    mechanic_signature: Optional[str]
    driver_signature: str
    vehicle_safe_to_operate: bool


MAINTENANCE_SCHEDULES = {
    "oil_change": {"interval_miles": 5000, "interval_days": 90},
    "transmission_service": {"interval_miles": 30000, "interval_days": 365},
    "brake_inspection": {"interval_miles": 15000, "interval_days": 180},
    "tire_rotation": {"interval_miles": 7500, "interval_days": 180},
    "coolant_flush": {"interval_miles": 30000, "interval_days": 730},
    "air_filter": {"interval_miles": 15000, "interval_days": 365},
    "fuel_filter": {"interval_miles": 20000, "interval_days": 365},
    "dot_annual_inspection": {"interval_miles": None, "interval_days": 365},
    "emissions_test": {"interval_miles": None, "interval_days": 365},
    "pump_test_annual": {"interval_miles": None, "interval_days": 365},
    "ladder_test_annual": {"interval_miles": None, "interval_days": 365},
    "hose_test": {"interval_miles": None, "interval_days": 365},
    "chassis_lube": {"interval_miles": 5000, "interval_days": 90},
    "battery_test": {"interval_miles": None, "interval_days": 180},
    "ac_service": {"interval_miles": None, "interval_days": 365},
}


class FleetManager:
    def __init__(self, org_id: int):
        self.org_id = org_id
        self.vehicles: dict[int, Vehicle] = {}
        self.dvir_reports: list[DVIRReport] = []
        self.maintenance_records: list[dict] = []
        self.fuel_records: list[dict] = []

    def get_maintenance_due(self, vehicle_id: int) -> list[dict]:
        """Check what maintenance is due for a vehicle"""
        vehicle = self.vehicles.get(vehicle_id)
        if not vehicle:
            return []
        
        due_items = []
        now = datetime.now()
        
        for maint_type, schedule in MAINTENANCE_SCHEDULES.items():
            last_service = self._get_last_service(vehicle_id, maint_type)
            
            is_due = False
            due_reason = ""
            urgency = "normal"
            
            if last_service:
                if schedule["interval_miles"] and vehicle.mileage:
                    miles_since = vehicle.mileage - last_service.get("mileage_at_service", 0)
                    if miles_since >= schedule["interval_miles"]:
                        is_due = True
                        due_reason = f"Mileage: {miles_since} miles since last service"
                        if miles_since >= schedule["interval_miles"] * 1.1:
                            urgency = "overdue"
                
                if schedule["interval_days"]:
                    days_since = (now - last_service.get("service_date", now)).days
                    if days_since >= schedule["interval_days"]:
                        is_due = True
                        due_reason = f"Time: {days_since} days since last service"
                        if days_since >= schedule["interval_days"] * 1.1:
                            urgency = "overdue"
            else:
                is_due = True
                due_reason = "No service record found"
                urgency = "unknown"
            
            if maint_type == "pump_test_annual" and vehicle.vehicle_type not in [VehicleType.ENGINE, VehicleType.TANKER]:
                continue
            if maint_type == "ladder_test_annual" and vehicle.vehicle_type != VehicleType.LADDER:
                continue
            
            if is_due:
                due_items.append({
                    "maintenance_type": maint_type,
                    "vehicle_id": vehicle_id,
                    "unit_number": vehicle.unit_number,
                    "due_reason": due_reason,
                    "urgency": urgency,
                    "last_service_date": last_service.get("service_date").isoformat() if last_service else None,
                    "last_service_mileage": last_service.get("mileage_at_service") if last_service else None,
                    "current_mileage": vehicle.mileage,
                    "interval_miles": schedule["interval_miles"],
                    "interval_days": schedule["interval_days"],
                })
        
        due_items.sort(key=lambda x: (0 if x["urgency"] == "overdue" else 1 if x["urgency"] == "unknown" else 2))
        return due_items

    def _get_last_service(self, vehicle_id: int, maint_type: str) -> Optional[dict]:
        """Get the most recent service record for a maintenance type"""
        records = [
            r for r in self.maintenance_records
            if r["vehicle_id"] == vehicle_id and r["maintenance_type"] == maint_type
        ]
        if records:
            return max(records, key=lambda x: x["service_date"])
        return None

    def record_fuel(
        self,
        vehicle_id: int,
        gallons: float,
        cost_per_gallon: float,
        mileage: int,
        fuel_type: str,
        location: str,
        employee_id: int,
    ) -> dict:
        """Record fuel purchase and calculate MPG"""
        vehicle = self.vehicles.get(vehicle_id)
        if not vehicle:
            raise ValueError(f"Vehicle {vehicle_id} not found")
        
        last_fuel = self._get_last_fuel_record(vehicle_id)
        mpg = None
        if last_fuel and mileage > last_fuel["mileage"]:
            miles_driven = mileage - last_fuel["mileage"]
            mpg = miles_driven / gallons if gallons > 0 else None
        
        record = {
            "id": len(self.fuel_records) + 1,
            "vehicle_id": vehicle_id,
            "unit_number": vehicle.unit_number,
            "gallons": gallons,
            "cost_per_gallon": cost_per_gallon,
            "total_cost": gallons * cost_per_gallon,
            "mileage": mileage,
            "fuel_type": fuel_type,
            "location": location,
            "employee_id": employee_id,
            "timestamp": datetime.now(),
            "calculated_mpg": round(mpg, 1) if mpg else None,
        }
        
        self.fuel_records.append(record)
        vehicle.mileage = mileage
        
        return record

    def _get_last_fuel_record(self, vehicle_id: int) -> Optional[dict]:
        """Get most recent fuel record for a vehicle"""
        records = [r for r in self.fuel_records if r["vehicle_id"] == vehicle_id]
        if records:
            return max(records, key=lambda x: x["timestamp"])
        return None

    def create_dvir(
        self,
        vehicle_id: int,
        driver_id: int,
        inspection_type: str,
        inspection_data: dict,
    ) -> DVIRReport:
        """Create a DVIR report"""
        vehicle = self.vehicles.get(vehicle_id)
        if not vehicle:
            raise ValueError(f"Vehicle {vehicle_id} not found")
        
        defects = []
        all_ok = True
        
        required_checks = [
            "brakes_ok", "steering_ok", "lights_ok", "horn_ok",
            "windshield_wipers_ok", "mirrors_ok", "tires_ok", "wheels_ok",
            "emergency_equipment_ok", "fire_extinguisher_ok", "reflective_triangles_ok",
        ]
        
        for check in required_checks:
            if not inspection_data.get(check, True):
                all_ok = False
                defects.append(check.replace("_ok", "").replace("_", " ").title())
        
        if vehicle.vehicle_type in [VehicleType.AMBULANCE_TYPE_I, VehicleType.AMBULANCE_TYPE_II, VehicleType.AMBULANCE_TYPE_III]:
            ems_checks = ["stretcher_ok", "suction_ok", "oxygen_ok", "medical_equipment_ok"]
            for check in ems_checks:
                if not inspection_data.get(check, True):
                    all_ok = False
                    defects.append(check.replace("_ok", "").replace("_", " ").title())
        
        if vehicle.vehicle_type in [VehicleType.ENGINE, VehicleType.LADDER, VehicleType.RESCUE, VehicleType.TANKER]:
            fire_checks = ["pump_ok", "ground_ladders_ok"]
            if vehicle.vehicle_type == VehicleType.LADDER:
                fire_checks.append("aerial_ok")
            for check in fire_checks:
                if not inspection_data.get(check, True):
                    all_ok = False
                    defects.append(check.replace("_ok", "").replace("_", " ").title())
        
        dvir = DVIRReport(
            id=len(self.dvir_reports) + 1,
            vehicle_id=vehicle_id,
            driver_id=driver_id,
            inspection_date=datetime.now(),
            inspection_type=inspection_type,
            mileage_at_inspection=inspection_data.get("mileage", vehicle.mileage),
            brakes_ok=inspection_data.get("brakes_ok", True),
            steering_ok=inspection_data.get("steering_ok", True),
            lights_ok=inspection_data.get("lights_ok", True),
            horn_ok=inspection_data.get("horn_ok", True),
            windshield_wipers_ok=inspection_data.get("windshield_wipers_ok", True),
            mirrors_ok=inspection_data.get("mirrors_ok", True),
            tires_ok=inspection_data.get("tires_ok", True),
            wheels_ok=inspection_data.get("wheels_ok", True),
            emergency_equipment_ok=inspection_data.get("emergency_equipment_ok", True),
            fire_extinguisher_ok=inspection_data.get("fire_extinguisher_ok", True),
            reflective_triangles_ok=inspection_data.get("reflective_triangles_ok", True),
            stretcher_ok=inspection_data.get("stretcher_ok"),
            suction_ok=inspection_data.get("suction_ok"),
            oxygen_ok=inspection_data.get("oxygen_ok"),
            medical_equipment_ok=inspection_data.get("medical_equipment_ok"),
            pump_ok=inspection_data.get("pump_ok"),
            aerial_ok=inspection_data.get("aerial_ok"),
            ground_ladders_ok=inspection_data.get("ground_ladders_ok"),
            defects_noted=defects,
            defects_corrected=inspection_data.get("defects_corrected", False),
            mechanic_signature=inspection_data.get("mechanic_signature"),
            driver_signature=inspection_data.get("driver_signature", ""),
            vehicle_safe_to_operate=all_ok or inspection_data.get("defects_corrected", False),
        )
        
        self.dvir_reports.append(dvir)
        
        if not dvir.vehicle_safe_to_operate:
            vehicle.status = VehicleStatus.OUT_OF_SERVICE
            logger.warning(f"Vehicle {vehicle.unit_number} marked out of service due to DVIR defects")
        
        return dvir

    def get_fleet_status_report(self) -> dict:
        """Generate fleet status report"""
        total = len(self.vehicles)
        in_service = sum(1 for v in self.vehicles.values() if v.status == VehicleStatus.IN_SERVICE)
        out_of_service = sum(1 for v in self.vehicles.values() if v.status == VehicleStatus.OUT_OF_SERVICE)
        in_maintenance = sum(1 for v in self.vehicles.values() if v.status == VehicleStatus.MAINTENANCE)
        reserve = sum(1 for v in self.vehicles.values() if v.status == VehicleStatus.RESERVE)
        
        maintenance_due = []
        for vid in self.vehicles:
            due = self.get_maintenance_due(vid)
            if due:
                maintenance_due.extend(due)
        
        recent_fuel = self.fuel_records[-30:] if len(self.fuel_records) > 30 else self.fuel_records
        total_fuel_cost = sum(r["total_cost"] for r in recent_fuel)
        total_gallons = sum(r["gallons"] for r in recent_fuel)
        avg_mpg = sum(r["calculated_mpg"] for r in recent_fuel if r["calculated_mpg"]) / len([r for r in recent_fuel if r["calculated_mpg"]]) if recent_fuel else 0
        
        return {
            "generated_at": datetime.now().isoformat(),
            "org_id": self.org_id,
            "fleet_summary": {
                "total_vehicles": total,
                "in_service": in_service,
                "out_of_service": out_of_service,
                "in_maintenance": in_maintenance,
                "reserve": reserve,
                "availability_rate": round((in_service / total * 100), 1) if total > 0 else 0,
            },
            "maintenance_alerts": {
                "overdue_count": len([m for m in maintenance_due if m["urgency"] == "overdue"]),
                "due_soon_count": len([m for m in maintenance_due if m["urgency"] == "normal"]),
                "items": maintenance_due[:10],
            },
            "fuel_summary_30_days": {
                "total_cost": round(total_fuel_cost, 2),
                "total_gallons": round(total_gallons, 1),
                "average_mpg": round(avg_mpg, 1),
            },
            "vehicles_by_type": {
                vt.value: sum(1 for v in self.vehicles.values() if v.vehicle_type == vt)
                for vt in VehicleType
            },
        }
