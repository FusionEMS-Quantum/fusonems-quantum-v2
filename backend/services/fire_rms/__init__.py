"""
Fire RMS Services Package
Comprehensive fire records management system services
"""

from .hydrant_service import HydrantService
from .inspection_service import InspectionService
from .preplan_service import PrePlanService
from .apparatus_service import ApparatusService
from .incident_service import IncidentService
from .prevention_service import PreventionService
from .occupancy_service import OccupancyService
from .training_burn_service import TrainingBurnService

__all__ = [
    "HydrantService",
    "InspectionService",
    "PrePlanService",
    "ApparatusService",
    "IncidentService",
    "PreventionService",
    "OccupancyService",
    "TrainingBurnService",
]
