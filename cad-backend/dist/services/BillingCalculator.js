"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingCalculator = void 0;
class BillingCalculator {
    /**
     * Calculate all charges for a transport
     */
    async calculateCharges(params) {
        const breakdown = [];
        // Base ambulance fee
        const baseAmbulanceFee = params.organization.base_ambulance_rate || 0;
        if (baseAmbulanceFee > 0) {
            breakdown.push({
                item: 'Base Ambulance Fee',
                description: `${params.incident.transport_type} transport`,
                amount: baseAmbulanceFee
            });
        }
        // Mileage charges
        const mileageRate = params.organization.mileage_rate || 0;
        const mileageCharge = params.mileageMiles * mileageRate;
        if (mileageCharge > 0) {
            breakdown.push({
                item: 'Mileage',
                description: `${params.mileageMiles.toFixed(1)} miles @ $${mileageRate.toFixed(2)}/mile`,
                amount: mileageCharge,
                quantity: params.mileageMiles,
                unitPrice: mileageRate
            });
        }
        // EMT/Paramedic surcharge
        let emtParamedicSurcharge = 0;
        if (params.unit?.crew_credentials?.has_paramedic || params.incident.crew_requirements?.requires_paramedic) {
            emtParamedicSurcharge = params.organization.paramedic_surcharge || 0;
            if (emtParamedicSurcharge > 0) {
                breakdown.push({
                    item: 'Paramedic Surcharge',
                    description: 'Advanced Life Support provider',
                    amount: emtParamedicSurcharge
                });
            }
        }
        // CCT surcharge
        let cctServiceSurcharge = 0;
        if (params.incident.transport_type === 'CCT') {
            cctServiceSurcharge = params.organization.cct_surcharge || 0;
            if (cctServiceSurcharge > 0) {
                breakdown.push({
                    item: 'Critical Care Transport Surcharge',
                    description: 'CCT-level care',
                    amount: cctServiceSurcharge
                });
            }
        }
        // Bariatric surcharge
        let bariatricSurcharge = 0;
        if (params.incident.transport_type === 'BARIATRIC' || params.incident.crew_requirements?.requires_bariatric) {
            bariatricSurcharge = params.organization.bariatric_surcharge || 0;
            if (bariatricSurcharge > 0) {
                breakdown.push({
                    item: 'Bariatric Surcharge',
                    description: 'Bariatric equipment and specialized crew',
                    amount: bariatricSurcharge
                });
            }
        }
        // HEMS charge
        let hemsCharge = 0;
        if (params.incident.transport_type === 'HEMS') {
            hemsCharge = params.organization.hems_charge || 0;
            if (hemsCharge > 0) {
                breakdown.push({
                    item: 'HEMS Transport',
                    description: 'Helicopter Emergency Medical Services',
                    amount: hemsCharge
                });
            }
        }
        // Night surcharge
        let nightSurcharge = 0;
        if (params.isNightTransport) {
            const baseAmount = baseAmbulanceFee + mileageCharge;
            nightSurcharge = baseAmount * BillingCalculator.NIGHT_SURCHARGE_PCT;
            if (nightSurcharge > 0) {
                breakdown.push({
                    item: 'Night Surcharge',
                    description: `${(BillingCalculator.NIGHT_SURCHARGE_PCT * 100).toFixed(0)}% surcharge for night transport`,
                    amount: nightSurcharge
                });
            }
        }
        // Holiday surcharge
        let holidaySurcharge = 0;
        if (params.isHoliday) {
            const baseAmount = baseAmbulanceFee + mileageCharge;
            holidaySurcharge = baseAmount * BillingCalculator.HOLIDAY_SURCHARGE_PCT;
            if (holidaySurcharge > 0) {
                breakdown.push({
                    item: 'Holiday Surcharge',
                    description: `${(BillingCalculator.HOLIDAY_SURCHARGE_PCT * 100).toFixed(0)}% surcharge for holiday transport`,
                    amount: holidaySurcharge
                });
            }
        }
        // Time-based charge (for long transports)
        let timeBasedCharge = 0;
        if (params.transportDurationMinutes) {
            const hours = params.transportDurationMinutes / 60;
            // Only charge for time over 1 hour
            if (hours > 1) {
                const chargeableHours = hours - 1;
                timeBasedCharge = chargeableHours * BillingCalculator.HOURLY_RATE;
                breakdown.push({
                    item: 'Extended Transport Time',
                    description: `${chargeableHours.toFixed(2)} hours @ $${BillingCalculator.HOURLY_RATE}/hour`,
                    amount: timeBasedCharge,
                    quantity: chargeableHours,
                    unitPrice: BillingCalculator.HOURLY_RATE
                });
            }
        }
        // Procedure charges
        let procedureCharges = 0;
        if (params.procedures && params.procedures.length > 0) {
            for (const proc of params.procedures) {
                const charge = (proc.charge || 0) * (proc.quantity || 1);
                procedureCharges += charge;
                breakdown.push({
                    item: `Procedure: ${proc.code}`,
                    description: proc.description,
                    amount: charge,
                    quantity: proc.quantity,
                    unitPrice: proc.charge
                });
            }
        }
        // Telnyx communication costs
        let telnyxVoiceCost = 0;
        if (params.telnyxVoiceMinutes) {
            telnyxVoiceCost = params.telnyxVoiceMinutes * BillingCalculator.DEFAULT_TELNYX_VOICE_RATE;
            breakdown.push({
                item: 'Telnyx Voice Calls',
                description: `${params.telnyxVoiceMinutes.toFixed(1)} minutes`,
                amount: telnyxVoiceCost,
                quantity: params.telnyxVoiceMinutes,
                unitPrice: BillingCalculator.DEFAULT_TELNYX_VOICE_RATE
            });
        }
        let telnyxSmsCost = 0;
        if (params.telnyxSmsCount) {
            telnyxSmsCost = params.telnyxSmsCount * BillingCalculator.DEFAULT_TELNYX_SMS_RATE;
            breakdown.push({
                item: 'Telnyx SMS Messages',
                description: `${params.telnyxSmsCount} messages`,
                amount: telnyxSmsCost,
                quantity: params.telnyxSmsCount,
                unitPrice: BillingCalculator.DEFAULT_TELNYX_SMS_RATE
            });
        }
        // Calculate subtotal and total
        const subtotal = baseAmbulanceFee +
            mileageCharge +
            emtParamedicSurcharge +
            cctServiceSurcharge +
            bariatricSurcharge +
            hemsCharge +
            nightSurcharge +
            holidaySurcharge +
            timeBasedCharge +
            procedureCharges;
        const totalCharge = subtotal + telnyxVoiceCost + telnyxSmsCost;
        return {
            baseAmbulanceFee,
            mileageCharge,
            emtParamedicSurcharge,
            cctServiceSurcharge,
            bariatricSurcharge,
            hemsCharge,
            nightSurcharge,
            holidaySurcharge,
            timeBasedCharge,
            procedureCharges,
            telnyxVoiceCost,
            telnyxSmsCost,
            subtotal,
            totalCharge,
            breakdown
        };
    }
    /**
     * Process insurance and calculate patient responsibility
     */
    async processInsurance(incident, totalCharge) {
        const missingFields = [];
        let claimReady = true;
        // Validate primary insurance
        const primaryInsurance = incident.insurance_primary;
        if (!primaryInsurance) {
            missingFields.push('Primary insurance information required');
            claimReady = false;
        }
        else {
            if (!primaryInsurance.carrier) {
                missingFields.push('Insurance carrier name');
                claimReady = false;
            }
            if (!primaryInsurance.policy_number) {
                missingFields.push('Insurance policy number');
                claimReady = false;
            }
            if (!primaryInsurance.subscriber_name) {
                missingFields.push('Insurance subscriber name');
                claimReady = false;
            }
            if (!primaryInsurance.subscriber_dob) {
                missingFields.push('Insurance subscriber date of birth');
                claimReady = false;
            }
        }
        // Estimate coverage (simplified - in production, would integrate with eligibility verification)
        let estimatedCoverage = 0;
        let patientResponsibility = totalCharge;
        if (primaryInsurance) {
            // Simple estimation: assume 80% coverage for primary
            estimatedCoverage = totalCharge * 0.80;
            patientResponsibility = totalCharge - estimatedCoverage;
            // If secondary insurance exists, estimate additional coverage
            if (incident.insurance_secondary) {
                // Secondary typically covers 50% of remaining balance
                const secondaryCoverage = patientResponsibility * 0.50;
                estimatedCoverage += secondaryCoverage;
                patientResponsibility -= secondaryCoverage;
            }
        }
        // Round to 2 decimal places
        estimatedCoverage = Math.round(estimatedCoverage * 100) / 100;
        patientResponsibility = Math.round(patientResponsibility * 100) / 100;
        return {
            primaryInsurance,
            secondaryInsurance: incident.insurance_secondary,
            estimatedCoverage,
            patientResponsibility,
            claimReady,
            missingFields
        };
    }
    /**
     * Create complete charge record
     */
    async createChargeRecord(params, calculation, insuranceResult) {
        return {
            incident_id: params.incident.id,
            base_ambulance_fee: calculation.baseAmbulanceFee,
            mileage_miles: params.mileageMiles,
            mileage_rate_per_mile: params.organization.mileage_rate,
            mileage_charge: calculation.mileageCharge,
            emt_paramedic_surcharge: calculation.emtParamedicSurcharge,
            cct_service_surcharge: calculation.cctServiceSurcharge,
            bariatric_surcharge: calculation.bariatricSurcharge,
            hems_charge: calculation.hemsCharge,
            night_surcharge: calculation.nightSurcharge,
            holiday_surcharge: calculation.holidaySurcharge,
            transport_duration_minutes: params.transportDurationMinutes,
            hourly_rate: BillingCalculator.HOURLY_RATE,
            time_based_charge: calculation.timeBasedCharge,
            procedures: params.procedures,
            subtotal: calculation.subtotal,
            insurance_primary: insuranceResult.primaryInsurance,
            insurance_secondary: insuranceResult.secondaryInsurance,
            insurance_payment_expected: insuranceResult.estimatedCoverage,
            patient_responsibility: insuranceResult.patientResponsibility,
            telnyx_voice_call_minutes: params.telnyxVoiceMinutes,
            telnyx_voice_call_cost: calculation.telnyxVoiceCost,
            telnyx_sms_count: params.telnyxSmsCount,
            telnyx_sms_cost: calculation.telnyxSmsCost,
            total_charge: calculation.totalCharge,
            billing_status: insuranceResult.claimReady ? 'READY' : 'DRAFT',
            organization_id: params.organization.id,
            locked: false
        };
    }
    /**
     * Determine if transport occurred during night hours
     */
    isNightTransport(timestamp, timezone = 'America/New_York') {
        const hour = new Date(timestamp).getHours();
        // Night hours: 8 PM to 6 AM
        return hour >= 20 || hour < 6;
    }
    /**
     * Determine if transport occurred on a holiday
     */
    isHoliday(date) {
        // US Federal Holidays (simplified)
        const holidays = [
            '01-01', // New Year's Day
            '07-04', // Independence Day
            '12-25', // Christmas
            // Add more as needed
        ];
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${month}-${day}`;
        return holidays.includes(dateStr);
    }
    /**
     * Format charge breakdown as human-readable text
     */
    formatChargeBreakdown(calculation) {
        const lines = [
            'CHARGE BREAKDOWN',
            '='.repeat(50),
            ''
        ];
        for (const item of calculation.breakdown) {
            const amount = `$${item.amount.toFixed(2)}`;
            const description = item.description ? ` - ${item.description}` : '';
            lines.push(`${item.item.padEnd(30)} ${amount.padStart(10)}${description}`);
        }
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push(`${'SUBTOTAL'.padEnd(30)} $${calculation.subtotal.toFixed(2).padStart(10)}`);
        if (calculation.telnyxVoiceCost > 0 || calculation.telnyxSmsCost > 0) {
            const commCosts = calculation.telnyxVoiceCost + calculation.telnyxSmsCost;
            lines.push(`${'Communication Costs'.padEnd(30)} $${commCosts.toFixed(2).padStart(10)}`);
        }
        lines.push('='.repeat(50));
        lines.push(`${'TOTAL CHARGE'.padEnd(30)} $${calculation.totalCharge.toFixed(2).padStart(10)}`);
        return lines.join('\n');
    }
    /**
     * Validate charge calculation
     */
    validateCharges(calculation) {
        const errors = [];
        if (calculation.totalCharge <= 0) {
            errors.push('Total charge must be greater than zero');
        }
        if (calculation.baseAmbulanceFee < 0) {
            errors.push('Base ambulance fee cannot be negative');
        }
        if (calculation.mileageCharge < 0) {
            errors.push('Mileage charge cannot be negative');
        }
        // Verify calculation integrity
        const calculatedSubtotal = calculation.baseAmbulanceFee +
            calculation.mileageCharge +
            calculation.emtParamedicSurcharge +
            calculation.cctServiceSurcharge +
            calculation.bariatricSurcharge +
            calculation.hemsCharge +
            calculation.nightSurcharge +
            calculation.holidaySurcharge +
            calculation.timeBasedCharge +
            calculation.procedureCharges;
        const diff = Math.abs(calculatedSubtotal - calculation.subtotal);
        if (diff > 0.01) {
            errors.push('Subtotal calculation mismatch');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.BillingCalculator = BillingCalculator;
// Telnyx default rates (can be overridden by organization config)
BillingCalculator.DEFAULT_TELNYX_VOICE_RATE = 0.0575; // per minute
BillingCalculator.DEFAULT_TELNYX_SMS_RATE = 0.0075; // per message
// Time-based surcharge rates
BillingCalculator.NIGHT_SURCHARGE_PCT = 0.15; // 15% surcharge
BillingCalculator.HOLIDAY_SURCHARGE_PCT = 0.20; // 20% surcharge
// Time-based billing rate (per hour)
BillingCalculator.HOURLY_RATE = 50;
//# sourceMappingURL=BillingCalculator.js.map