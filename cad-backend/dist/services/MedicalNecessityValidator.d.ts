import { TransportType, Incident, CreateMedicalNecessityRequest, MedicalNecessityEvidence } from '../types';
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    evidence?: Partial<MedicalNecessityEvidence>;
}
export declare class MedicalNecessityValidator {
    private static readonly BARIATRIC_WEIGHT_THRESHOLD_LBS;
    private static readonly HEMS_MIN_DISTANCE_MILES;
    private static readonly HEMS_TIME_SAVE_THRESHOLD_MIN;
    private static readonly MIN_WIND_SPEED_UNSAFE_MPH;
    private static readonly MIN_VISIBILITY_MILES;
    /**
     * Validate medical necessity for all transport types
     */
    validate(transportType: TransportType, incident: Partial<Incident>, medicalNecessityRequest?: CreateMedicalNecessityRequest): Promise<ValidationResult>;
    /**
     * Validate IFT (Interfacility Transfer) - Basic validation
     */
    private validateIFT;
    /**
     * Validate CCT (Critical Care Transport) - Requires physician order
     */
    private validateCCT;
    /**
     * Validate Bariatric Transport - Weight thresholds
     */
    private validateBariatric;
    /**
     * Validate HEMS (Helicopter EMS) - Distance, acuity, weather
     */
    private validateHEMS;
    /**
     * Validate weather conditions for HEMS
     */
    private validateWeatherForHEMS;
    /**
     * Validate basic BLS/ALS transport
     */
    private validateBasicTransport;
    /**
     * Generate medical necessity narrative from evidence
     */
    generateNarrative(evidence: Partial<MedicalNecessityEvidence>): string;
}
//# sourceMappingURL=MedicalNecessityValidator.d.ts.map