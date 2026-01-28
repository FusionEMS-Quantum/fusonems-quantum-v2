"""
Metriport API Router
Provides endpoints for insurance verification and patient data sync
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

from core.database import get_db
from core.guards import require_auth
from services.metriport.metriport_service import get_metriport_service
from models.metriport import (
    InsuranceCoverageType,
    InsuranceVerificationStatus,
    MetriportSyncStatus
)
from models.user import User
from utils.logger import logger


router = APIRouter(prefix="/api/metriport", tags=["metriport"])


# ===== Request/Response Models =====

class AddressInput(BaseModel):
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    postal_code: Optional[str] = ""


class CreatePatientRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    date_of_birth: str = Field(..., description="Format: YYYY-MM-DD")
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[AddressInput] = None
    master_patient_id: Optional[int] = None
    epcr_patient_id: Optional[int] = None


class SearchPatientRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    date_of_birth: str = Field(..., description="Format: YYYY-MM-DD")
    gender: Optional[str] = None


class VerifyInsuranceRequest(BaseModel):
    metriport_patient_id: Optional[str] = None
    master_patient_id: Optional[int] = None
    epcr_patient_id: Optional[int] = None
    payer_id: str = Field(..., min_length=1)
    member_id: str = Field(..., min_length=1)
    coverage_type: InsuranceCoverageType = InsuranceCoverageType.PRIMARY


class SyncDocumentsRequest(BaseModel):
    metriport_patient_id: Optional[str] = None
    master_patient_id: Optional[int] = None
    document_ids: Optional[List[str]] = None


class PatientResponse(BaseModel):
    metriport_patient_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    mapping_id: int
    sync_status: str
    created_at: datetime


class InsuranceResponse(BaseModel):
    id: int
    payer_name: str
    member_id: str
    coverage_type: str
    verification_status: str
    is_active: bool
    verified_at: Optional[datetime]
    copay_amount: str
    deductible_amount: str
    plan_name: str


class VerificationLogResponse(BaseModel):
    id: int
    verification_type: str
    verification_status: str
    is_eligible: Optional[bool]
    eligibility_message: str
    error_message: str
    requested_at: datetime
    duration_ms: int


# ===== Endpoints =====

@router.post("/patient/create", response_model=PatientResponse)
async def create_metriport_patient(
    request: CreatePatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Create patient in Metriport for insurance verification
    """
    try:
        service = get_metriport_service()
        
        # Convert address to dict
        address_dict = None
        if request.address:
            address_dict = {
                'address': request.address.address,
                'city': request.address.city,
                'state': request.address.state,
                'postal_code': request.address.postal_code
            }
        
        metriport_patient_id = await service.create_patient(
            db=db,
            org_id=current_user.org_id,
            first_name=request.first_name,
            last_name=request.last_name,
            date_of_birth=request.date_of_birth,
            gender=request.gender,
            phone=request.phone,
            email=request.email,
            address=address_dict,
            master_patient_id=request.master_patient_id,
            epcr_patient_id=request.epcr_patient_id
        )
        
        if not metriport_patient_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create patient in Metriport"
            )
        
        # Get mapping
        mapping = service.get_patient_mapping(
            db=db,
            org_id=current_user.org_id,
            master_patient_id=request.master_patient_id,
            epcr_patient_id=request.epcr_patient_id
        )
        
        return PatientResponse(
            metriport_patient_id=metriport_patient_id,
            first_name=request.first_name,
            last_name=request.last_name,
            date_of_birth=request.date_of_birth,
            gender=request.gender,
            mapping_id=mapping.id if mapping else 0,
            sync_status=mapping.sync_status.value if mapping else "unknown",
            created_at=mapping.created_at if mapping else datetime.utcnow()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Metriport patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/patient/search")
async def search_metriport_patients(
    request: SearchPatientRequest,
    current_user: User = Depends(require_auth)
):
    """
    Search for patients in Metriport network
    """
    try:
        service = get_metriport_service()
        
        patients = await service.search_patient(
            first_name=request.first_name,
            last_name=request.last_name,
            date_of_birth=request.date_of_birth,
            gender=request.gender
        )
        
        return {
            'count': len(patients) if patients else 0,
            'patients': patients or []
        }
    
    except Exception as e:
        logger.error(f"Error searching Metriport patients: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/insurance/verify")
async def verify_patient_insurance(
    request: VerifyInsuranceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Verify patient insurance eligibility
    """
    try:
        service = get_metriport_service()
        
        # Get or create Metriport patient mapping
        metriport_patient_id = request.metriport_patient_id
        
        if not metriport_patient_id:
            mapping = service.get_patient_mapping(
                db=db,
                org_id=current_user.org_id,
                master_patient_id=request.master_patient_id,
                epcr_patient_id=request.epcr_patient_id
            )
            
            if not mapping:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Patient not found in Metriport. Please create patient first."
                )
            
            metriport_patient_id = mapping.metriport_patient_id
        
        # Verify insurance
        verification_data = await service.verify_insurance(
            db=db,
            org_id=current_user.org_id,
            metriport_patient_id=metriport_patient_id,
            payer_id=request.payer_id,
            member_id=request.member_id,
            master_patient_id=request.master_patient_id,
            user_id=current_user.id
        )
        
        if not verification_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Insurance verification failed"
            )
        
        # Store insurance record
        insurance = service.store_insurance_verification(
            db=db,
            org_id=current_user.org_id,
            master_patient_id=request.master_patient_id,
            epcr_patient_id=request.epcr_patient_id,
            verification_data=verification_data,
            coverage_type=request.coverage_type
        )
        
        return {
            'verified': True,
            'eligible': verification_data.get('eligible', False),
            'insurance_id': insurance.id if insurance else None,
            'coverage': verification_data.get('coverage', {}),
            'message': verification_data.get('message', '')
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying insurance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/insurance/{patient_id}", response_model=List[InsuranceResponse])
async def get_patient_insurance(
    patient_id: int,
    patient_type: str = "master",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Get insurance records for a patient
    patient_type: 'master' or 'epcr'
    """
    try:
        service = get_metriport_service()
        
        master_patient_id = patient_id if patient_type == "master" else None
        epcr_patient_id = patient_id if patient_type == "epcr" else None
        
        insurance_records = service.get_patient_insurance(
            db=db,
            org_id=current_user.org_id,
            master_patient_id=master_patient_id,
            epcr_patient_id=epcr_patient_id
        )
        
        return [
            InsuranceResponse(
                id=ins.id,
                payer_name=ins.payer_name,
                member_id=ins.member_id,
                coverage_type=ins.coverage_type.value,
                verification_status=ins.verification_status.value,
                is_active=ins.is_active,
                verified_at=ins.verified_at,
                copay_amount=ins.copay_amount,
                deductible_amount=ins.deductible_amount,
                plan_name=ins.plan_name
            )
            for ins in insurance_records
        ]
    
    except Exception as e:
        logger.error(f"Error getting patient insurance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/documents/sync")
async def sync_patient_documents(
    request: SyncDocumentsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Sync medical documents from Metriport
    """
    try:
        service = get_metriport_service()
        
        # Get Metriport patient ID
        metriport_patient_id = request.metriport_patient_id
        
        if not metriport_patient_id and request.master_patient_id:
            mapping = service.get_patient_mapping(
                db=db,
                org_id=current_user.org_id,
                master_patient_id=request.master_patient_id
            )
            
            if not mapping:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Patient not found in Metriport"
                )
            
            metriport_patient_id = mapping.metriport_patient_id
        
        # List available documents
        documents = await service.list_documents(metriport_patient_id)
        
        if not documents:
            return {
                'synced': 0,
                'documents': []
            }
        
        # Download specific documents or all
        synced_docs = []
        for doc in documents:
            doc_id = doc.get('id')
            
            if request.document_ids and doc_id not in request.document_ids:
                continue
            
            result = await service.download_document(
                db=db,
                org_id=current_user.org_id,
                metriport_patient_id=metriport_patient_id,
                document_id=doc_id,
                master_patient_id=request.master_patient_id
            )
            
            if result:
                synced_docs.append(doc_id)
        
        return {
            'synced': len(synced_docs),
            'total_available': len(documents),
            'documents': synced_docs
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/documents/{patient_id}")
async def get_patient_documents(
    patient_id: int,
    patient_type: str = "master",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Get synced medical documents for a patient
    """
    try:
        from models.metriport import MetriportDocumentSync
        
        master_patient_id = patient_id if patient_type == "master" else None
        
        query = db.query(MetriportDocumentSync).filter(
            MetriportDocumentSync.org_id == current_user.org_id
        )
        
        if master_patient_id:
            query = query.filter(MetriportDocumentSync.master_patient_id == master_patient_id)
        
        documents = query.order_by(MetriportDocumentSync.created_at.desc()).all()
        
        return {
            'count': len(documents),
            'documents': [
                {
                    'id': doc.id,
                    'document_id': doc.document_id,
                    'document_type': doc.document_type.value,
                    'title': doc.document_title,
                    'description': doc.document_description,
                    'document_date': doc.document_date.isoformat() if doc.document_date else None,
                    'facility_name': doc.facility_name,
                    'sync_status': doc.sync_status.value,
                    'downloaded_at': doc.downloaded_at.isoformat() if doc.downloaded_at else None,
                    'created_at': doc.created_at.isoformat()
                }
                for doc in documents
            ]
        }
    
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/consolidated/{patient_id}")
async def get_consolidated_patient_data(
    patient_id: int,
    patient_type: str = "master",
    resources: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Get consolidated FHIR data for patient
    resources: comma-separated list (e.g., "Condition,Medication,Procedure")
    """
    try:
        service = get_metriport_service()
        
        # Get Metriport patient ID
        master_patient_id = patient_id if patient_type == "master" else None
        epcr_patient_id = patient_id if patient_type == "epcr" else None
        
        mapping = service.get_patient_mapping(
            db=db,
            org_id=current_user.org_id,
            master_patient_id=master_patient_id,
            epcr_patient_id=epcr_patient_id
        )
        
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found in Metriport"
            )
        
        resource_list = resources.split(',') if resources else None
        
        data = await service.get_patient_consolidated_data(
            metriport_patient_id=mapping.metriport_patient_id,
            resources=resource_list
        )
        
        if not data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve consolidated data"
            )
        
        # Parse FHIR bundle
        parsed = await service.parse_fhir_bundle(data)
        
        return {
            'patient_id': patient_id,
            'metriport_patient_id': mapping.metriport_patient_id,
            'raw_data': data,
            'parsed_data': parsed
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting consolidated data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/verification-log/{patient_id}", response_model=List[VerificationLogResponse])
async def get_verification_log(
    patient_id: int,
    patient_type: str = "master",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Get insurance verification history for a patient
    """
    try:
        from models.metriport import InsuranceVerificationLog
        
        master_patient_id = patient_id if patient_type == "master" else None
        
        query = db.query(InsuranceVerificationLog).filter(
            InsuranceVerificationLog.org_id == current_user.org_id
        )
        
        if master_patient_id:
            query = query.filter(InsuranceVerificationLog.master_patient_id == master_patient_id)
        
        logs = query.order_by(InsuranceVerificationLog.requested_at.desc()).limit(50).all()
        
        return [
            VerificationLogResponse(
                id=log.id,
                verification_type=log.verification_type,
                verification_status=log.verification_status.value,
                is_eligible=log.is_eligible,
                eligibility_message=log.eligibility_message,
                error_message=log.error_message,
                requested_at=log.requested_at,
                duration_ms=log.duration_ms
            )
            for log in logs
        ]
    
    except Exception as e:
        logger.error(f"Error getting verification log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/insurance/{insurance_id}/retry")
async def retry_insurance_verification(
    insurance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Retry failed insurance verification
    """
    try:
        from models.metriport import PatientInsurance
        
        insurance = db.query(PatientInsurance).filter(
            PatientInsurance.id == insurance_id,
            PatientInsurance.org_id == current_user.org_id
        ).first()
        
        if not insurance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Insurance record not found"
            )
        
        service = get_metriport_service()
        
        # Get Metriport patient ID
        mapping = service.get_patient_mapping(
            db=db,
            org_id=current_user.org_id,
            master_patient_id=insurance.master_patient_id,
            epcr_patient_id=insurance.epcr_patient_id
        )
        
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found in Metriport"
            )
        
        # Retry verification
        verification_data = await service.verify_insurance(
            db=db,
            org_id=current_user.org_id,
            metriport_patient_id=mapping.metriport_patient_id,
            payer_id=insurance.payer_id,
            member_id=insurance.member_id,
            master_patient_id=insurance.master_patient_id,
            user_id=current_user.id
        )
        
        if not verification_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Verification retry failed"
            )
        
        # Update insurance record
        insurance.verification_status = InsuranceVerificationStatus.VERIFIED if verification_data.get('eligible') else InsuranceVerificationStatus.FAILED
        insurance.verified_at = datetime.utcnow()
        insurance.is_active = verification_data.get('eligible', False)
        insurance.raw_eligibility_response = verification_data
        insurance.last_verification_attempt = datetime.utcnow()
        
        db.commit()
        
        return {
            'success': True,
            'eligible': verification_data.get('eligible', False),
            'message': verification_data.get('message', '')
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying verification: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
