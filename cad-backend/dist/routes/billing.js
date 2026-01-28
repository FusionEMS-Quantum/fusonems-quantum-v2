"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
const METERS_PER_MILE = 1609.344;
const parseMiles = (value) => {
    if (Array.isArray(value)) {
        value = value[0];
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return null;
};
const extractIncidentMileage = (incident) => {
    if (!incident) {
        return null;
    }
    const directKeys = [
        incident.mileage_miles,
        incident.distance_miles,
        incident.estimated_distance_miles,
        incident.routing_distance_miles,
    ];
    for (const key of directKeys) {
        const miles = parseMiles(key);
        if (miles !== null) {
            return miles;
        }
    }
    const meters = parseMiles(incident.distance_meters);
    if (meters !== null) {
        return meters / METERS_PER_MILE;
    }
    const vitals = incident.current_vitals || incident.vitals;
    const vitalsMiles = parseMiles(vitals?.transport_miles);
    if (vitalsMiles !== null) {
        return vitalsMiles;
    }
    return null;
};
const resolveRoutingMiles = (req, incident, override, bodyFields) => {
    const overrideMiles = parseMiles(override);
    if (overrideMiles !== null) {
        return Math.max(0, overrideMiles);
    }
    const queryMiles = parseMiles(req.query.routing_distance_miles ?? req.query.distance_miles);
    if (queryMiles !== null) {
        return Math.max(0, queryMiles);
    }
    if (bodyFields && req.body) {
        const bodyData = req.body;
        for (const field of bodyFields) {
            const bodyMiles = parseMiles(bodyData[field]);
            if (bodyMiles !== null) {
                return Math.max(0, bodyMiles);
            }
        }
    }
    const incidentMiles = extractIncidentMileage(incident);
    if (incidentMiles !== null) {
        return Math.max(0, incidentMiles);
    }
    return 0;
};
// GET /api/v1/billing/:id/charges/estimate - Get estimated charges for incident
router.get('/:id/charges/estimate', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'Incident ID is required' });
            return;
        }
        // Get incident
        const incident = await (0, database_1.db)('incidents')
            .where({ id })
            .first();
        if (!incident) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }
        // Calculate estimated charges
        let baseAmbulanceFee = 500; // Base fee
        let mileageCharge = 0;
        let surcharges = 0;
        // Transport type surcharges
        if (incident.transport_type === 'CCT') {
            surcharges += 300;
        }
        else if (incident.transport_type === 'HEMS') {
            surcharges += 5000;
        }
        // Acuity level surcharges
        if (incident.acuity_level === 'critical') {
            surcharges += 200;
        }
        else if (incident.acuity_level === 'urgent') {
            surcharges += 100;
        }
        // Patient weight surcharges (bariatric)
        if (incident.patient_weight_lbs && incident.patient_weight_lbs > 350) {
            surcharges += 250;
        }
        // Estimate mileage (resolved from routing metadata or supplied value)
        const estimatedMiles = resolveRoutingMiles(req, incident);
        const mileageRate = 12.5;
        mileageCharge = estimatedMiles * mileageRate;
        const subtotal = baseAmbulanceFee + mileageCharge + surcharges;
        // Calculate patient responsibility based on insurance
        let patientResponsibility = 0;
        if (incident.insurance_primary) {
            const insurance = typeof incident.insurance_primary === 'string'
                ? JSON.parse(incident.insurance_primary)
                : incident.insurance_primary;
            // Simplified calculation - assume 20% copay if insured
            patientResponsibility = subtotal * 0.2;
        }
        else {
            // No insurance - patient pays all
            patientResponsibility = subtotal;
        }
        const estimate = {
            incident_id: id,
            incident_number: incident.incident_number,
            estimate_type: 'preliminary',
            base_ambulance_fee: baseAmbulanceFee,
            mileage_miles: estimatedMiles,
            mileage_rate_per_mile: mileageRate,
            mileage_charge: mileageCharge,
            surcharges: {
                transport_type: incident.transport_type === 'CCT' ? 300 : incident.transport_type === 'HEMS' ? 5000 : 0,
                acuity_level: incident.acuity_level === 'critical' ? 200 : incident.acuity_level === 'urgent' ? 100 : 0,
                bariatric: incident.patient_weight_lbs && incident.patient_weight_lbs > 350 ? 250 : 0,
            },
            subtotal,
            patient_responsibility: Math.round(patientResponsibility * 100) / 100,
            insurance_payment_expected: Math.round((subtotal - patientResponsibility) * 100) / 100,
            total_charge: subtotal,
            notes: 'This is a preliminary estimate. Final charges will be calculated upon incident completion.',
        };
        res.json(estimate);
    }
    catch (error) {
        console.error('Error estimating charges:', error);
        res.status(500).json({ error: 'Failed to estimate charges', message: error.message });
    }
});
// POST /api/v1/billing/:id/charges/finalize - Finalize charges for completed incident
router.post('/:id/charges/finalize', async (req, res) => {
    try {
        const { id } = req.params;
        const { actual_mileage, procedures, telnyx_costs } = req.body;
        if (!id) {
            res.status(400).json({ error: 'Incident ID is required' });
            return;
        }
        // Get incident
        const incident = await (0, database_1.db)('incidents')
            .where({ id })
            .first();
        if (!incident) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }
        if (incident.status !== 'completed') {
            res.status(400).json({ error: 'Incident must be completed before finalizing charges' });
            return;
        }
        // Check if charges already exist
        const existingCharge = await (0, database_1.db)('charges')
            .where({ incident_id: id })
            .first();
        if (existingCharge && existingCharge.locked) {
            res.status(403).json({ error: 'Charges are already locked' });
            return;
        }
        // Calculate final charges
        let baseAmbulanceFee = 500;
        let mileageCharge = 0;
        let surcharges = {
            emt_paramedic_surcharge: 0,
            cct_service_surcharge: 0,
            bariatric_surcharge: 0,
            hems_charge: 0,
            night_surcharge: 0,
            holiday_surcharge: 0,
        };
        // Calculate mileage (prefer actual usage, routing metadata, or supplied distance)
        const miles = resolveRoutingMiles(req, incident, actual_mileage, ['routing_distance_miles']);
        const mileageRate = 12.5;
        mileageCharge = miles * mileageRate;
        // Transport type surcharges
        if (incident.transport_type === 'CCT') {
            surcharges.cct_service_surcharge = 300;
        }
        else if (incident.transport_type === 'HEMS') {
            surcharges.hems_charge = 5000;
        }
        // Bariatric
        if (incident.patient_weight_lbs && incident.patient_weight_lbs > 350) {
            surcharges.bariatric_surcharge = 250;
        }
        // Time-based surcharges
        const createdHour = new Date(incident.created_at).getHours();
        if (createdHour < 6 || createdHour > 20) {
            surcharges.night_surcharge = 150;
        }
        const totalSurcharges = Object.values(surcharges).reduce((a, b) => a + b, 0);
        const subtotal = baseAmbulanceFee + mileageCharge + totalSurcharges;
        // Calculate patient responsibility
        let patientResponsibility = 0;
        let insurancePaymentExpected = 0;
        if (incident.insurance_primary) {
            patientResponsibility = Math.round(subtotal * 0.2 * 100) / 100;
            insurancePaymentExpected = Math.round((subtotal - patientResponsibility) * 100) / 100;
        }
        else {
            patientResponsibility = subtotal;
        }
        // Telnyx costs
        const telnyxVoiceCallCost = telnyx_costs?.voice_call_cost || 0;
        const telnyxSmsCost = telnyx_costs?.sms_cost || 0;
        const totalCharge = subtotal;
        // Insert or update charge record
        const chargeData = {
            incident_id: id,
            base_ambulance_fee: baseAmbulanceFee,
            mileage_miles: miles,
            mileage_rate_per_mile: mileageRate,
            mileage_charge: mileageCharge,
            emt_paramedic_surcharge: surcharges.emt_paramedic_surcharge,
            cct_service_surcharge: surcharges.cct_service_surcharge,
            bariatric_surcharge: surcharges.bariatric_surcharge,
            hems_charge: surcharges.hems_charge,
            night_surcharge: surcharges.night_surcharge,
            holiday_surcharge: surcharges.holiday_surcharge,
            procedures: procedures ? JSON.stringify(procedures) : null,
            subtotal,
            insurance_primary: incident.insurance_primary,
            insurance_secondary: incident.insurance_secondary,
            patient_responsibility: patientResponsibility,
            insurance_payment_expected: insurancePaymentExpected,
            telnyx_voice_call_cost: telnyxVoiceCallCost,
            telnyx_sms_cost: telnyxSmsCost,
            total_charge: totalCharge,
            billing_status: 'pending_submission',
            organization_id: incident.organization_id,
            locked: true,
            updated_at: database_1.db.fn.now(),
        };
        let charge;
        if (existingCharge) {
            [charge] = await (0, database_1.db)('charges')
                .where({ incident_id: id })
                .update(chargeData)
                .returning('*');
        }
        else {
            [charge] = await (0, database_1.db)('charges')
                .insert(chargeData)
                .returning('*');
        }
        // Create timeline event
        await (0, database_1.db)('timeline_events').insert({
            incident_id: id,
            event_type: 'charges_finalized',
            event_timestamp: database_1.db.fn.now(),
            triggered_by: 'system',
            event_description: 'Charges finalized and locked',
            organization_id: incident.organization_id,
            is_immutable: true,
        });
        res.json({
            charge,
            message: 'Charges finalized successfully',
        });
    }
    catch (error) {
        console.error('Error finalizing charges:', error);
        res.status(500).json({ error: 'Failed to finalize charges', message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=billing.js.map