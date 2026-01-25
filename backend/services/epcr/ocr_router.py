from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List
import base64

from core.database import get_db
from core.security import get_current_user
from models.user import User
from services.epcr.equipment_screen_ocr import EquipmentScreenOCR, DeviceType
from services.epcr.nemsis_mapper import NEMSISMapper
from utils.logger import logger

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


class OCRRequest:
    def __init__(self, image_data: bytes, device_type: str):
        self.image_base64 = base64.b64encode(image_data).decode('utf-8')
        self.device_type = device_type


@router.post("/scan_device")
async def scan_device_screen(
    device_type: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Scan medical device screen (cardiac monitor, ventilator, med label, blood product)
    → extract data via OCR → return structured result + NEMSIS mapping
    
    Usage:
    ```
    curl -X POST http://localhost:8000/api/ocr/scan_device \
      -F "device_type=cardiac_monitor" \
      -F "image=@/path/to/monitor_screen.jpg"
    ```
    
    Response:
    ```json
    {
        "device_type": "cardiac_monitor",
        "ocr_result": {...OCR extracted data...},
        "nemsis_mapping": {...NEMSIS elements...},
        "validation_report": {...confidence scores...},
        "ocr_timestamp": "2025-01-25T12:34:56Z"
    }
    ```
    """
    try:
        # Validate device type
        try:
            device_type_enum = DeviceType(device_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid device_type. Must be one of: {[dt.value for dt in DeviceType]}"
            )
        
        # Read image
        image_data = await image.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        logger.info(f"User {current_user.id} scanning {device_type_enum} screen ({len(image_data)} bytes)")
        
        # Run OCR
        ocr_result = EquipmentScreenOCR.scan_device_screen(
            image_base64=image_base64,
            device_type=device_type_enum,
        )
        
        # Map to NEMSIS
        nemsis_mapping = {}
        if device_type_enum == DeviceType.CARDIAC_MONITOR:
            nemsis_mapping = NEMSISMapper.map_cardiac_monitor(ocr_result)
        elif device_type_enum == DeviceType.VENTILATOR:
            nemsis_mapping = NEMSISMapper.map_ventilator(ocr_result)
        elif device_type_enum == DeviceType.MEDICATION_LABEL:
            nemsis_mapping = NEMSISMapper.map_medication(ocr_result)
        elif device_type_enum == DeviceType.BLOOD_PRODUCT:
            nemsis_mapping = NEMSISMapper.map_blood_product(ocr_result)
        
        return {
            "device_type": device_type_enum.value,
            "ocr_result": ocr_result,
            "nemsis_mapping": nemsis_mapping,
            "field_count": len(nemsis_mapping),
            "ocr_timestamp": ocr_result.get('ocr_timestamp'),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR scan failed: {str(e)}")


@router.post("/consolidate_scans")
async def consolidate_all_ocr_scans(
    ocr_results: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Consolidate multiple device scans into unified NEMSIS payload
    → cardiac monitor + ventilator + meds + blood = single chart auto-population
    
    Usage:
    ```json
    POST /api/ocr/consolidate_scans
    {
        "ocr_results": [
            {...cardiac monitor OCR result...},
            {...ventilator OCR result...},
            {...medication OCR results...},
            {...blood product OCR result...}
        ]
    }
    ```
    
    Response:
    ```json
    {
        "consolidated_data": {...all NEMSIS elements...},
        "total_confidence": 89.5,
        "high_confidence_fields": 12,
        "low_confidence_warnings": [...],
        "validation_report": {...},
        "ready_for_submission": true
    }
    ```
    """
    try:
        logger.info(f"User {current_user.id} consolidating {len(ocr_results)} OCR scans")
        
        # Consolidate all OCR results
        consolidated = NEMSISMapper.consolidate_all_ocr(ocr_results)
        
        # Generate validation report
        validation_report = NEMSISMapper.generate_nemsis_validation_report(consolidated)
        
        return {
            "consolidated_data": consolidated['data'],
            "total_confidence": consolidated['total_confidence'],
            "field_count": consolidated['field_count'],
            "high_confidence_fields": consolidated['high_confidence_fields'],
            "low_confidence_warnings": consolidated['low_confidence_warnings'],
            "sources": consolidated['ocr_sources'],
            "validation_report": validation_report,
            "consolidation_timestamp": consolidated['consolidation_timestamp'],
        }
    
    except Exception as e:
        logger.error(f"Consolidation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Consolidation failed: {str(e)}")


@router.post("/auto_populate_patient")
async def auto_populate_patient_from_ocr(
    patient_id: int,
    ocr_results: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auto-populate patient ePCR from consolidated OCR results
    → vitals, medications, procedures, blood products, ventilator settings
    
    Usage:
    ```json
    POST /api/ocr/auto_populate_patient?patient_id=123
    {
        "ocr_results": [...]
    }
    ```
    
    Response:
    ```json
    {
        "patient_id": 123,
        "fields_populated": {
            "vitals": {...},
            "medications": [...],
            "blood_products": [...],
            "ventilator_settings": {...},
        },
        "confidence_summary": {...},
        "manual_review_required": true/false
    }
    ```
    """
    try:
        from models.epcr import Patient
        
        # Verify patient exists
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Consolidate OCR results
        consolidated = NEMSISMapper.consolidate_all_ocr(ocr_results)
        validation_report = NEMSISMapper.generate_nemsis_validation_report(consolidated)
        
        logger.info(f"User {current_user.id} auto-populating patient {patient_id} from OCR (confidence: {consolidated['total_confidence']}%)")
        
        # Map NEMSIS data to patient model fields
        fields_populated = {
            "vitals": {},
            "medications": [],
            "blood_products": [],
            "ventilator_settings": {},
        }
        
        for element, data in consolidated['data'].items():
            element_str = element.value if hasattr(element, 'value') else str(element)
            
            # Vitals
            if 'vital' in element_str.lower() or 'heart_rate' in element_str.lower():
                fields_populated['vitals'][element_str] = data
            
            # Medications
            elif 'medication' in element_str.lower():
                fields_populated['medications'].append({element_str: data})
            
            # Blood products
            elif 'transfusion' in element_str.lower():
                fields_populated['blood_products'].append({element_str: data})
            
            # Ventilator
            elif 'ventilation' in element_str.lower() or 'peep' in element_str.lower():
                fields_populated['ventilator_settings'][element_str] = data
        
        # Update patient record (store consolidated data as JSON)
        patient.ocr_snapshots = [
            {
                'timestamp': consolidated['consolidation_timestamp'],
                'data': consolidated['data'],
                'confidence': consolidated['total_confidence'],
                'sources': consolidated['ocr_sources'],
            }
        ]
        
        db.commit()
        
        return {
            "patient_id": patient_id,
            "fields_populated": fields_populated,
            "total_fields_mapped": consolidated['field_count'],
            "confidence_summary": {
                "overall": consolidated['total_confidence'],
                "high_confidence": consolidated['high_confidence_fields'],
                "low_confidence_warnings": len(consolidated['low_confidence_warnings']),
            },
            "validation_report": validation_report,
            "manual_review_required": not validation_report['ready_for_submission'],
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auto-populate failed: {e}")
        raise HTTPException(status_code=500, detail=f"Auto-populate failed: {str(e)}")
