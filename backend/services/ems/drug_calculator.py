"""
EMS Drug Dose Calculator
Weight-based dosing for common emergency medications
"""

from dataclasses import dataclass
from typing import Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PatientType(Enum):
    ADULT = "adult"
    PEDIATRIC = "pediatric"
    NEONATAL = "neonatal"


@dataclass
class DrugDose:
    drug_name: str
    dose_mg: float
    dose_ml: Optional[float]
    concentration: str
    route: str
    max_dose_mg: Optional[float]
    notes: str
    warnings: list[str]


DRUG_DATABASE = {
    "epinephrine_cardiac": {
        "name": "Epinephrine (Cardiac Arrest)",
        "class": "Sympathomimetic",
        "adult_fixed_dose_mg": 1.0,
        "pedi_dose_mg_kg": 0.01,
        "max_single_dose_mg": 1.0,
        "concentration_mg_ml": 0.1,
        "routes": ["IV", "IO", "ET"],
        "notes": "Follow with 20mL flush. ET dose 2-2.5x IV dose",
    },
    "epinephrine_anaphylaxis": {
        "name": "Epinephrine (Anaphylaxis)",
        "class": "Sympathomimetic",
        "adult_fixed_dose_mg": 0.3,
        "pedi_dose_mg_kg": 0.01,
        "max_single_dose_mg": 0.5,
        "concentration_mg_ml": 1.0,
        "routes": ["IM", "SQ"],
        "notes": "IM preferred (lateral thigh). May repeat q5min PRN",
    },
    "adenosine": {
        "name": "Adenosine",
        "class": "Antiarrhythmic",
        "adult_fixed_dose_mg": 6.0,
        "adult_second_dose_mg": 12.0,
        "pedi_dose_mg_kg": 0.1,
        "pedi_max_mg": 6.0,
        "max_single_dose_mg": 12.0,
        "concentration_mg_ml": 3.0,
        "routes": ["IV"],
        "notes": "Rapid IV push followed by 20mL NS flush",
    },
    "amiodarone_arrest": {
        "name": "Amiodarone (Cardiac Arrest)",
        "class": "Antiarrhythmic",
        "adult_fixed_dose_mg": 300.0,
        "adult_second_dose_mg": 150.0,
        "pedi_dose_mg_kg": 5.0,
        "max_single_dose_mg": 300.0,
        "concentration_mg_ml": 50.0,
        "routes": ["IV", "IO"],
        "notes": "May repeat 150mg once for refractory VF/pVT",
    },
    "atropine": {
        "name": "Atropine",
        "class": "Anticholinergic",
        "adult_fixed_dose_mg": 0.5,
        "pedi_dose_mg_kg": 0.02,
        "min_dose_mg": 0.1,
        "max_single_dose_mg": 0.5,
        "max_total_dose_mg": 3.0,
        "concentration_mg_ml": 0.1,
        "routes": ["IV", "IO", "ET"],
        "notes": "Max 3mg total. Min 0.1mg",
    },
    "naloxone": {
        "name": "Naloxone (Narcan)",
        "class": "Opioid Antagonist",
        "adult_fixed_dose_mg": 2.0,
        "pedi_dose_mg_kg": 0.1,
        "max_single_dose_mg": 2.0,
        "concentration_mg_ml": 1.0,
        "routes": ["IV", "IM", "IN", "IO"],
        "notes": "IN: 2mg/2mL. Titrate to respiratory effort",
    },
    "midazolam_seizure": {
        "name": "Midazolam (Versed) - Seizure",
        "class": "Benzodiazepine",
        "adult_fixed_dose_mg": 10.0,
        "pedi_dose_mg_kg": 0.2,
        "max_single_dose_mg": 10.0,
        "concentration_mg_ml": 5.0,
        "routes": ["IM", "IN", "IV"],
        "notes": "IN: Use 5mg/mL concentration",
    },
    "morphine": {
        "name": "Morphine Sulfate",
        "class": "Opioid Analgesic",
        "adult_fixed_dose_mg": 2.0,
        "pedi_dose_mg_kg": 0.1,
        "max_single_dose_mg": 10.0,
        "concentration_mg_ml": 10.0,
        "routes": ["IV", "IM"],
        "notes": "Titrate to pain relief",
    },
    "fentanyl": {
        "name": "Fentanyl",
        "class": "Opioid Analgesic",
        "adult_fixed_dose_mcg": 50.0,
        "pedi_dose_mcg_kg": 1.0,
        "max_single_dose_mcg": 100.0,
        "concentration_mcg_ml": 50.0,
        "routes": ["IV", "IM", "IN"],
        "notes": "IN: 2mcg/kg",
    },
    "ondansetron": {
        "name": "Ondansetron (Zofran)",
        "class": "Antiemetic",
        "adult_fixed_dose_mg": 4.0,
        "pedi_dose_mg_kg": 0.15,
        "max_single_dose_mg": 4.0,
        "concentration_mg_ml": 2.0,
        "routes": ["IV", "IM", "PO", "SL"],
        "notes": "PO/SL may take 15-30min",
    },
    "diphenhydramine": {
        "name": "Diphenhydramine (Benadryl)",
        "class": "Antihistamine",
        "adult_fixed_dose_mg": 50.0,
        "pedi_dose_mg_kg": 1.0,
        "max_single_dose_mg": 50.0,
        "concentration_mg_ml": 50.0,
        "routes": ["IV", "IM", "PO"],
        "notes": "Slow IV push over 2-3 minutes",
    },
    "dextrose_d50": {
        "name": "Dextrose 50% (D50)",
        "class": "Glucose",
        "adult_fixed_dose_g": 25.0,
        "concentration_g_ml": 0.5,
        "routes": ["IV"],
        "notes": "Confirm IV patency first",
    },
    "albuterol": {
        "name": "Albuterol",
        "class": "Bronchodilator",
        "adult_fixed_dose_mg": 2.5,
        "pedi_fixed_dose_mg": 2.5,
        "concentration_mg_ml": 0.83,
        "routes": ["NEB"],
        "notes": "May give continuous for severe bronchospasm",
    },
    "aspirin": {
        "name": "Aspirin (ASA)",
        "class": "Antiplatelet",
        "adult_fixed_dose_mg": 324.0,
        "routes": ["PO"],
        "notes": "Chewed for faster absorption",
    },
    "nitroglycerin": {
        "name": "Nitroglycerin",
        "class": "Vasodilator",
        "adult_fixed_dose_mg": 0.4,
        "routes": ["SL"],
        "notes": "Hold if SBP < 90. Max 3 doses",
    },
    "glucagon": {
        "name": "Glucagon",
        "class": "Hyperglycemic",
        "adult_fixed_dose_mg": 1.0,
        "pedi_dose_mg_kg": 0.03,
        "max_single_dose_mg": 1.0,
        "concentration_mg_ml": 1.0,
        "routes": ["IM", "SQ", "IV"],
        "notes": "Reconstitute before use",
    },
    "ketamine": {
        "name": "Ketamine",
        "class": "Dissociative Anesthetic",
        "adult_dose_mg_kg_iv": 1.0,
        "adult_dose_mg_kg_im": 4.0,
        "pedi_dose_mg_kg_iv": 1.0,
        "concentration_mg_ml": 100.0,
        "routes": ["IV", "IM", "IN"],
        "notes": "Sedation: 1mg/kg IV, 4mg/kg IM",
    },
}


class DrugDoseCalculator:
    def __init__(self):
        self.drugs = DRUG_DATABASE

    def calculate_dose(
        self,
        drug_key: str,
        weight_kg: float,
        patient_type: PatientType = PatientType.ADULT,
        route: Optional[str] = None,
    ) -> DrugDose:
        if drug_key not in self.drugs:
            raise ValueError(f"Unknown drug: {drug_key}")

        drug = self.drugs[drug_key]
        warnings = []

        if patient_type == PatientType.ADULT:
            if "adult_fixed_dose_mg" in drug:
                dose_mg = drug["adult_fixed_dose_mg"]
            elif "adult_fixed_dose_mcg" in drug:
                dose_mg = drug["adult_fixed_dose_mcg"] / 1000
            elif "adult_fixed_dose_g" in drug:
                dose_mg = drug["adult_fixed_dose_g"] * 1000
            else:
                dose_mg = 0
        else:
            if "pedi_dose_mg_kg" in drug:
                dose_mg = weight_kg * drug["pedi_dose_mg_kg"]
            elif "pedi_dose_mcg_kg" in drug:
                dose_mg = (weight_kg * drug["pedi_dose_mcg_kg"]) / 1000
            elif "pedi_fixed_dose_mg" in drug:
                dose_mg = drug["pedi_fixed_dose_mg"]
            else:
                warnings.append("Pediatric dosing not defined")
                dose_mg = 0

        max_dose = drug.get("max_single_dose_mg") or drug.get("max_single_dose_mcg", 0) / 1000
        if max_dose and dose_mg > max_dose:
            warnings.append(f"Dose exceeds max of {max_dose}mg")
            dose_mg = max_dose

        min_dose = drug.get("min_dose_mg")
        if min_dose and dose_mg < min_dose:
            warnings.append(f"Using minimum dose of {min_dose}mg")
            dose_mg = min_dose

        conc = drug.get("concentration_mg_ml") or drug.get("concentration_mcg_ml", 1) / 1000 or drug.get("concentration_g_ml", 1) * 1000
        dose_ml = dose_mg / conc if conc > 0 else None

        return DrugDose(
            drug_name=drug["name"],
            dose_mg=round(dose_mg, 2),
            dose_ml=round(dose_ml, 2) if dose_ml else None,
            concentration=f"{conc} mg/mL",
            route=route or drug.get("routes", [""])[0],
            max_dose_mg=max_dose,
            notes=drug.get("notes", ""),
            warnings=warnings,
        )

    def search_drugs(self, query: str) -> list[str]:
        query_lower = query.lower()
        return [k for k, v in self.drugs.items() if query_lower in k or query_lower in v["name"].lower()]

    def get_all_drugs(self) -> list[dict]:
        return [{"key": k, "name": v["name"], "class": v["class"]} for k, v in self.drugs.items()]


def calculate_pediatric_weight(age_years: float) -> float:
    if age_years < 1:
        return 4 + (age_years * 12 * 0.5)
    elif age_years <= 5:
        return (age_years * 2) + 8
    elif age_years <= 12:
        return (age_years * 3) + 7
    return 50


def get_broselow_zone(weight_kg: float) -> dict:
    zones = [
        {"color": "Gray", "min": 3, "max": 5, "et_tube": 3.0},
        {"color": "Pink", "min": 6, "max": 7, "et_tube": 3.5},
        {"color": "Red", "min": 8, "max": 9, "et_tube": 4.0},
        {"color": "Purple", "min": 10, "max": 11, "et_tube": 4.5},
        {"color": "Yellow", "min": 12, "max": 14, "et_tube": 4.5},
        {"color": "White", "min": 15, "max": 18, "et_tube": 5.0},
        {"color": "Blue", "min": 19, "max": 23, "et_tube": 5.5},
        {"color": "Orange", "min": 24, "max": 29, "et_tube": 6.0},
        {"color": "Green", "min": 30, "max": 36, "et_tube": 6.5},
    ]
    for zone in zones:
        if zone["min"] <= weight_kg <= zone["max"]:
            return zone
    return {"color": "Adult" if weight_kg > 36 else "Premature", "et_tube": 7.0 if weight_kg > 36 else 2.5}
