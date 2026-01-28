"""Unit models for EMS vehicle tracking and status."""
from enum import Enum
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Float, func
from core.database import Base


class UnitStatus(str, Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    ENROUTE = "enroute"
    ON_SCENE = "on_scene"
    TRANSPORTING = "transporting"
    AT_HOSPITAL = "at_hospital"
    OUT_OF_SERVICE = "out_of_service"
    RETURNING = "returning"


class UnitCapability(str, Enum):
    BLS = "bls"
    ALS = "als"
    CRITICAL_CARE = "critical_care"
    NEONATAL = "neonatal"
    BARIATRIC = "bariatric"
    WHEELCHAIR = "wheelchair"


# Re-export Unit from cad for convenience
from models.cad import Unit

__all__ = ["Unit", "UnitStatus", "UnitCapability"]
