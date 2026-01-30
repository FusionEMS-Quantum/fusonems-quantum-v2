"""
ePCR Import Service
Handles importing ePCR data from external vendors (ImageTrend Elite, ZOLL RescueNet)
"""
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import xml.etree.ElementTree as ET
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.epcr_core import (
    Patient,
    EpcrRecord,
    EpcrVitals,
    EpcrMedication,
    EpcrIntervention,
    EpcrAssessment,
    EpcrNarrative,
    EpcrRecordStatus,
)
from models.founder import FounderMetric
from utils.logger import logger


class EPCRImportJob:
    """Represents an ePCR import job"""
    def __init__(self, source: str, org_id: int, user_id: int):
        self.id = None
        self.source = source
        self.org_id = org_id
        self.user_id = user_id
        self.status = "pending"
        self.created_at = datetime.now(timezone.utc)
        self.completed_at = None
        self.total_records = 0
        self.successful_records = 0
        self.failed_records = 0
        self.validation_errors = []
        self.import_summary = {}


class EPCRImportService:
    """Service for importing ePCR data from external vendors"""
    
    SUPPORTED_VENDORS = ["imagetrend", "zoll"]
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        
    def import_from_vendor(
        self, 
        source: str, 
        xml_content: str, 
        user_id: int,
        request = None
    ) -> Dict[str, Any]:
        """
        Import ePCR data from vendor XML
        
        Args:
            source: Vendor name (imagetrend or zoll)
            xml_content: Raw XML content
            user_id: User performing the import
            request: FastAPI request object
            
        Returns:
            Import result with success/failure details
        """
        if source not in self.SUPPORTED_VENDORS:
            raise ValueError(f"Unsupported vendor: {source}. Must be one of {self.SUPPORTED_VENDORS}")
        
        # Create import job
        job = EPCRImportJob(source, self.org_id, user_id)
        
        try:
            # Parse XML
            root = ET.fromstring(xml_content)
            
            # Route to appropriate parser
            if source == "imagetrend":
                result = self._parse_imagetrend_xml(root, job)
            elif source == "zoll":
                result = self._parse_zoll_xml(root, job)
            else:
                raise ValueError(f"Parser not implemented for {source}")
            
            job.status = "completed" if job.failed_records == 0 else "completed_with_errors"
            job.completed_at = datetime.now(timezone.utc)
            
            # Log to founder metrics
            self._log_import_metric(job)
            
            return {
                "success": True,
                "job_id": job.id,
                "source": job.source,
                "total_records": job.total_records,
                "successful_records": job.successful_records,
                "failed_records": job.failed_records,
                "validation_errors": job.validation_errors[:10],  # First 10 errors
                "summary": job.import_summary
            }
            
        except ET.ParseError as e:
            job.status = "failed"
            job.completed_at = datetime.now(timezone.utc)
            job.validation_errors.append(f"XML Parse Error: {str(e)}")
            self._log_import_metric(job)
            
            return {
                "success": False,
                "error": f"Invalid XML: {str(e)}",
                "job_id": job.id
            }
            
        except Exception as e:
            job.status = "failed"
            job.completed_at = datetime.now(timezone.utc)
            job.validation_errors.append(f"Import Error: {str(e)}")
            self._log_import_metric(job)
            logger.error(f"ePCR import failed: {e}")
            
            return {
                "success": False,
                "error": str(e),
                "job_id": job.id
            }
    
    def _parse_imagetrend_xml(self, root: ET.Element, job: EPCRImportJob) -> Dict[str, Any]:
        """Parse ImageTrend Elite XML format"""
        epcr_records = []
        
        # ImageTrend Elite uses <PatientCareReport> elements
        pcr_elements = root.findall(".//PatientCareReport")
        job.total_records = len(pcr_elements)
        
        for pcr in pcr_elements:
            try:
                # Extract all data from PCR
                patient_data = self._extract_imagetrend_patient(pcr)
                vitals_data = self._extract_imagetrend_vitals(pcr)
                medications_data = self._extract_imagetrend_medications(pcr)
                interventions_data = self._extract_imagetrend_interventions(pcr)
                narrative_data = self._extract_imagetrend_narrative(pcr)
                
                # Create or update patient record
                patient = self._create_patient_record(patient_data)
                
                # Create complete ePCR record
                epcr_record = self._create_epcr_record(
                    patient,
                    patient_data,
                    vitals_data,
                    medications_data,
                    interventions_data,
                    narrative_data
                )
                
                epcr_records.append(epcr_record)
                job.successful_records += 1
                
            except Exception as e:
                job.failed_records += 1
                job.validation_errors.append(f"Record parse error: {str(e)}")
                logger.warning(f"ImageTrend record parse failed: {e}")
        
        job.import_summary = {
            "vendor": "ImageTrend Elite",
            "pcr_count": len(pcr_elements),
            "imported": job.successful_records,
            "failed": job.failed_records,
        }
        
        return {"epcr_records": epcr_records}
    
    def _parse_zoll_xml(self, root: ET.Element, job: EPCRImportJob) -> Dict[str, Any]:
        """Parse ZOLL RescueNet XML format"""
        epcr_records = []
        
        # ZOLL RescueNet uses <Record> elements
        record_elements = root.findall(".//Record")
        job.total_records = len(record_elements)
        
        for record in record_elements:
            try:
                # Extract all data from record
                patient_data = self._extract_zoll_patient(record)
                vitals_data = self._extract_zoll_vitals(record)
                medications_data = self._extract_zoll_medications(record)
                interventions_data = self._extract_zoll_interventions(record)
                narrative_data = self._extract_zoll_narrative(record)
                
                # Create or update patient record
                patient = self._create_patient_record(patient_data)
                
                # Create complete ePCR record
                epcr_record = self._create_epcr_record(
                    patient,
                    patient_data,
                    vitals_data,
                    medications_data,
                    interventions_data,
                    narrative_data
                )
                
                epcr_records.append(epcr_record)
                job.successful_records += 1
                
            except Exception as e:
                job.failed_records += 1
                job.validation_errors.append(f"Record parse error: {str(e)}")
                logger.warning(f"ZOLL record parse failed: {e}")
        
        job.import_summary = {
            "vendor": "ZOLL RescueNet",
            "record_count": len(record_elements),
            "imported": job.successful_records,
            "failed": job.failed_records,
        }
        
        return {"epcr_records": epcr_records}
    
    def _extract_imagetrend_patient(self, pcr: ET.Element) -> Dict[str, Any]:
        """Extract patient data from ImageTrend PCR element"""
        return {
            "external_id": pcr.findtext(".//PCRNumber", ""),
            "first_name": pcr.findtext(".//PatientFirstName", ""),
            "last_name": pcr.findtext(".//PatientLastName", ""),
            "dob": pcr.findtext(".//DateOfBirth", ""),
            "gender": pcr.findtext(".//Gender", ""),
            "chief_complaint": pcr.findtext(".//ChiefComplaint", ""),
            "incident_date": pcr.findtext(".//IncidentDate", ""),
            "vendor": "imagetrend"
        }
    
    def _extract_zoll_patient(self, record: ET.Element) -> Dict[str, Any]:
        """Extract patient data from ZOLL Record element"""
        return {
            "external_id": record.findtext(".//RecordID", ""),
            "first_name": record.findtext(".//FirstName", ""),
            "last_name": record.findtext(".//LastName", ""),
            "dob": record.findtext(".//BirthDate", ""),
            "gender": record.findtext(".//Sex", ""),
            "chief_complaint": record.findtext(".//PrimaryImpression", ""),
            "incident_date": record.findtext(".//CallDate", ""),
            "vendor": "zoll"
        }
    
    def _create_patient_record(self, data: Dict[str, Any]) -> Patient:
        """Create or update patient record in database"""
        # Check if patient already exists by external_id
        existing = self.db.query(Patient).filter(
            Patient.org_id == self.org_id,
            Patient.external_id == data.get("external_id")
        ).first() if data.get("external_id") else None
        
        if existing:
            # Update existing record
            for key, value in data.items():
                if hasattr(existing, key) and value:
                    setattr(existing, key, value)
            patient = existing
        else:
            # Create new patient record
            patient = Patient(
                org_id=self.org_id,
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                dob=self._parse_date(data.get("dob")),
                gender=data.get("gender"),
                external_id=data.get("external_id"),
                incident_number=data.get("external_id", ""),
                chief_complaint=data.get("chief_complaint"),
                narrative=data.get("narrative")
            )
            self.db.add(patient)
        
        self.db.commit()
        self.db.refresh(patient)
        return patient
    
    def _create_epcr_record(
        self,
        patient: Patient,
        patient_data: Dict[str, Any],
        vitals_data: List[Dict[str, Any]],
        medications_data: List[Dict[str, Any]],
        interventions_data: List[Dict[str, Any]],
        narrative_data: Dict[str, Any]
    ) -> EpcrRecord:
        """Create complete ePCR record with all components"""
        
        # Check if ePCR record already exists for this patient
        existing_record = self.db.query(EpcrRecord).filter(
            EpcrRecord.org_id == self.org_id,
            EpcrRecord.patient_id == patient.id,
            EpcrRecord.incident_number == patient_data.get("external_id")
        ).first()
        
        if existing_record:
            epcr_record = existing_record
        else:
            # Create ePCR record
            epcr_record = EpcrRecord(
                org_id=self.org_id,
                patient_id=patient.id,
                incident_number=patient_data.get("external_id", ""),
                chief_complaint=patient_data.get("chief_complaint", ""),
                status=EpcrRecordStatus.DRAFT,
                incident_date=self._parse_datetime(patient_data.get("incident_date")),
                custom_fields={"imported": True, "vendor": patient_data.get("vendor")}
            )
            self.db.add(epcr_record)
            self.db.flush()
        
        # Import vitals
        for vital_data in vitals_data:
            vital = EpcrVitals(
                org_id=self.org_id,
                record_id=epcr_record.id,
                timestamp=self._parse_datetime(vital_data.get("timestamp")),
                systolic_bp=vital_data.get("systolic_bp"),
                diastolic_bp=vital_data.get("diastolic_bp"),
                heart_rate=vital_data.get("heart_rate"),
                respiratory_rate=vital_data.get("respiratory_rate"),
                oxygen_saturation=vital_data.get("oxygen_saturation"),
                temperature=vital_data.get("temperature"),
                blood_glucose=vital_data.get("blood_glucose")
            )
            self.db.add(vital)
        
        # Import medications
        for med_data in medications_data:
            medication = EpcrMedication(
                org_id=self.org_id,
                record_id=epcr_record.id,
                medication_name=med_data.get("name", "Unknown"),
                dosage=med_data.get("dosage"),
                route=med_data.get("route"),
                administered_at=self._parse_datetime(med_data.get("administered_at")),
                administered_by=med_data.get("administered_by")
            )
            self.db.add(medication)
        
        # Import interventions
        for intervention_data in interventions_data:
            intervention = EpcrIntervention(
                org_id=self.org_id,
                record_id=epcr_record.id,
                intervention_type=intervention_data.get("type", "Unknown"),
                description=intervention_data.get("description"),
                performed_at=self._parse_datetime(intervention_data.get("performed_at")),
                performed_by=intervention_data.get("performed_by")
            )
            self.db.add(intervention)
        
        # Import narrative
        if narrative_data.get("text"):
            narrative = EpcrNarrative(
                org_id=self.org_id,
                record_id=epcr_record.id,
                narrative_type="imported",
                narrative_text=narrative_data.get("text", ""),
                created_by=narrative_data.get("created_by", "import")
            )
            self.db.add(narrative)
        
        self.db.commit()
        self.db.refresh(epcr_record)
        return epcr_record
    
    # ImageTrend extraction methods
    def _extract_imagetrend_vitals(self, pcr: ET.Element) -> List[Dict[str, Any]]:
        """Extract vitals from ImageTrend PCR"""
        vitals = []
        for vital_set in pcr.findall(".//VitalSigns"):
            vitals.append({
                "timestamp": vital_set.findtext(".//VitalSignsTimestamp"),
                "systolic_bp": self._parse_int(vital_set.findtext(".//SystolicBP")),
                "diastolic_bp": self._parse_int(vital_set.findtext(".//DiastolicBP")),
                "heart_rate": self._parse_int(vital_set.findtext(".//HeartRate")),
                "respiratory_rate": self._parse_int(vital_set.findtext(".//RespiratoryRate")),
                "oxygen_saturation": self._parse_int(vital_set.findtext(".//OxygenSaturation")),
                "temperature": self._parse_float(vital_set.findtext(".//Temperature")),
                "blood_glucose": self._parse_int(vital_set.findtext(".//BloodGlucose"))
            })
        return vitals
    
    def _extract_imagetrend_medications(self, pcr: ET.Element) -> List[Dict[str, Any]]:
        """Extract medications from ImageTrend PCR"""
        medications = []
        for med in pcr.findall(".//Medication"):
            medications.append({
                "name": med.findtext(".//MedicationName", "Unknown"),
                "dosage": med.findtext(".//Dosage"),
                "route": med.findtext(".//Route"),
                "administered_at": med.findtext(".//AdministeredTime"),
                "administered_by": med.findtext(".//AdministeredBy")
            })
        return medications
    
    def _extract_imagetrend_interventions(self, pcr: ET.Element) -> List[Dict[str, Any]]:
        """Extract interventions from ImageTrend PCR"""
        interventions = []
        for intervention in pcr.findall(".//Procedure"):
            interventions.append({
                "type": intervention.findtext(".//ProcedureType", "Unknown"),
                "description": intervention.findtext(".//ProcedureDescription"),
                "performed_at": intervention.findtext(".//PerformedTime"),
                "performed_by": intervention.findtext(".//PerformedBy")
            })
        return interventions
    
    def _extract_imagetrend_narrative(self, pcr: ET.Element) -> Dict[str, Any]:
        """Extract narrative from ImageTrend PCR"""
        return {
            "text": pcr.findtext(".//Narrative", ""),
            "created_by": pcr.findtext(".//NarrativeAuthor", "import")
        }
    
    # ZOLL extraction methods
    def _extract_zoll_vitals(self, record: ET.Element) -> List[Dict[str, Any]]:
        """Extract vitals from ZOLL Record"""
        vitals = []
        for vital_set in record.findall(".//VitalSign"):
            vitals.append({
                "timestamp": vital_set.findtext(".//Time"),
                "systolic_bp": self._parse_int(vital_set.findtext(".//BPSystolic")),
                "diastolic_bp": self._parse_int(vital_set.findtext(".//BPDiastolic")),
                "heart_rate": self._parse_int(vital_set.findtext(".//Pulse")),
                "respiratory_rate": self._parse_int(vital_set.findtext(".//Respirations")),
                "oxygen_saturation": self._parse_int(vital_set.findtext(".//SpO2")),
                "temperature": self._parse_float(vital_set.findtext(".//Temp")),
                "blood_glucose": self._parse_int(vital_set.findtext(".//Glucose"))
            })
        return vitals
    
    def _extract_zoll_medications(self, record: ET.Element) -> List[Dict[str, Any]]:
        """Extract medications from ZOLL Record"""
        medications = []
        for med in record.findall(".//Med"):
            medications.append({
                "name": med.findtext(".//MedName", "Unknown"),
                "dosage": med.findtext(".//Dose"),
                "route": med.findtext(".//MedRoute"),
                "administered_at": med.findtext(".//TimeGiven"),
                "administered_by": med.findtext(".//GivenBy")
            })
        return medications
    
    def _extract_zoll_interventions(self, record: ET.Element) -> List[Dict[str, Any]]:
        """Extract interventions from ZOLL Record"""
        interventions = []
        for intervention in record.findall(".//Treatment"):
            interventions.append({
                "type": intervention.findtext(".//TreatmentType", "Unknown"),
                "description": intervention.findtext(".//TreatmentDesc"),
                "performed_at": intervention.findtext(".//TreatmentTime"),
                "performed_by": intervention.findtext(".//Provider")
            })
        return interventions
    
    def _extract_zoll_narrative(self, record: ET.Element) -> Dict[str, Any]:
        """Extract narrative from ZOLL Record"""
        return {
            "text": record.findtext(".//PatientNarrative", ""),
            "created_by": record.findtext(".//Author", "import")
        }
    
    # Utility methods
    def _parse_int(self, value: Optional[str]) -> Optional[int]:
        """Safely parse integer from string"""
        if not value:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _parse_float(self, value: Optional[str]) -> Optional[float]:
        """Safely parse float from string"""
        if not value:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _parse_date(self, value: Optional[str]) -> Optional[datetime]:
        """Safely parse date from string"""
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    
    def _parse_datetime(self, value: Optional[str]) -> Optional[datetime]:
        """Safely parse datetime from string"""
        return self._parse_date(value)
    
    def _log_import_metric(self, job: EPCRImportJob):
        """Log import job to founder metrics"""
        try:
            metric = FounderMetric(
                org_id=self.org_id,
                category="epcr_import",
                value=job.status,
                details={
                    "source": job.source,
                    "total_records": job.total_records,
                    "successful_records": job.successful_records,
                    "failed_records": job.failed_records,
                    "error_count": len(job.validation_errors),
                    "duration_seconds": (
                        (job.completed_at - job.created_at).total_seconds()
                        if job.completed_at else None
                    )
                }
            )
            self.db.add(metric)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to log import metric: {e}")
    
    def get_import_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent import history from founder metrics"""
        metrics = (
            self.db.query(FounderMetric)
            .filter(
                FounderMetric.org_id == self.org_id,
                FounderMetric.category == "epcr_import"
            )
            .order_by(desc(FounderMetric.created_at))
            .limit(limit)
            .all()
        )
        
        return [
            {
                "id": m.id,
                "source": m.details.get("source", "unknown"),
                "status": m.value,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "total_records": m.details.get("total_records", 0),
                "successful_records": m.details.get("successful_records", 0),
                "failed_records": m.details.get("failed_records", 0),
                "error_count": m.details.get("error_count", 0),
                "duration_seconds": m.details.get("duration_seconds", 0)
            }
            for m in metrics
        ]
    
    def get_import_stats(self) -> Dict[str, Any]:
        """Get aggregate import statistics"""
        metrics = (
            self.db.query(FounderMetric)
            .filter(
                FounderMetric.org_id == self.org_id,
                FounderMetric.category == "epcr_import"
            )
            .all()
        )
        
        total_imports = len(metrics)
        successful_imports = sum(1 for m in metrics if m.value == "completed")
        failed_imports = sum(1 for m in metrics if m.value == "failed")
        total_records_imported = sum(m.details.get("successful_records", 0) for m in metrics)
        total_errors = sum(m.details.get("error_count", 0) for m in metrics)
        
        # Vendor breakdown
        imagetrend_count = sum(1 for m in metrics if m.details.get("source") == "imagetrend")
        zoll_count = sum(1 for m in metrics if m.details.get("source") == "zoll")
        
        return {
            "total_imports": total_imports,
            "successful_imports": successful_imports,
            "failed_imports": failed_imports,
            "total_records_imported": total_records_imported,
            "total_errors": total_errors,
            "success_rate": round(successful_imports / total_imports * 100, 1) if total_imports > 0 else 0,
            "vendor_breakdown": {
                "imagetrend": imagetrend_count,
                "zoll": zoll_count
            },
            "last_import": metrics[0].created_at.isoformat() if metrics else None
        }
