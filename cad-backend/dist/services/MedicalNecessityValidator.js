"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalNecessityValidator = void 0;
class MedicalNecessityValidator {
    /**
     * Validate medical necessity for all transport types
     */
    async validate(transportType, incident, medicalNecessityRequest) {
        switch (transportType) {
            case 'IFT':
                return this.validateIFT(incident, medicalNecessityRequest);
            case 'CCT':
                return this.validateCCT(incident, medicalNecessityRequest);
            case 'BARIATRIC':
                return this.validateBariatric(incident, medicalNecessityRequest);
            case 'HEMS':
                return this.validateHEMS(incident, medicalNecessityRequest);
            case 'BLS':
            case 'ALS':
                return this.validateBasicTransport(incident);
            default:
                return {
                    isValid: false,
                    errors: [`Unknown transport type: ${transportType}`],
                    warnings: []
                };
        }
    }
    /**
     * Validate IFT (Interfacility Transfer) - Basic validation
     */
    validateIFT(incident, request) {
        const errors = [];
        const warnings = [];
        // IFT requires basic justification
        if (!incident.medical_necessity_reason && !request?.ift_justification) {
            errors.push('IFT transport requires medical necessity justification');
        }
        // Validate basic patient information
        if (!incident.patient_first_name || !incident.patient_last_name) {
            errors.push('Patient name is required for IFT');
        }
        if (!incident.origin_facility_id) {
            errors.push('Origin facility is required for IFT');
        }
        if (!incident.destination_facility_id) {
            errors.push('Destination facility is required for IFT');
        }
        // Validate chief complaint or diagnosis
        if (!incident.chief_complaint && !incident.diagnosis) {
            warnings.push('Chief complaint or diagnosis recommended for IFT documentation');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            evidence: {
                transport_type: 'IFT',
                ift_justification: request?.ift_justification || incident.medical_necessity_reason,
                justification_narrative: request?.justification_narrative
            }
        };
    }
    /**
     * Validate CCT (Critical Care Transport) - Requires physician order
     */
    validateCCT(incident, request) {
        const errors = [];
        const warnings = [];
        // CCT MUST have physician order
        if (!incident.physician_order_ref && !request?.cct_physician_order_ref) {
            errors.push('CCT transport requires physician order reference');
        }
        if (!incident.ordering_physician_name && !request?.cct_physician_name) {
            errors.push('Ordering physician name is required for CCT');
        }
        if (!request?.cct_physician_credentials) {
            warnings.push('Physician credentials recommended for CCT documentation');
        }
        // Validate CCT interventions
        if (!request?.cct_interventions && !incident.cct_order_details) {
            errors.push('CCT requires documentation of interventions (drips, ventilator, etc.)');
        }
        // Check for critical interventions
        if (request?.cct_interventions) {
            const hasInterventions = request.cct_interventions.mechanical_ventilation ||
                request.cct_interventions.balloon_pump ||
                (request.cct_interventions.continuous_drips && request.cct_interventions.continuous_drips.length > 0) ||
                (request.cct_interventions.other && request.cct_interventions.other.length > 0);
            if (!hasInterventions) {
                warnings.push('No critical interventions documented for CCT transport');
            }
        }
        // Validate hemodynamic issues
        if (request?.cct_hemodynamic_issues) {
            const hasHemodynamicIssues = request.cct_hemodynamic_issues.unstable_vitals ||
                request.cct_hemodynamic_issues.cardiac_monitoring_required ||
                request.cct_hemodynamic_issues.vasoactive_drips;
            if (!hasHemodynamicIssues) {
                warnings.push('No hemodynamic issues documented - verify CCT level is necessary');
            }
        }
        // Validate crew requirements
        if (incident.crew_requirements) {
            if (!incident.crew_requirements.requires_cct) {
                errors.push('CCT transport requires CCT-certified crew');
            }
        }
        else {
            errors.push('Crew requirements must specify CCT certification');
        }
        // Check for complex diagnosis
        if (!request?.cct_complex_diagnosis && !incident.diagnosis) {
            warnings.push('Complex diagnosis or ICD-10 codes recommended for CCT');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            evidence: {
                transport_type: 'CCT',
                cct_physician_order_ref: request?.cct_physician_order_ref || incident.physician_order_ref,
                cct_physician_name: request?.cct_physician_name || incident.ordering_physician_name,
                cct_physician_credentials: request?.cct_physician_credentials || incident.ordering_physician_credentials,
                cct_hemodynamic_issues: request?.cct_hemodynamic_issues,
                cct_interventions: request?.cct_interventions,
                cct_complex_diagnosis: request?.cct_complex_diagnosis,
                justification_narrative: request?.justification_narrative
            }
        };
    }
    /**
     * Validate Bariatric Transport - Weight thresholds
     */
    validateBariatric(incident, request) {
        const errors = [];
        const warnings = [];
        const patientWeight = incident.patient_weight_lbs || request?.bariatric_weight_lbs;
        // Bariatric requires weight documentation
        if (!patientWeight) {
            errors.push('Bariatric transport requires patient weight documentation');
        }
        else if (patientWeight < MedicalNecessityValidator.BARIATRIC_WEIGHT_THRESHOLD_LBS) {
            warnings.push(`Patient weight (${patientWeight} lbs) is below bariatric threshold (${MedicalNecessityValidator.BARIATRIC_WEIGHT_THRESHOLD_LBS} lbs). Verify bariatric transport is necessary.`);
        }
        // Validate bariatric equipment requirements
        if (!request?.bariatric_equipment_required) {
            warnings.push('Bariatric equipment requirements should be documented');
        }
        else {
            const hasEquipment = request.bariatric_equipment_required.bariatric_stretcher ||
                request.bariatric_equipment_required.lift_equipment ||
                request.bariatric_equipment_required.extra_personnel ||
                request.bariatric_equipment_required.specialized_ambulance;
            if (!hasEquipment) {
                warnings.push('No specialized equipment documented for bariatric transport');
            }
        }
        // Validate crew requirements
        if (incident.crew_requirements) {
            if (!incident.crew_requirements.requires_bariatric) {
                warnings.push('Crew requirements should specify bariatric capability');
            }
        }
        // Check for mobility issues
        if (!request?.bariatric_mobility_issues) {
            warnings.push('Mobility issues should be documented for bariatric patients');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            evidence: {
                transport_type: 'BARIATRIC',
                bariatric_weight_lbs: patientWeight,
                bariatric_mobility_issues: request?.bariatric_mobility_issues,
                bariatric_equipment_required: request?.bariatric_equipment_required,
                justification_narrative: request?.justification_narrative
            }
        };
    }
    /**
     * Validate HEMS (Helicopter EMS) - Distance, acuity, weather
     */
    validateHEMS(incident, request) {
        const errors = [];
        const warnings = [];
        // Validate distance requirements
        if (!request?.hems_distance_miles) {
            errors.push('HEMS transport requires distance calculation');
        }
        else if (request.hems_distance_miles < MedicalNecessityValidator.HEMS_MIN_DISTANCE_MILES) {
            warnings.push(`Distance (${request.hems_distance_miles} miles) is below typical HEMS threshold (${MedicalNecessityValidator.HEMS_MIN_DISTANCE_MILES} miles). Verify medical necessity.`);
        }
        // Validate time saved calculation
        if (request?.hems_ground_eta_minutes && request?.hems_air_eta_minutes) {
            const timeSaved = request.hems_ground_eta_minutes - request.hems_air_eta_minutes;
            if (timeSaved < MedicalNecessityValidator.HEMS_TIME_SAVE_THRESHOLD_MIN) {
                warnings.push(`Time saved (${timeSaved} min) is below threshold (${MedicalNecessityValidator.HEMS_TIME_SAVE_THRESHOLD_MIN} min). Consider ground transport.`);
            }
        }
        else {
            errors.push('HEMS transport requires ground and air ETA comparison');
        }
        // Validate acuity level
        if (!incident.acuity_level || incident.acuity_level === 'ROUTINE') {
            warnings.push('HEMS typically requires CRITICAL or URGENT acuity level');
        }
        if (!request?.hems_acuity_justification) {
            errors.push('HEMS transport requires acuity justification');
        }
        // Validate weather conditions
        const weatherResult = this.validateWeatherForHEMS(request?.hems_weather_conditions);
        errors.push(...weatherResult.errors);
        warnings.push(...weatherResult.warnings);
        // Medical justification code
        if (!request?.hems_medical_justification_code) {
            warnings.push('HEMS medical justification code recommended for billing');
        }
        // Check crew requirements
        if (incident.crew_requirements && !incident.crew_requirements.specialty_skills?.includes('FLIGHT_PARAMEDIC')) {
            warnings.push('HEMS transport requires flight paramedic qualification');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            evidence: {
                transport_type: 'HEMS',
                hems_distance_miles: request?.hems_distance_miles,
                hems_ground_eta_minutes: request?.hems_ground_eta_minutes,
                hems_air_eta_minutes: request?.hems_air_eta_minutes,
                hems_time_saved_minutes: request?.hems_ground_eta_minutes && request?.hems_air_eta_minutes
                    ? request.hems_ground_eta_minutes - request.hems_air_eta_minutes
                    : undefined,
                hems_acuity_justification: request?.hems_acuity_justification,
                hems_weather_conditions: request?.hems_weather_conditions,
                hems_weather_suitable: weatherResult.isWeatherSuitable,
                hems_medical_justification_code: request?.hems_medical_justification_code,
                justification_narrative: request?.justification_narrative
            }
        };
    }
    /**
     * Validate weather conditions for HEMS
     */
    validateWeatherForHEMS(weather) {
        const errors = [];
        const warnings = [];
        let isWeatherSuitable = true;
        if (!weather) {
            errors.push('HEMS transport requires weather conditions assessment');
            return { errors, warnings, isWeatherSuitable: false };
        }
        // Check wind speed
        if (weather.wind_speed_mph !== undefined) {
            if (weather.wind_speed_mph > MedicalNecessityValidator.MIN_WIND_SPEED_UNSAFE_MPH) {
                errors.push(`Wind speed (${weather.wind_speed_mph} mph) exceeds safe threshold for flight (${MedicalNecessityValidator.MIN_WIND_SPEED_UNSAFE_MPH} mph)`);
                isWeatherSuitable = false;
            }
        }
        // Check visibility
        if (weather.visibility_miles !== undefined) {
            if (weather.visibility_miles < MedicalNecessityValidator.MIN_VISIBILITY_MILES) {
                errors.push(`Visibility (${weather.visibility_miles} miles) is below minimum safe threshold (${MedicalNecessityValidator.MIN_VISIBILITY_MILES} miles)`);
                isWeatherSuitable = false;
            }
        }
        // Check explicit safe for flight flag
        if (weather.safe_for_flight === false) {
            errors.push('Weather conditions marked as unsafe for flight');
            isWeatherSuitable = false;
        }
        // Check for adverse conditions
        if (weather.conditions) {
            const adverseConditions = ['thunderstorm', 'heavy rain', 'snow', 'ice', 'fog'];
            const lowerConditions = weather.conditions.toLowerCase();
            const hasAdverse = adverseConditions.some(cond => lowerConditions.includes(cond));
            if (hasAdverse) {
                warnings.push(`Adverse weather conditions detected: ${weather.conditions}. Verify flight safety.`);
            }
        }
        return { errors, warnings, isWeatherSuitable };
    }
    /**
     * Validate basic BLS/ALS transport
     */
    validateBasicTransport(incident) {
        const errors = [];
        const warnings = [];
        if (!incident.patient_first_name || !incident.patient_last_name) {
            errors.push('Patient name is required');
        }
        if (!incident.origin_facility_id) {
            errors.push('Origin facility is required');
        }
        if (!incident.destination_facility_id) {
            errors.push('Destination facility is required');
        }
        if (!incident.chief_complaint && !incident.diagnosis) {
            warnings.push('Chief complaint or diagnosis recommended');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Generate medical necessity narrative from evidence
     */
    generateNarrative(evidence) {
        const parts = [];
        switch (evidence.transport_type) {
            case 'IFT':
                parts.push('Interfacility Transfer:');
                if (evidence.ift_justification) {
                    parts.push(evidence.ift_justification);
                }
                break;
            case 'CCT':
                parts.push('Critical Care Transport:');
                if (evidence.cct_physician_name) {
                    parts.push(`Ordered by ${evidence.cct_physician_name} ${evidence.cct_physician_credentials || ''}`);
                }
                if (evidence.cct_interventions) {
                    const interventions = [];
                    if (evidence.cct_interventions.mechanical_ventilation)
                        interventions.push('mechanical ventilation');
                    if (evidence.cct_interventions.balloon_pump)
                        interventions.push('balloon pump');
                    if (evidence.cct_interventions.continuous_drips) {
                        interventions.push(`drips: ${evidence.cct_interventions.continuous_drips.join(', ')}`);
                    }
                    if (interventions.length > 0) {
                        parts.push(`Requiring: ${interventions.join(', ')}`);
                    }
                }
                break;
            case 'BARIATRIC':
                parts.push('Bariatric Transport:');
                if (evidence.bariatric_weight_lbs) {
                    parts.push(`Patient weight: ${evidence.bariatric_weight_lbs} lbs`);
                }
                if (evidence.bariatric_mobility_issues) {
                    parts.push(`Mobility: ${evidence.bariatric_mobility_issues}`);
                }
                break;
            case 'HEMS':
                parts.push('Helicopter EMS Transport:');
                if (evidence.hems_distance_miles) {
                    parts.push(`Distance: ${evidence.hems_distance_miles} miles`);
                }
                if (evidence.hems_time_saved_minutes) {
                    parts.push(`Time saved: ${evidence.hems_time_saved_minutes} minutes`);
                }
                if (evidence.hems_acuity_justification) {
                    parts.push(evidence.hems_acuity_justification);
                }
                break;
        }
        if (evidence.justification_narrative) {
            parts.push(evidence.justification_narrative);
        }
        return parts.join(' ');
    }
}
exports.MedicalNecessityValidator = MedicalNecessityValidator;
MedicalNecessityValidator.BARIATRIC_WEIGHT_THRESHOLD_LBS = 350;
MedicalNecessityValidator.HEMS_MIN_DISTANCE_MILES = 50;
MedicalNecessityValidator.HEMS_TIME_SAVE_THRESHOLD_MIN = 30;
MedicalNecessityValidator.MIN_WIND_SPEED_UNSAFE_MPH = 35;
MedicalNecessityValidator.MIN_VISIBILITY_MILES = 3;
//# sourceMappingURL=MedicalNecessityValidator.js.map