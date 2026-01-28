"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitsController = void 0;
const database_1 = require("../config/database");
class UnitsController {
    async getAvailable(req, res) {
        try {
            const { organization_id, status, unit_type, min_compliance_score, min_on_time_pct, exclude_high_fatigue, } = req.query;
            if (!organization_id) {
                res.status(400).json({ error: 'Organization ID is required' });
                return;
            }
            // Build query
            let query = (0, database_1.db)('units').where({ organization_id: organization_id });
            // Filter by status
            if (status) {
                query = query.where({ status: status });
            }
            else {
                // Default to available units
                query = query.where({ status: 'available' });
            }
            // Filter by unit type
            if (unit_type) {
                query = query.where({ unit_type: unit_type });
            }
            // Filter by compliance score
            if (min_compliance_score) {
                query = query.where('compliance_audit_score', '>=', parseFloat(min_compliance_score));
            }
            // Filter by on-time percentage
            if (min_on_time_pct) {
                query = query.where('on_time_arrival_pct', '>=', parseFloat(min_on_time_pct));
            }
            // Exclude high fatigue units
            if (exclude_high_fatigue === 'true') {
                query = query.whereNot({ fatigue_risk_level: 'high' });
            }
            // Execute query
            const units = await query.select('*').orderBy('on_time_arrival_pct', 'desc');
            res.json({
                units,
                count: units.length,
                filters: {
                    organization_id,
                    status: status || 'available',
                    unit_type,
                    min_compliance_score,
                    min_on_time_pct,
                    exclude_high_fatigue,
                },
            });
        }
        catch (error) {
            console.error('Error fetching units:', error);
            res.status(500).json({ error: 'Failed to fetch units', message: error.message });
        }
    }
}
exports.UnitsController = UnitsController;
//# sourceMappingURL=UnitsController.js.map