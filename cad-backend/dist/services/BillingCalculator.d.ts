import { Incident, Unit, Organization, Charges, Insurance, ProcedureCode } from '../types';
export interface ChargeCalculation {
    baseAmbulanceFee: number;
    mileageCharge: number;
    emtParamedicSurcharge: number;
    cctServiceSurcharge: number;
    bariatricSurcharge: number;
    hemsCharge: number;
    nightSurcharge: number;
    holidaySurcharge: number;
    timeBasedCharge: number;
    procedureCharges: number;
    telnyxVoiceCost: number;
    telnyxSmsCost: number;
    subtotal: number;
    totalCharge: number;
    breakdown: ChargeLineItem[];
}
export interface ChargeLineItem {
    item: string;
    description?: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
}
export interface CalculateChargesParams {
    incident: Incident;
    unit?: Unit;
    organization: Organization;
    mileageMiles: number;
    transportDurationMinutes?: number;
    procedures?: ProcedureCode[];
    telnyxVoiceMinutes?: number;
    telnyxSmsCount?: number;
    isNightTransport?: boolean;
    isHoliday?: boolean;
}
export interface InsuranceProcessingResult {
    primaryInsurance?: Insurance;
    secondaryInsurance?: Insurance;
    estimatedCoverage: number;
    patientResponsibility: number;
    claimReady: boolean;
    missingFields: string[];
}
export declare class BillingCalculator {
    private static readonly DEFAULT_TELNYX_VOICE_RATE;
    private static readonly DEFAULT_TELNYX_SMS_RATE;
    private static readonly NIGHT_SURCHARGE_PCT;
    private static readonly HOLIDAY_SURCHARGE_PCT;
    private static readonly HOURLY_RATE;
    /**
     * Calculate all charges for a transport
     */
    calculateCharges(params: CalculateChargesParams): Promise<ChargeCalculation>;
    /**
     * Process insurance and calculate patient responsibility
     */
    processInsurance(incident: Incident, totalCharge: number): Promise<InsuranceProcessingResult>;
    /**
     * Create complete charge record
     */
    createChargeRecord(params: CalculateChargesParams, calculation: ChargeCalculation, insuranceResult: InsuranceProcessingResult): Promise<Partial<Charges>>;
    /**
     * Determine if transport occurred during night hours
     */
    isNightTransport(timestamp: Date, timezone?: string): boolean;
    /**
     * Determine if transport occurred on a holiday
     */
    isHoliday(date: Date): boolean;
    /**
     * Format charge breakdown as human-readable text
     */
    formatChargeBreakdown(calculation: ChargeCalculation): string;
    /**
     * Validate charge calculation
     */
    validateCharges(calculation: ChargeCalculation): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=BillingCalculator.d.ts.map