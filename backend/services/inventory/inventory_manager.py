"""
Inventory Management - Par Levels, Expiration Tracking, Controlled Substances
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ItemCategory(Enum):
    MEDICATION = "medication"
    CONTROLLED_SUBSTANCE = "controlled_substance"
    SUPPLY = "supply"
    EQUIPMENT = "equipment"
    PPE = "ppe"
    FLUID = "fluid"
    AIRWAY = "airway"
    CARDIAC = "cardiac"
    TRAUMA = "trauma"


class DEASchedule(Enum):
    SCHEDULE_I = "I"
    SCHEDULE_II = "II"
    SCHEDULE_III = "III"
    SCHEDULE_IV = "IV"
    SCHEDULE_V = "V"
    NON_CONTROLLED = None


@dataclass
class InventoryItem:
    id: int
    name: str
    category: ItemCategory
    sku: str
    lot_number: Optional[str]
    expiration_date: Optional[datetime]
    quantity_on_hand: int
    par_level: int
    reorder_point: int
    unit_cost: float
    supplier: str
    location: str
    dea_schedule: Optional[DEASchedule] = None
    ndc_code: Optional[str] = None


@dataclass
class ControlledSubstanceLog:
    id: int
    item_id: int
    transaction_type: str  # receive, administer, waste, transfer, count
    quantity: int
    balance_after: int
    patient_id: Optional[int]
    witness_id: Optional[int]
    employee_id: int
    timestamp: datetime
    notes: str


CONTROLLED_SUBSTANCE_MEDICATIONS = {
    "fentanyl": {
        "name": "Fentanyl Citrate",
        "schedule": DEASchedule.SCHEDULE_II,
        "concentrations": ["50mcg/mL", "100mcg/2mL"],
        "par_level": 20,
        "witness_required": True,
        "dual_count_required": True,
    },
    "morphine": {
        "name": "Morphine Sulfate",
        "schedule": DEASchedule.SCHEDULE_II,
        "concentrations": ["10mg/mL", "4mg/mL"],
        "par_level": 10,
        "witness_required": True,
        "dual_count_required": True,
    },
    "midazolam": {
        "name": "Midazolam (Versed)",
        "schedule": DEASchedule.SCHEDULE_IV,
        "concentrations": ["5mg/mL", "1mg/mL"],
        "par_level": 15,
        "witness_required": True,
        "dual_count_required": True,
    },
    "ketamine": {
        "name": "Ketamine HCl",
        "schedule": DEASchedule.SCHEDULE_III,
        "concentrations": ["100mg/mL", "50mg/mL"],
        "par_level": 10,
        "witness_required": True,
        "dual_count_required": True,
    },
    "diazepam": {
        "name": "Diazepam (Valium)",
        "schedule": DEASchedule.SCHEDULE_IV,
        "concentrations": ["5mg/mL"],
        "par_level": 10,
        "witness_required": True,
        "dual_count_required": True,
    },
    "lorazepam": {
        "name": "Lorazepam (Ativan)",
        "schedule": DEASchedule.SCHEDULE_IV,
        "concentrations": ["2mg/mL", "4mg/mL"],
        "par_level": 10,
        "witness_required": True,
        "dual_count_required": True,
    },
}


class InventoryManager:
    def __init__(self, org_id: int):
        self.org_id = org_id
        self.items: dict[int, InventoryItem] = {}
        self.controlled_logs: list[ControlledSubstanceLog] = []

    def check_par_levels(self) -> list[dict]:
        """Check all items against par levels and return alerts"""
        alerts = []
        
        for item in self.items.values():
            if item.quantity_on_hand <= item.reorder_point:
                urgency = "critical" if item.quantity_on_hand == 0 else "warning"
                alerts.append({
                    "item_id": item.id,
                    "item_name": item.name,
                    "sku": item.sku,
                    "category": item.category.value,
                    "quantity_on_hand": item.quantity_on_hand,
                    "par_level": item.par_level,
                    "reorder_point": item.reorder_point,
                    "quantity_to_order": item.par_level - item.quantity_on_hand,
                    "urgency": urgency,
                    "supplier": item.supplier,
                    "estimated_cost": (item.par_level - item.quantity_on_hand) * item.unit_cost,
                })
        
        alerts.sort(key=lambda x: (0 if x["urgency"] == "critical" else 1, -x["quantity_to_order"]))
        return alerts

    def check_expirations(self, days_ahead: int = 90) -> list[dict]:
        """Check for items expiring within specified days"""
        alerts = []
        now = datetime.now()
        threshold = now + timedelta(days=days_ahead)
        
        for item in self.items.values():
            if item.expiration_date and item.expiration_date <= threshold:
                days_until = (item.expiration_date - now).days
                if days_until < 0:
                    status = "expired"
                    urgency = "critical"
                elif days_until <= 30:
                    status = "expiring_soon"
                    urgency = "warning"
                else:
                    status = "expiring"
                    urgency = "info"
                
                alerts.append({
                    "item_id": item.id,
                    "item_name": item.name,
                    "sku": item.sku,
                    "lot_number": item.lot_number,
                    "expiration_date": item.expiration_date.isoformat(),
                    "days_until_expiration": days_until,
                    "quantity_affected": item.quantity_on_hand,
                    "status": status,
                    "urgency": urgency,
                    "location": item.location,
                    "replacement_cost": item.quantity_on_hand * item.unit_cost,
                })
        
        alerts.sort(key=lambda x: x["days_until_expiration"])
        return alerts

    def record_controlled_substance_transaction(
        self,
        item_id: int,
        transaction_type: str,
        quantity: int,
        employee_id: int,
        witness_id: Optional[int] = None,
        patient_id: Optional[int] = None,
        notes: str = "",
    ) -> dict:
        """Record a controlled substance transaction with required documentation"""
        item = self.items.get(item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found")
        
        if item.dea_schedule is None:
            raise ValueError(f"Item {item.name} is not a controlled substance")
        
        cs_info = CONTROLLED_SUBSTANCE_MEDICATIONS.get(item.name.lower().replace(" ", "_"))
        if cs_info and cs_info.get("witness_required") and transaction_type in ["administer", "waste"]:
            if not witness_id:
                raise ValueError("Witness required for this transaction")
        
        if transaction_type in ["administer", "waste", "transfer"]:
            new_balance = item.quantity_on_hand - quantity
            if new_balance < 0:
                raise ValueError(f"Insufficient quantity. On hand: {item.quantity_on_hand}")
        elif transaction_type == "receive":
            new_balance = item.quantity_on_hand + quantity
        else:
            new_balance = item.quantity_on_hand
        
        log = ControlledSubstanceLog(
            id=len(self.controlled_logs) + 1,
            item_id=item_id,
            transaction_type=transaction_type,
            quantity=quantity,
            balance_after=new_balance,
            patient_id=patient_id,
            witness_id=witness_id,
            employee_id=employee_id,
            timestamp=datetime.now(),
            notes=notes,
        )
        
        self.controlled_logs.append(log)
        item.quantity_on_hand = new_balance
        
        return {
            "transaction_id": log.id,
            "item_name": item.name,
            "transaction_type": transaction_type,
            "quantity": quantity,
            "balance_after": new_balance,
            "timestamp": log.timestamp.isoformat(),
            "dea_schedule": item.dea_schedule.value if item.dea_schedule else None,
        }

    def get_controlled_substance_report(
        self,
        start_date: datetime,
        end_date: datetime,
        item_id: Optional[int] = None,
    ) -> dict:
        """Generate DEA-compliant controlled substance report"""
        logs = [
            l for l in self.controlled_logs
            if start_date <= l.timestamp <= end_date
            and (item_id is None or l.item_id == item_id)
        ]
        
        summary = {}
        for log in logs:
            item = self.items.get(log.item_id)
            if not item:
                continue
            
            if item.name not in summary:
                summary[item.name] = {
                    "item_name": item.name,
                    "dea_schedule": item.dea_schedule.value if item.dea_schedule else None,
                    "opening_balance": 0,
                    "received": 0,
                    "administered": 0,
                    "wasted": 0,
                    "transferred": 0,
                    "closing_balance": 0,
                    "transactions": [],
                }
            
            if log.transaction_type == "receive":
                summary[item.name]["received"] += log.quantity
            elif log.transaction_type == "administer":
                summary[item.name]["administered"] += log.quantity
            elif log.transaction_type == "waste":
                summary[item.name]["wasted"] += log.quantity
            elif log.transaction_type == "transfer":
                summary[item.name]["transferred"] += log.quantity
            
            summary[item.name]["closing_balance"] = log.balance_after
            summary[item.name]["transactions"].append({
                "timestamp": log.timestamp.isoformat(),
                "type": log.transaction_type,
                "quantity": log.quantity,
                "balance": log.balance_after,
                "employee_id": log.employee_id,
                "witness_id": log.witness_id,
                "patient_id": log.patient_id,
            })
        
        return {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "generated_at": datetime.now().isoformat(),
            "org_id": self.org_id,
            "substances": list(summary.values()),
            "total_transactions": len(logs),
        }

    def perform_inventory_count(
        self,
        item_id: int,
        counted_quantity: int,
        employee_id: int,
        witness_id: Optional[int] = None,
    ) -> dict:
        """Perform inventory count and record discrepancies"""
        item = self.items.get(item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found")
        
        expected = item.quantity_on_hand
        discrepancy = counted_quantity - expected
        
        result = {
            "item_id": item_id,
            "item_name": item.name,
            "expected_quantity": expected,
            "counted_quantity": counted_quantity,
            "discrepancy": discrepancy,
            "count_timestamp": datetime.now().isoformat(),
            "counted_by": employee_id,
            "witnessed_by": witness_id,
        }
        
        if item.dea_schedule:
            result["dea_schedule"] = item.dea_schedule.value
            result["is_controlled"] = True
            
            if discrepancy != 0:
                result["requires_investigation"] = True
                result["alert"] = f"CONTROLLED SUBSTANCE DISCREPANCY: {item.name} - Expected {expected}, Found {counted_quantity}"
                logger.warning(f"Controlled substance discrepancy: {item.name}, org {self.org_id}, discrepancy {discrepancy}")
        
        item.quantity_on_hand = counted_quantity
        
        return result

    def generate_reorder_report(self) -> dict:
        """Generate comprehensive reorder report"""
        items_to_order = self.check_par_levels()
        
        by_supplier = {}
        for item in items_to_order:
            supplier = item["supplier"]
            if supplier not in by_supplier:
                by_supplier[supplier] = {
                    "supplier": supplier,
                    "items": [],
                    "total_cost": 0,
                    "item_count": 0,
                }
            by_supplier[supplier]["items"].append(item)
            by_supplier[supplier]["total_cost"] += item["estimated_cost"]
            by_supplier[supplier]["item_count"] += 1
        
        return {
            "generated_at": datetime.now().isoformat(),
            "org_id": self.org_id,
            "critical_items": [i for i in items_to_order if i["urgency"] == "critical"],
            "warning_items": [i for i in items_to_order if i["urgency"] == "warning"],
            "by_supplier": list(by_supplier.values()),
            "total_estimated_cost": sum(i["estimated_cost"] for i in items_to_order),
            "total_items_to_order": len(items_to_order),
        }
