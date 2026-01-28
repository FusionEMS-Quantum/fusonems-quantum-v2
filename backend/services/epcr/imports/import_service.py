"""
ePCR Import Service
Handles importing ePCR data from external vendors (ImageTrend Elite, ZOLL RescueNet)
"""
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import xml.etree.ElementTree as ET
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.epcr_core import Patient
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
        patients = []
        
        # ImageTrend Elite uses <PatientCareReport> elements
        pcr_elements = root.findall(".//PatientCareReport")
        job.total_records = len(pcr_elements)
        
        for pcr in pcr_elements:
            try:
                patient_data = self._extract_imagetrend_patient(pcr)
                
                # Create or update patient record
                patient = self._create_patient_record(patient_data)
                patients.append(patient)
                job.successful_records += 1
                
            except Exception as e:
                job.failed_records += 1
                job.validation_errors.append(f"Record parse error: {str(e)}")
                logger.warning(f"ImageTrend record parse failed: {e}")
        
        job.import_summary = {
            "vendor": "ImageTrend Elite",
            "pcr_count": len(pcr_elements),
            "imported": job.successful_records,
            "failed": job.failed_records
        }
        
        return {"patients": patients}
    
    def _parse_zoll_xml(self, root: ET.Element, job: EPCRImportJob) -> Dict[str, Any]:
        """Parse ZOLL RescueNet XML format"""
        patients = []
        
        # ZOLL RescueNet uses <Record> elements
        record_elements = root.findall(".//Record")
        job.total_records = len(record_elements)
        
        for record in record_elements:
            try:
                patient_data = self._extract_zoll_patient(record)
                
                # Create or update patient record
                patient = self._create_patient_record(patient_data)
                patients.append(patient)
                job.successful_records += 1
                
            except Exception as e:
                job.failed_records += 1
                job.validation_errors.append(f"Record parse error: {str(e)}")
                logger.warning(f"ZOLL record parse failed: {e}")
        
        job.import_summary = {
            "vendor": "ZOLL RescueNet",
            "record_count": len(record_elements),
            "imported": job.successful_records,
            "failed": job.failed_records
        }
        
        return {"patients": patients}
    
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
            Patient.external_id == data["external_id"]
        ).first()
        
        if existing:
            # Update existing record
            for key, value in data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            patient = existing
        else:
            # Create new patient record
            patient = Patient(
                org_id=self.org_id,
                **data
            )
            self.db.add(patient)
        
        self.db.commit()
        self.db.refresh(patient)
        return patient
    
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
