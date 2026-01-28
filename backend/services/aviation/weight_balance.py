"""
Aircraft Weight & Balance Calculator
Supports common HEMS helicopter types
"""

from dataclasses import dataclass
from typing import Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class WeightStation:
    name: str
    weight_lbs: float
    arm_inches: float

    @property
    def moment(self) -> float:
        return self.weight_lbs * self.arm_inches


@dataclass
class AircraftProfile:
    aircraft_type: str
    basic_empty_weight: float
    basic_empty_cg: float
    max_gross_weight: float
    min_cg: float
    max_cg: float
    fuel_arm: float
    pilot_arm: float
    copilot_arm: float
    rear_pax_arm: float
    medical_attendant_arm: float
    patient_arm: float
    baggage_arm: float
    fuel_weight_per_gallon: float = 6.0
    max_fuel_gallons: Optional[float] = None


AIRCRAFT_PROFILES = {
    "EC135": AircraftProfile(
        aircraft_type="Airbus EC135",
        basic_empty_weight=4045,
        basic_empty_cg=144.5,
        max_gross_weight=6250,
        min_cg=140.0,
        max_cg=152.0,
        fuel_arm=152.0,
        pilot_arm=72.0,
        copilot_arm=72.0,
        rear_pax_arm=120.0,
        medical_attendant_arm=120.0,
        patient_arm=150.0,
        baggage_arm=175.0,
        max_fuel_gallons=185,
    ),
    "Bell407": AircraftProfile(
        aircraft_type="Bell 407",
        basic_empty_weight=2722,
        basic_empty_cg=109.0,
        max_gross_weight=5250,
        min_cg=104.0,
        max_cg=114.0,
        fuel_arm=117.5,
        pilot_arm=64.5,
        copilot_arm=64.5,
        rear_pax_arm=100.0,
        medical_attendant_arm=100.0,
        patient_arm=115.0,
        baggage_arm=130.0,
        max_fuel_gallons=130,
    ),
    "Bell429": AircraftProfile(
        aircraft_type="Bell 429",
        basic_empty_weight=4577,
        basic_empty_cg=143.0,
        max_gross_weight=7500,
        min_cg=137.0,
        max_cg=150.0,
        fuel_arm=155.0,
        pilot_arm=75.0,
        copilot_arm=75.0,
        rear_pax_arm=125.0,
        medical_attendant_arm=125.0,
        patient_arm=160.0,
        baggage_arm=185.0,
        max_fuel_gallons=211,
    ),
    "AS350": AircraftProfile(
        aircraft_type="Airbus AS350/H125",
        basic_empty_weight=2850,
        basic_empty_cg=130.0,
        max_gross_weight=4961,
        min_cg=125.0,
        max_cg=140.0,
        fuel_arm=142.0,
        pilot_arm=65.0,
        copilot_arm=65.0,
        rear_pax_arm=95.0,
        medical_attendant_arm=95.0,
        patient_arm=120.0,
        baggage_arm=155.0,
        max_fuel_gallons=143,
    ),
    "AW109": AircraftProfile(
        aircraft_type="Leonardo AW109",
        basic_empty_weight=3627,
        basic_empty_cg=152.0,
        max_gross_weight=6614,
        min_cg=147.0,
        max_cg=159.0,
        fuel_arm=162.0,
        pilot_arm=75.0,
        copilot_arm=75.0,
        rear_pax_arm=130.0,
        medical_attendant_arm=130.0,
        patient_arm=165.0,
        baggage_arm=195.0,
        max_fuel_gallons=185,
    ),
    "BK117": AircraftProfile(
        aircraft_type="Airbus BK117/H145",
        basic_empty_weight=4167,
        basic_empty_cg=145.0,
        max_gross_weight=7903,
        min_cg=140.0,
        max_cg=155.0,
        fuel_arm=158.0,
        pilot_arm=70.0,
        copilot_arm=70.0,
        rear_pax_arm=122.0,
        medical_attendant_arm=122.0,
        patient_arm=155.0,
        baggage_arm=180.0,
        max_fuel_gallons=227,
    ),
}


class WeightBalanceCalculator:
    def __init__(self, aircraft_type: str, custom_profile: Optional[AircraftProfile] = None):
        if custom_profile:
            self.profile = custom_profile
        elif aircraft_type in AIRCRAFT_PROFILES:
            self.profile = AIRCRAFT_PROFILES[aircraft_type]
        else:
            raise ValueError(f"Unknown aircraft type: {aircraft_type}. Available: {list(AIRCRAFT_PROFILES.keys())}")

        self.stations: list[WeightStation] = []
        self._add_empty_weight()

    def _add_empty_weight(self):
        self.stations.append(WeightStation(
            name="Basic Empty Weight",
            weight_lbs=self.profile.basic_empty_weight,
            arm_inches=self.profile.basic_empty_cg,
        ))

    def add_fuel(self, gallons: float):
        weight = gallons * self.profile.fuel_weight_per_gallon
        self.stations.append(WeightStation(
            name=f"Fuel ({gallons:.1f} gal)",
            weight_lbs=weight,
            arm_inches=self.profile.fuel_arm,
        ))

    def add_pilot(self, weight_lbs: float):
        self.stations.append(WeightStation(
            name="Pilot",
            weight_lbs=weight_lbs,
            arm_inches=self.profile.pilot_arm,
        ))

    def add_copilot(self, weight_lbs: float):
        self.stations.append(WeightStation(
            name="Copilot/SIC",
            weight_lbs=weight_lbs,
            arm_inches=self.profile.copilot_arm,
        ))

    def add_medical_crew(self, weight_lbs: float, crew_type: str = "Flight Nurse"):
        self.stations.append(WeightStation(
            name=crew_type,
            weight_lbs=weight_lbs,
            arm_inches=self.profile.medical_attendant_arm,
        ))

    def add_patient(self, weight_lbs: float, with_stretcher: bool = True):
        stretcher_weight = 45 if with_stretcher else 0
        self.stations.append(WeightStation(
            name="Patient + Stretcher" if with_stretcher else "Patient",
            weight_lbs=weight_lbs + stretcher_weight,
            arm_inches=self.profile.patient_arm,
        ))

    def add_medical_equipment(self, weight_lbs: float):
        self.stations.append(WeightStation(
            name="Medical Equipment",
            weight_lbs=weight_lbs,
            arm_inches=self.profile.baggage_arm,
        ))

    def add_baggage(self, weight_lbs: float, description: str = "Baggage"):
        self.stations.append(WeightStation(
            name=description,
            weight_lbs=weight_lbs,
            arm_inches=self.profile.baggage_arm,
        ))

    def add_custom(self, name: str, weight_lbs: float, arm_inches: float):
        self.stations.append(WeightStation(
            name=name,
            weight_lbs=weight_lbs,
            arm_inches=arm_inches,
        ))

    def calculate(self) -> dict:
        total_weight = sum(s.weight_lbs for s in self.stations)
        total_moment = sum(s.moment for s in self.stations)
        cg = total_moment / total_weight if total_weight > 0 else 0

        within_weight = total_weight <= self.profile.max_gross_weight
        within_cg = self.profile.min_cg <= cg <= self.profile.max_cg
        is_valid = within_weight and within_cg

        weight_margin = self.profile.max_gross_weight - total_weight
        cg_margin_fwd = cg - self.profile.min_cg
        cg_margin_aft = self.profile.max_cg - cg

        warnings = []
        if not within_weight:
            warnings.append(f"OVERWEIGHT by {abs(weight_margin):.0f} lbs")
        if cg < self.profile.min_cg:
            warnings.append(f"CG FORWARD of limit by {abs(cg_margin_fwd):.1f} inches")
        if cg > self.profile.max_cg:
            warnings.append(f"CG AFT of limit by {abs(cg_margin_aft):.1f} inches")

        return {
            "aircraft_type": self.profile.aircraft_type,
            "is_valid": is_valid,
            "warnings": warnings,
            "total_weight_lbs": round(total_weight, 1),
            "max_gross_weight_lbs": self.profile.max_gross_weight,
            "weight_margin_lbs": round(weight_margin, 1),
            "weight_percent": round((total_weight / self.profile.max_gross_weight) * 100, 1),
            "cg_inches": round(cg, 2),
            "min_cg_inches": self.profile.min_cg,
            "max_cg_inches": self.profile.max_cg,
            "cg_margin_forward_inches": round(cg_margin_fwd, 2),
            "cg_margin_aft_inches": round(cg_margin_aft, 2),
            "total_moment": round(total_moment, 0),
            "stations": [
                {
                    "name": s.name,
                    "weight_lbs": round(s.weight_lbs, 1),
                    "arm_inches": s.arm_inches,
                    "moment": round(s.moment, 0),
                }
                for s in self.stations
            ],
        }

    def max_patient_weight(self, current_fuel_gallons: float = 0) -> float:
        """Calculate maximum patient weight given current loading"""
        calc = WeightBalanceCalculator(self.profile.aircraft_type)
        for s in self.stations:
            if s.name != "Basic Empty Weight":
                calc.stations.append(s)
        result = calc.calculate()
        return max(0, result["weight_margin_lbs"] - 45)


def calculate_hems_mission(
    aircraft_type: str,
    pilot_weight: float,
    copilot_weight: Optional[float],
    nurse_weight: float,
    paramedic_weight: float,
    patient_weight: float,
    fuel_gallons: float,
    medical_equipment_weight: float = 150,
) -> dict:
    """Standard HEMS mission weight & balance calculation"""
    calc = WeightBalanceCalculator(aircraft_type)
    calc.add_pilot(pilot_weight)
    if copilot_weight:
        calc.add_copilot(copilot_weight)
    calc.add_medical_crew(nurse_weight, "Flight Nurse")
    calc.add_medical_crew(paramedic_weight, "Flight Paramedic")
    calc.add_patient(patient_weight, with_stretcher=True)
    calc.add_fuel(fuel_gallons)
    calc.add_medical_equipment(medical_equipment_weight)
    return calc.calculate()
