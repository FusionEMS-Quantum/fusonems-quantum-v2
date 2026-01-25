import logging
from typing import Dict, List, Any, Optional
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)


class NEMSISElement(str, Enum):
    """NEMSIS v3.5 core elements"""
    # Cardiac/Vitals
    HEART_RATE = "Vital_HeartRate"
    SYSTOLIC_BP = "Vital_SystolicBloodPressure"
    DIASTOLIC_BP = "Vital_DiastolicBloodPressure"
    OXYGEN_SAT = "Vital_PulseOxymetry"
    RESPIRATORY_RATE = "Vital_RespiratoryRate"
    TEMPERATURE = "Vital_Temperature"
    GLUCOSE = "Vital_BloodGlucose"
    
    # ECG/Rhythm
    INITIAL_RHYTHM = "Cardiac_InitialRhythm"
    DEFIBRILLATION_COUNT = "Cardiac_DefibCount"
    CARDIAC_ARREST_RHYTHM = "Cardiac_ArrestRhythm"
    
    # Medications
    MEDICATION_GIVEN = "Medication_Administered"
    MEDICATION_DOSAGE = "Medication_Dosage"
    MEDICATION_ROUTE = "Medication_Route"
    MEDICATION_TIME = "Medication_AdministrationTime"
    
    # Procedures
    PROCEDURE_PERFORMED = "Procedure_Performed"
    PROCEDURE_TIME = "Procedure_Time"
    
    # Respiratory Support
    AIRWAY_INTERVENTION = "Airway_Intervention"
    VENTILATION_MODE = "Ventilation_Mode"
    VENTILATION_RATE = "Ventilation_Rate"
    TIDAL_VOLUME = "Ventilation_TidalVolume"
    PEEP = "Ventilation_PEEP"
    FIO2 = "Ventilation_FiO2"
    
    # Blood/Transfusion
    TRANSFUSION_BLOOD_TYPE = "Transfusion_BloodType"
    TRANSFUSION_PRODUCT = "Transfusion_ProductType"
    TRANSFUSION_TIME = "Transfusion_AdminTime"
    

class NEMSISMapper:
    """
    Map OCR extracted data to NEMSIS v3.5 elements
    No vendor integration needed — all data comes from OCR
    """
    
    @staticmethod
    def map_cardiac_monitor(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map cardiac monitor OCR → NEMSIS vital signs + rhythm
        """
        nemsis_data = {}
        
        if not ocr_result.get('fields'):
            logger.warning("No fields in cardiac monitor OCR result")
            return nemsis_data
        
        for field in ocr_result['fields']:
            name = field.get('name', '').lower()
            value = field.get('value')
            confidence = field.get('confidence', 0)
            
            # Only map high-confidence values (>80%)
            if confidence < 80:
                logger.warning(f"Skipping low-confidence field: {name} ({confidence}%)")
                continue
            
            if name == 'heart_rate':
                nemsis_data[NEMSISElement.HEART_RATE] = {
                    'value': value,
                    'unit': 'bpm',
                    'confidence': confidence,
                    'source': 'ocr_cardiac_monitor',
                    'timestamp': datetime.utcnow().isoformat(),
                }
            
            elif name == 'systolic_bp':
                nemsis_data[NEMSISElement.SYSTOLIC_BP] = {
                    'value': value,
                    'unit': 'mmHg',
                    'confidence': confidence,
                    'source': 'ocr_cardiac_monitor',
                }
            
            elif name == 'diastolic_bp':
                nemsis_data[NEMSISElement.DIASTOLIC_BP] = {
                    'value': value,
                    'unit': 'mmHg',
                    'confidence': confidence,
                    'source': 'ocr_cardiac_monitor',
                }
            
            elif name == 'spo2':
                nemsis_data[NEMSISElement.OXYGEN_SAT] = {
                    'value': value,
                    'unit': '%',
                    'confidence': confidence,
                    'source': 'ocr_cardiac_monitor',
                }
            
            elif name == 'respiratory_rate':
                nemsis_data[NEMSISElement.RESPIRATORY_RATE] = {
                    'value': value,
                    'unit': 'bpm',
                    'confidence': confidence,
                    'source': 'ocr_cardiac_monitor',
                }
        
        # Map rhythm
        if ocr_result.get('rhythm'):
            rhythm = ocr_result['rhythm']
            nemsis_data[NEMSISElement.INITIAL_RHYTHM] = {
                'value': rhythm.get('type', 'Unknown'),
                'confidence': rhythm.get('confidence', 0),
                'source': 'ocr_cardiac_monitor',
                'timestamp': datetime.utcnow().isoformat(),
            }
        
        return nemsis_data

    @staticmethod
    def map_ventilator(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map ventilator OCR → NEMSIS respiratory support elements
        """
        nemsis_data = {}
        
        if ocr_result.get('mode'):
            nemsis_data[NEMSISElement.VENTILATION_MODE] = {
                'value': ocr_result['mode'],
                'source': 'ocr_ventilator',
            }
        
        if not ocr_result.get('settings'):
            return nemsis_data
        
        for setting in ocr_result['settings']:
            name = setting.get('name', '').lower()
            value = setting.get('value')
            confidence = setting.get('confidence', 0)
            unit = setting.get('unit', '')
            
            if confidence < 85:  # Higher threshold for vent settings (more critical)
                logger.warning(f"Skipping low-confidence vent setting: {name} ({confidence}%)")
                continue
            
            if name == 'tidal_volume':
                nemsis_data[NEMSISElement.TIDAL_VOLUME] = {
                    'value': value,
                    'unit': unit,
                    'confidence': confidence,
                    'source': 'ocr_ventilator',
                }
            
            elif name == 'respiratory_rate':
                nemsis_data[NEMSISElement.VENTILATION_RATE] = {
                    'value': value,
                    'unit': unit,
                    'confidence': confidence,
                    'source': 'ocr_ventilator',
                }
            
            elif name == 'fio2':
                nemsis_data[NEMSISElement.FIO2] = {
                    'value': value,
                    'unit': unit,
                    'confidence': confidence,
                    'source': 'ocr_ventilator',
                }
            
            elif name == 'peep':
                nemsis_data[NEMSISElement.PEEP] = {
                    'value': value,
                    'unit': unit,
                    'confidence': confidence,
                    'source': 'ocr_ventilator',
                }
        
        return nemsis_data

    @staticmethod
    def map_medication(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map medication label OCR → NEMSIS medication elements
        """
        nemsis_data = {}
        
        drug_name = ocr_result.get('drug_name', '')
        strength = ocr_result.get('strength', '')
        total_dose = ocr_result.get('total_dose', '')
        route = ocr_result.get('route', '').upper()
        
        if drug_name:
            nemsis_data[NEMSISElement.MEDICATION_GIVEN] = {
                'value': drug_name,
                'strength': strength,
                'source': 'ocr_medication_label',
                'timestamp': datetime.utcnow().isoformat(),
            }
            
            nemsis_data[NEMSISElement.MEDICATION_DOSAGE] = {
                'value': total_dose,
                'source': 'ocr_medication_label',
            }
            
            if route:
                route_mapping = {
                    'IV': 'Intravenous',
                    'IM': 'Intramuscular',
                    'SQ': 'Subcutaneous',
                    'PO': 'Per Mouth',
                    'NEB': 'Nebulized',
                    'ETT': 'Endotracheal',
                    'IO': 'Intraosseous',
                }
                nemsis_data[NEMSISElement.MEDICATION_ROUTE] = {
                    'value': route_mapping.get(route, route),
                    'source': 'ocr_medication_label',
                }
        
        return nemsis_data

    @staticmethod
    def map_blood_product(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map blood product label OCR → NEMSIS transfusion elements
        """
        nemsis_data = {}
        
        blood_type = ocr_result.get('blood_type')
        product_type = ocr_result.get('product_type')
        unit_id = ocr_result.get('unit_id')
        expiry_date = ocr_result.get('expiry_date')
        
        if blood_type:
            nemsis_data[NEMSISElement.TRANSFUSION_BLOOD_TYPE] = {
                'value': blood_type,
                'source': 'ocr_blood_product',
                'unit_id': unit_id,
                'expiry': expiry_date,
                'timestamp': datetime.utcnow().isoformat(),
            }
        
        if product_type:
            product_mapping = {
                'RBC': 'Red Blood Cells',
                'FFP': 'Fresh Frozen Plasma',
                'PLT': 'Platelets',
                'CRYO': 'Cryoprecipitate',
                'WB': 'Whole Blood',
            }
            nemsis_data[NEMSISElement.TRANSFUSION_PRODUCT] = {
                'value': product_mapping.get(product_type, product_type),
                'source': 'ocr_blood_product',
            }
        
        return nemsis_data

    @staticmethod
    def consolidate_all_ocr(
        ocr_results: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Consolidate all OCR results (cardiac, vent, meds, blood) into single NEMSIS payload
        """
        consolidated = {
            'data': {},
            'ocr_sources': [],
            'total_confidence': 0,
            'high_confidence_fields': 0,
            'low_confidence_warnings': [],
            'consolidation_timestamp': datetime.utcnow().isoformat(),
        }
        
        total_confidence = 0
        field_count = 0
        
        for ocr_result in ocr_results:
            device_type = ocr_result.get('device_type', '').lower()
            
            nemsis_data = {}
            
            if device_type == 'cardiac_monitor':
                nemsis_data = NEMSISMapper.map_cardiac_monitor(ocr_result)
            elif device_type == 'ventilator':
                nemsis_data = NEMSISMapper.map_ventilator(ocr_result)
            elif device_type == 'medication_label':
                nemsis_data = NEMSISMapper.map_medication(ocr_result)
            elif device_type == 'blood_product':
                nemsis_data = NEMSISMapper.map_blood_product(ocr_result)
            
            # Track confidence
            for element, data in nemsis_data.items():
                confidence = data.get('confidence', 0)
                total_confidence += confidence
                field_count += 1
                
                if confidence >= 90:
                    consolidated['high_confidence_fields'] += 1
                elif confidence < 80:
                    consolidated['low_confidence_warnings'].append({
                        'element': element.value,
                        'confidence': confidence,
                        'device': device_type,
                    })
            
            consolidated['data'].update(nemsis_data)
            consolidated['ocr_sources'].append(device_type)
        
        if field_count > 0:
            consolidated['total_confidence'] = round(total_confidence / field_count, 1)
        
        consolidated['field_count'] = field_count
        
        return consolidated

    @staticmethod
    def generate_nemsis_validation_report(consolidated: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate validation report for consolidated OCR → NEMSIS mapping
        """
        report = {
            'validation_timestamp': datetime.utcnow().isoformat(),
            'overall_confidence': consolidated['total_confidence'],
            'fields_mapped': consolidated['field_count'],
            'high_confidence_fields': consolidated['high_confidence_fields'],
            'low_confidence_warnings': consolidated['low_confidence_warnings'],
            'sources': list(set(consolidated['ocr_sources'])),
            'ready_for_submission': consolidated['total_confidence'] > 85 and len(consolidated['low_confidence_warnings']) == 0,
            'recommendation': '',
        }
        
        if report['ready_for_submission']:
            report['recommendation'] = 'OCR mapping is complete and high-confidence. Ready for chart submission.'
        elif consolidated['total_confidence'] > 75:
            report['recommendation'] = 'OCR mapping is mostly complete. Review low-confidence fields before submission.'
        else:
            report['recommendation'] = 'OCR mapping has confidence issues. Manual review required. Consider rescanning equipment screens.'
        
        return report
