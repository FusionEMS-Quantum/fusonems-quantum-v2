"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentsController = void 0;
const database_1 = require("../config/database");
class AssignmentsController {
    async recommend(req, res) {
        try {
            const { incident_id } = req.body;
            if (!incident_id) {
                res.status(400).json({ error: 'Incident ID is required' });
                return;
            }
            // Get incident details
            const incident = await (0, database_1.db)('incidents')
                .where({ id: incident_id })
                .first();
            if (!incident) {
                res.status(404).json({ error: 'Incident not found' });
                return;
            }
            // Get available units for the organization
            const units = await (0, database_1.db)('units')
                .where({
                organization_id: incident.organization_id,
                status: 'available',
            })
                .select('*');
            if (units.length === 0) {
                res.json({ recommendations: [], message: 'No available units found' });
                return;
            }
            // Calculate recommendations
            const recommendations = [];
            for (const unit of units) {
                const score = await this.calculateUnitScore(unit, incident);
                const estimatedEta = await this.calculateETA(unit, incident);
                const distance = await this.calculateDistance(unit, incident);
                recommendations.push({
                    unit_id: unit.id,
                    unit_id_display: unit.unit_id_display,
                    score,
                    estimated_eta_minutes: estimatedEta,
                    distance_miles: distance,
                    crew_capabilities_match: this.matchCapabilities(unit, incident),
                    fatigue_risk_level: unit.fatigue_risk_level || 'low',
                    on_time_arrival_pct: unit.on_time_arrival_pct || 0,
                    reason: this.generateRecommendationReason(unit, incident, score),
                });
            }
            // Sort by score descending
            recommendations.sort((a, b) => b.score - a.score);
            res.json({ recommendations });
        }
        catch (error) {
            console.error('Error generating recommendations:', error);
            res.status(500).json({ error: 'Failed to generate recommendations', message: error.message });
        }
    }
    async assign(req, res) {
        try {
            const data = req.body;
            if (!data.incident_id || !data.unit_id) {
                res.status(400).json({ error: 'Incident ID and Unit ID are required' });
                return;
            }
            // Verify incident exists and is not locked
            const incident = await (0, database_1.db)('incidents')
                .where({ id: data.incident_id })
                .first();
            if (!incident) {
                res.status(404).json({ error: 'Incident not found' });
                return;
            }
            if (incident.locked) {
                res.status(403).json({ error: 'Incident is locked and cannot be modified' });
                return;
            }
            // Verify unit exists and is available
            const unit = await (0, database_1.db)('units')
                .where({ id: data.unit_id })
                .first();
            if (!unit) {
                res.status(404).json({ error: 'Unit not found' });
                return;
            }
            if (unit.status !== 'available') {
                res.status(400).json({ error: 'Unit is not available', current_status: unit.status });
                return;
            }
            // Assign unit to incident
            await (0, database_1.db)('incidents')
                .where({ id: data.incident_id })
                .update({
                assigned_unit_id: data.unit_id,
                assigned_crew_ids: unit.assigned_crew_ids,
                status: 'assigned',
                status_updated_at: database_1.db.fn.now(),
                time_unit_assigned: database_1.db.fn.now(),
                updated_at: database_1.db.fn.now(),
            });
            // Update unit status
            await (0, database_1.db)('units')
                .where({ id: data.unit_id })
                .update({
                status: 'dispatched',
                current_incident_id: data.incident_id,
                updated_at: database_1.db.fn.now(),
            });
            // Create timeline event
            await (0, database_1.db)('timeline_events').insert({
                incident_id: data.incident_id,
                event_type: 'unit_assigned',
                event_timestamp: database_1.db.fn.now(),
                triggered_by: 'user',
                triggered_by_user_id: data.assigned_by_user_id,
                unit_id: data.unit_id,
                event_description: `Unit ${unit.unit_id_display} assigned to incident`,
                organization_id: incident.organization_id,
            });
            // Get updated incident
            const updatedIncident = await (0, database_1.db)('incidents')
                .where({ id: data.incident_id })
                .first();
            res.json({
                incident: updatedIncident,
                unit,
                message: 'Unit successfully assigned to incident',
            });
        }
        catch (error) {
            console.error('Error assigning unit:', error);
            res.status(500).json({ error: 'Failed to assign unit', message: error.message });
        }
    }
    async calculateUnitScore(unit, incident) {
        let score = 100;
        // Factor 1: Availability (base score)
        score += 10;
        // Factor 2: On-time arrival percentage
        if (unit.on_time_arrival_pct) {
            score += (unit.on_time_arrival_pct / 100) * 30;
        }
        // Factor 3: Fatigue risk (lower is better)
        if (unit.fatigue_risk_level === 'low')
            score += 20;
        else if (unit.fatigue_risk_level === 'medium')
            score += 10;
        else if (unit.fatigue_risk_level === 'high')
            score -= 20;
        // Factor 4: Crew capabilities match
        const capabilitiesMatch = this.matchCapabilities(unit, incident);
        score += capabilitiesMatch * 20;
        // Factor 5: Compliance audit score
        if (unit.compliance_audit_score) {
            score += (unit.compliance_audit_score / 100) * 20;
        }
        return Math.round(score);
    }
    matchCapabilities(unit, incident) {
        if (!incident.crew_requirements)
            return 1;
        const requirements = typeof incident.crew_requirements === 'string'
            ? JSON.parse(incident.crew_requirements)
            : incident.crew_requirements;
        const unitCapabilities = unit.capabilities
            ? (typeof unit.capabilities === 'string' ? JSON.parse(unit.capabilities) : unit.capabilities)
            : {};
        let matches = 0;
        let total = 0;
        for (const [key, required] of Object.entries(requirements)) {
            if (required) {
                total++;
                if (unitCapabilities[key])
                    matches++;
            }
        }
        return total > 0 ? matches / total : 1;
    }
    async calculateETA(unit, incident) {
        // Simplified ETA calculation - in production, use real routing API
        if (unit.average_response_time_min) {
            return unit.average_response_time_min;
        }
        return 15; // Default 15 minutes
    }
    async calculateDistance(unit, incident) {
        // Simplified distance calculation - in production, use real routing API
        return Math.random() * 20 + 5; // Random 5-25 miles for now
    }
    generateRecommendationReason(unit, incident, score) {
        const reasons = [];
        if (unit.on_time_arrival_pct > 90) {
            reasons.push('excellent on-time performance');
        }
        if (unit.fatigue_risk_level === 'low') {
            reasons.push('crew well-rested');
        }
        if (this.matchCapabilities(unit, incident) === 1) {
            reasons.push('all required capabilities available');
        }
        if (reasons.length === 0) {
            return 'Available unit';
        }
        return reasons.join(', ');
    }
}
exports.AssignmentsController = AssignmentsController;
//# sourceMappingURL=AssignmentsController.js.map