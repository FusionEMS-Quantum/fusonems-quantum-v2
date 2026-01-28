"""
Metriport Service - Patient Demographics & Insurance Integration

Provides:
- Patient search and matching
- Insurance eligibility verification
- Medical history retrieval (FHIR)
- Document synchronization
- Real-time webhook processing
"""

import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from core.config import settings
from models.metriport import (
    PatientInsurance,
    MetriportPatientMapping,
    MetriportWebhookEvent,
    MetriportDocumentSync,
    InsuranceVerificationLog,
    InsuranceVerificationStatus,
    InsuranceCoverageType,
    MetriportSyncStatus,
    FHIRDocumentType,
)
from models.epcr_core import Patient, MasterPatient
from utils.logger import logger


class MetriportService:
    """Service for Metriport API integration"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'METRIPORT_API_KEY', '')
        self.base_url = getattr(settings, 'METRIPORT_BASE_URL', 'https://api.metriport.com/medical/v1')
        self.facility_id = getattr(settings, 'METRIPORT_FACILITY_ID', '')
        self.enabled = getattr(settings, 'METRIPORT_ENABLED', False)
        
        self.headers = {
            'x-api-key': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def _is_enabled(self) -> bool:
        """Check if Metriport integration is enabled"""
        if not self.enabled:
            logger.warning("Metriport integration is disabled")
            return False
        if not self.api_key:
            logger.error("Metriport API key not configured")
            return False
        return True
    
    async def create_patient(
        self,
        db: Session,
        org_id: int,
        first_name: str,
        last_name: str,
        date_of_birth: str,
        gender: str,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        address: Optional[Dict[str, str]] = None,
        master_patient_id: Optional[int] = None,
        epcr_patient_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        Create or find patient in Metriport
        Returns Metriport patient ID
        """
        if not self._is_enabled():
            return None
        
        try:
            # Format address for Metriport
            address_lines = []
            if address:
                if address.get('address'):
                    address_lines.append(address['address'])
            
            payload = {
                'firstName': first_name,
                'lastName': last_name,
                'dob': date_of_birth,
                'genderAtBirth': self._normalize_gender(gender),
                'personalIdentifiers': []
            }
            
            # Add contact info if available
            contact = []
            if phone:
                contact.append({
                    'phone': phone
                })
            if email:
                contact.append({
                    'email': email
                })
            if contact:
                payload['contact'] = contact
            
            # Add address if available
            if address and address_lines:
                payload['address'] = [{
                    'addressLine1': address_lines[0] if len(address_lines) > 0 else '',
                    'city': address.get('city', ''),
                    'state': address.get('state', ''),
                    'zip': address.get('postal_code', ''),
                    'country': 'USA'
                }]
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f'{self.base_url}/patient',
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    metriport_patient_id = data.get('id')
                    
                    # Store mapping
                    mapping = MetriportPatientMapping(
                        org_id=org_id,
                        master_patient_id=master_patient_id,
                        epcr_patient_id=epcr_patient_id,
                        metriport_patient_id=metriport_patient_id,
                        metriport_facility_id=self.facility_id,
                        first_name=first_name,
                        last_name=last_name,
                        date_of_birth=date_of_birth,
                        gender=gender,
                        phone=phone or '',
                        address=address or {},
                        mapping_confidence=100,
                        mapping_source='automatic',
                        sync_status=MetriportSyncStatus.COMPLETED
                    )
                    db.add(mapping)
                    db.commit()
                    
                    logger.info(f"Created Metriport patient: {metriport_patient_id}")
                    return metriport_patient_id
                else:
                    logger.error(f"Metriport patient creation failed: {response.status_code} - {response.text}")
                    return None
        
        except Exception as e:
            logger.error(f"Error creating Metriport patient: {e}")
            return None
    
    async def search_patient(
        self,
        first_name: str,
        last_name: str,
        date_of_birth: str,
        gender: Optional[str] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Search for patient in Metriport network
        Returns list of matching patients
        """
        if not self._is_enabled():
            return None
        
        try:
            params = {
                'firstName': first_name,
                'lastName': last_name,
                'dob': date_of_birth
            }
            
            if gender:
                params['genderAtBirth'] = self._normalize_gender(gender)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f'{self.base_url}/patient',
                    headers=self.headers,
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    patients = data.get('patients', [])
                    logger.info(f"Found {len(patients)} matching patients in Metriport")
                    return patients
                else:
                    logger.error(f"Metriport patient search failed: {response.status_code}")
                    return []
        
        except Exception as e:
            logger.error(f"Error searching Metriport patients: {e}")
            return None
    
    async def verify_insurance(
        self,
        db: Session,
        org_id: int,
        metriport_patient_id: str,
        payer_id: str,
        member_id: str,
        master_patient_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Verify insurance eligibility through Metriport
        """
        if not self._is_enabled():
            return None
        
        start_time = datetime.utcnow()
        
        try:
            payload = {
                'patientId': metriport_patient_id,
                'payerId': payer_id,
                'memberId': member_id
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f'{self.base_url}/eligibility',
                    headers=self.headers,
                    json=payload,
                    timeout=60.0
                )
                
                end_time = datetime.utcnow()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)
                
                # Log verification attempt
                log = InsuranceVerificationLog(
                    org_id=org_id,
                    master_patient_id=master_patient_id,
                    verification_type='eligibility',
                    request_payload=payload,
                    response_payload=response.json() if response.status_code == 200 else {},
                    initiated_by=user_id,
                    requested_at=start_time,
                    responded_at=end_time,
                    duration_ms=duration_ms
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Parse eligibility response
                    is_eligible = data.get('eligible', False)
                    coverage = data.get('coverage', {})
                    
                    log.verification_status = InsuranceVerificationStatus.VERIFIED if is_eligible else InsuranceVerificationStatus.FAILED
                    log.is_eligible = is_eligible
                    log.eligibility_message = data.get('message', '')
                    
                    db.add(log)
                    db.commit()
                    
                    logger.info(f"Insurance verification completed: eligible={is_eligible}")
                    return data
                else:
                    error_msg = response.text
                    log.verification_status = InsuranceVerificationStatus.FAILED
                    log.error_message = error_msg
                    db.add(log)
                    db.commit()
                    
                    logger.error(f"Insurance verification failed: {response.status_code} - {error_msg}")
                    return None
        
        except Exception as e:
            logger.error(f"Error verifying insurance: {e}")
            
            # Log error
            log = InsuranceVerificationLog(
                org_id=org_id,
                master_patient_id=master_patient_id,
                verification_type='eligibility',
                verification_status=InsuranceVerificationStatus.FAILED,
                error_message=str(e),
                initiated_by=user_id,
                requested_at=start_time,
                duration_ms=0
            )
            db.add(log)
            db.commit()
            
            return None
    
    async def get_patient_consolidated_data(
        self,
        metriport_patient_id: str,
        resources: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get patient's consolidated medical data (FHIR format)
        """
        if not self._is_enabled():
            return None
        
        try:
            params = {}
            if resources:
                params['resources'] = ','.join(resources)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f'{self.base_url}/patient/{metriport_patient_id}/consolidated',
                    headers=self.headers,
                    params=params,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Retrieved consolidated data for patient {metriport_patient_id}")
                    return data
                else:
                    logger.error(f"Failed to get consolidated data: {response.status_code}")
                    return None
        
        except Exception as e:
            logger.error(f"Error getting consolidated data: {e}")
            return None
    
    async def list_documents(
        self,
        metriport_patient_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        List all medical documents for a patient
        """
        if not self._is_enabled():
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f'{self.base_url}/patient/{metriport_patient_id}/document',
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    documents = data.get('documents', [])
                    logger.info(f"Found {len(documents)} documents for patient")
                    return documents
                else:
                    logger.error(f"Failed to list documents: {response.status_code}")
                    return []
        
        except Exception as e:
            logger.error(f"Error listing documents: {e}")
            return None
    
    async def download_document(
        self,
        db: Session,
        org_id: int,
        metriport_patient_id: str,
        document_id: str,
        master_patient_id: Optional[int] = None
    ) -> Optional[str]:
        """
        Download a medical document
        Returns local storage path
        """
        if not self._is_enabled():
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f'{self.base_url}/patient/{metriport_patient_id}/document/{document_id}',
                    headers=self.headers,
                    timeout=120.0
                )
                
                if response.status_code == 200:
                    # Parse document data
                    data = response.json()
                    
                    # Store document sync record
                    doc_sync = MetriportDocumentSync(
                        org_id=org_id,
                        metriport_patient_id=metriport_patient_id,
                        master_patient_id=master_patient_id,
                        document_id=document_id,
                        document_type=FHIRDocumentType.C_CDA,
                        document_title=data.get('title', ''),
                        document_description=data.get('description', ''),
                        fhir_bundle=data,
                        sync_status=MetriportSyncStatus.COMPLETED,
                        downloaded_at=datetime.utcnow()
                    )
                    db.add(doc_sync)
                    db.commit()
                    
                    logger.info(f"Downloaded document {document_id}")
                    return document_id
                else:
                    logger.error(f"Failed to download document: {response.status_code}")
                    return None
        
        except Exception as e:
            logger.error(f"Error downloading document: {e}")
            return None
    
    def store_insurance_verification(
        self,
        db: Session,
        org_id: int,
        master_patient_id: Optional[int],
        epcr_patient_id: Optional[int],
        verification_data: Dict[str, Any],
        coverage_type: InsuranceCoverageType = InsuranceCoverageType.PRIMARY
    ) -> Optional[PatientInsurance]:
        """
        Store insurance verification results
        """
        try:
            coverage = verification_data.get('coverage', {})
            
            insurance = PatientInsurance(
                org_id=org_id,
                master_patient_id=master_patient_id,
                epcr_patient_id=epcr_patient_id,
                coverage_type=coverage_type,
                payer_name=coverage.get('payerName', ''),
                payer_id=coverage.get('payerId', ''),
                member_id=verification_data.get('memberId', ''),
                group_number=coverage.get('groupNumber', ''),
                plan_name=coverage.get('planName', ''),
                verification_status=InsuranceVerificationStatus.VERIFIED if verification_data.get('eligible') else InsuranceVerificationStatus.FAILED,
                verified_at=datetime.utcnow(),
                is_active=verification_data.get('eligible', False),
                copay_amount=str(coverage.get('copay', '')),
                deductible_amount=str(coverage.get('deductible', '')),
                raw_eligibility_response=verification_data
            )
            
            db.add(insurance)
            db.commit()
            db.refresh(insurance)
            
            logger.info(f"Stored insurance verification for patient")
            return insurance
        
        except Exception as e:
            logger.error(f"Error storing insurance verification: {e}")
            db.rollback()
            return None
    
    def get_patient_mapping(
        self,
        db: Session,
        org_id: int,
        master_patient_id: Optional[int] = None,
        epcr_patient_id: Optional[int] = None
    ) -> Optional[MetriportPatientMapping]:
        """Get Metriport patient mapping"""
        try:
            query = db.query(MetriportPatientMapping).filter(
                MetriportPatientMapping.org_id == org_id
            )
            
            if master_patient_id:
                query = query.filter(MetriportPatientMapping.master_patient_id == master_patient_id)
            elif epcr_patient_id:
                query = query.filter(MetriportPatientMapping.epcr_patient_id == epcr_patient_id)
            else:
                return None
            
            return query.first()
        
        except Exception as e:
            logger.error(f"Error getting patient mapping: {e}")
            return None
    
    def get_patient_insurance(
        self,
        db: Session,
        org_id: int,
        master_patient_id: Optional[int] = None,
        epcr_patient_id: Optional[int] = None,
        coverage_type: Optional[InsuranceCoverageType] = None
    ) -> List[PatientInsurance]:
        """Get patient insurance records"""
        try:
            query = db.query(PatientInsurance).filter(
                PatientInsurance.org_id == org_id
            )
            
            if master_patient_id:
                query = query.filter(PatientInsurance.master_patient_id == master_patient_id)
            elif epcr_patient_id:
                query = query.filter(PatientInsurance.epcr_patient_id == epcr_patient_id)
            
            if coverage_type:
                query = query.filter(PatientInsurance.coverage_type == coverage_type)
            
            return query.order_by(PatientInsurance.created_at.desc()).all()
        
        except Exception as e:
            logger.error(f"Error getting patient insurance: {e}")
            return []
    
    def _normalize_gender(self, gender: str) -> str:
        """Normalize gender for Metriport API"""
        gender_map = {
            'M': 'M',
            'F': 'F',
            'O': 'O',
            'U': 'U',
            'male': 'M',
            'female': 'F',
            'other': 'O',
            'unknown': 'U'
        }
        return gender_map.get(gender.lower() if gender else '', 'U')
    
    async def parse_fhir_bundle(
        self,
        fhir_bundle: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Parse FHIR bundle and extract relevant medical data
        """
        parsed = {
            'allergies': [],
            'medications': [],
            'conditions': [],
            'procedures': [],
            'observations': [],
            'encounters': []
        }
        
        try:
            entries = fhir_bundle.get('entry', [])
            
            for entry in entries:
                resource = entry.get('resource', {})
                resource_type = resource.get('resourceType', '')
                
                if resource_type == 'AllergyIntolerance':
                    parsed['allergies'].append({
                        'code': resource.get('code', {}).get('text', ''),
                        'clinicalStatus': resource.get('clinicalStatus', {}).get('coding', [{}])[0].get('code', ''),
                        'verificationStatus': resource.get('verificationStatus', {}).get('coding', [{}])[0].get('code', '')
                    })
                
                elif resource_type == 'MedicationStatement':
                    parsed['medications'].append({
                        'medication': resource.get('medicationCodeableConcept', {}).get('text', ''),
                        'status': resource.get('status', ''),
                        'dateAsserted': resource.get('dateAsserted', '')
                    })
                
                elif resource_type == 'Condition':
                    parsed['conditions'].append({
                        'code': resource.get('code', {}).get('text', ''),
                        'clinicalStatus': resource.get('clinicalStatus', {}).get('coding', [{}])[0].get('code', ''),
                        'onsetDateTime': resource.get('onsetDateTime', '')
                    })
                
                elif resource_type == 'Procedure':
                    parsed['procedures'].append({
                        'code': resource.get('code', {}).get('text', ''),
                        'status': resource.get('status', ''),
                        'performedDateTime': resource.get('performedDateTime', '')
                    })
                
                elif resource_type == 'Observation':
                    parsed['observations'].append({
                        'code': resource.get('code', {}).get('text', ''),
                        'value': resource.get('valueQuantity', {}).get('value', ''),
                        'unit': resource.get('valueQuantity', {}).get('unit', ''),
                        'effectiveDateTime': resource.get('effectiveDateTime', '')
                    })
                
                elif resource_type == 'Encounter':
                    parsed['encounters'].append({
                        'type': resource.get('type', [{}])[0].get('text', ''),
                        'status': resource.get('status', ''),
                        'period': resource.get('period', {})
                    })
            
            return parsed
        
        except Exception as e:
            logger.error(f"Error parsing FHIR bundle: {e}")
            return parsed


# Singleton instance
_metriport_service: Optional[MetriportService] = None


def get_metriport_service() -> MetriportService:
    """Get or create MetriportService instance"""
    global _metriport_service
    if _metriport_service is None:
        _metriport_service = MetriportService()
    return _metriport_service
