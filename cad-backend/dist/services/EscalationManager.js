"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationManager = void 0;
class EscalationManager {
    constructor(db) {
        this.alertHandlers = new Map();
        this.db = db;
    }
    /**
     * Monitor all active incidents for escalation conditions
     */
    async monitorIncidents(config) {
        const alerts = [];
        // Check if we're in quiet hours
        if (this.isQuietHours(config)) {
            return alerts; // Don't generate alerts during quiet hours
        }
        // Get all active incidents for organization
        const activeIncidents = await this.db('incidents')
            .where('organization_id', config.organizationId)
            .whereIn('status', ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'AT_FACILITY', 'TRANSPORTING'])
            .where('locked', false)
            .where('training_mode', false);
        for (const incident of activeIncidents) {
            const incidentAlerts = await this.checkIncident(incident, config.rules);
            alerts.push(...incidentAlerts);
        }
        // Emit alerts through registered handlers
        for (const alert of alerts) {
            await this.emitAlert(alert);
        }
        return alerts;
    }
    /**
     * Check a single incident against escalation rules
     */
    async checkIncident(incident, rules) {
        const alerts = [];
        const now = new Date();
        for (const rule of rules) {
            if (!rule.enabled)
                continue;
            // Check if rule applies to this incident status
            if (incident.status !== rule.status && rule.status !== 'PENDING') {
                continue;
            }
            let timeInStatus;
            let statusTimestamp = null;
            switch (rule.type) {
                case 'UNASSIGNED_TIMEOUT':
                    if (incident.status === 'PENDING' && !incident.assigned_unit_id) {
                        statusTimestamp = new Date(incident.time_incident_created || incident.created_at);
                        timeInStatus = (now.getTime() - statusTimestamp.getTime()) / (1000 * 60);
                        if (timeInStatus > rule.timeoutMinutes) {
                            alerts.push(this.createAlert(incident, 'UNASSIGNED_TIMEOUT', rule.severity, `Incident unassigned for ${Math.floor(timeInStatus)} minutes (threshold: ${rule.timeoutMinutes} min)`, { timeInStatus, threshold: rule.timeoutMinutes }));
                        }
                    }
                    break;
                case 'AT_FACILITY_TIMEOUT':
                    if (incident.status === 'AT_FACILITY' && incident.time_at_facility) {
                        statusTimestamp = new Date(incident.time_at_facility);
                        timeInStatus = (now.getTime() - statusTimestamp.getTime()) / (1000 * 60);
                        if (timeInStatus > rule.timeoutMinutes) {
                            alerts.push(this.createAlert(incident, 'AT_FACILITY_TIMEOUT', rule.severity, `Unit at facility for ${Math.floor(timeInStatus)} minutes (threshold: ${rule.timeoutMinutes} min)`, { timeInStatus, threshold: rule.timeoutMinutes }));
                        }
                    }
                    break;
                case 'EXTENDED_TRANSPORT':
                    if (incident.status === 'TRANSPORTING' && incident.time_transporting) {
                        statusTimestamp = new Date(incident.time_transporting);
                        timeInStatus = (now.getTime() - statusTimestamp.getTime()) / (1000 * 60);
                        if (timeInStatus > rule.timeoutMinutes) {
                            alerts.push(this.createAlert(incident, 'EXTENDED_TRANSPORT', rule.severity, `Transport in progress for ${Math.floor(timeInStatus)} minutes (threshold: ${rule.timeoutMinutes} min)`, { timeInStatus, threshold: rule.timeoutMinutes }));
                        }
                    }
                    break;
            }
        }
        return alerts;
    }
    /**
     * Create an escalation alert
     */
    createAlert(incident, type, severity, message, metadata) {
        return {
            id: this.generateUUID(),
            incidentId: incident.id,
            alertType: type,
            severity,
            message,
            createdAt: new Date(),
            resolved: false,
            metadata: {
                ...metadata,
                incidentNumber: incident.incident_number,
                patientName: `${incident.patient_first_name} ${incident.patient_last_name}`,
                transportType: incident.transport_type,
                status: incident.status
            }
        };
    }
    /**
     * Emit alert through registered handlers
     */
    async emitAlert(alert) {
        // Store alert in database
        await this.storeAlert(alert);
        // Call registered handlers
        const handlers = this.alertHandlers.get(alert.alertType) || [];
        for (const handler of handlers) {
            try {
                handler(alert);
            }
            catch (error) {
                console.error(`Error in alert handler for ${alert.alertType}:`, error);
            }
        }
        // Call global handlers (registered under 'all')
        const globalHandlers = this.alertHandlers.get('NO_UNITS_AVAILABLE') || []; // Using as placeholder
        for (const handler of globalHandlers) {
            try {
                handler(alert);
            }
            catch (error) {
                console.error('Error in global alert handler:', error);
            }
        }
    }
    /**
     * Store alert in database
     */
    async storeAlert(alert) {
        // Check if similar alert already exists (deduplication)
        const existing = await this.db('escalation_alerts')
            .where('incident_id', alert.incidentId)
            .where('alert_type', alert.alertType)
            .where('resolved', false)
            .first();
        if (existing) {
            // Update existing alert
            await this.db('escalation_alerts')
                .where('id', existing.id)
                .update({
                message: alert.message,
                metadata: JSON.stringify(alert.metadata),
                updated_at: new Date()
            });
        }
        else {
            // Create new alert
            await this.db('escalation_alerts').insert({
                id: alert.id,
                incident_id: alert.incidentId,
                alert_type: alert.alertType,
                severity: alert.severity,
                message: alert.message,
                created_at: alert.createdAt,
                resolved: false,
                metadata: JSON.stringify(alert.metadata)
            });
        }
    }
    /**
     * Register an alert handler
     */
    onAlert(type, handler) {
        if (!this.alertHandlers.has(type)) {
            this.alertHandlers.set(type, []);
        }
        this.alertHandlers.get(type).push(handler);
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId, userId) {
        await this.db('escalation_alerts')
            .where('id', alertId)
            .update({
            acknowledged_at: new Date(),
            acknowledged_by: userId,
            updated_at: new Date()
        });
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId) {
        await this.db('escalation_alerts')
            .where('id', alertId)
            .update({
            resolved: true,
            resolved_at: new Date(),
            updated_at: new Date()
        });
    }
    /**
     * Get active alerts for an organization
     */
    async getActiveAlerts(organizationId) {
        const results = await this.db('escalation_alerts as ea')
            .join('incidents as i', 'ea.incident_id', 'i.id')
            .where('i.organization_id', organizationId)
            .where('ea.resolved', false)
            .select('ea.*')
            .orderBy('ea.created_at', 'desc');
        return results.map(r => ({
            id: r.id,
            incidentId: r.incident_id,
            alertType: r.alert_type,
            severity: r.severity,
            message: r.message,
            createdAt: new Date(r.created_at),
            acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at) : undefined,
            acknowledgedBy: r.acknowledged_by,
            resolved: r.resolved,
            metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
        }));
    }
    /**
     * Get alerts for a specific incident
     */
    async getIncidentAlerts(incidentId) {
        const results = await this.db('escalation_alerts')
            .where('incident_id', incidentId)
            .orderBy('created_at', 'desc');
        return results.map(r => ({
            id: r.id,
            incidentId: r.incident_id,
            alertType: r.alert_type,
            severity: r.severity,
            message: r.message,
            createdAt: new Date(r.created_at),
            acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at) : undefined,
            acknowledgedBy: r.acknowledged_by,
            resolved: r.resolved,
            metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
        }));
    }
    /**
     * Build default escalation configuration from organization settings
     */
    buildConfig(organization) {
        const unassignedThreshold = organization.escalation_unassigned_minutes || 30;
        const atFacilityThreshold = organization.escalation_at_facility_minutes || 45;
        return {
            organizationId: organization.id,
            rules: [
                {
                    type: 'UNASSIGNED_TIMEOUT',
                    status: 'PENDING',
                    timeoutMinutes: unassignedThreshold,
                    severity: 'WARNING',
                    enabled: true
                },
                {
                    type: 'UNASSIGNED_TIMEOUT',
                    status: 'PENDING',
                    timeoutMinutes: unassignedThreshold + 15,
                    severity: 'CRITICAL',
                    enabled: true
                },
                {
                    type: 'AT_FACILITY_TIMEOUT',
                    status: 'AT_FACILITY',
                    timeoutMinutes: atFacilityThreshold,
                    severity: 'WARNING',
                    enabled: true
                },
                {
                    type: 'AT_FACILITY_TIMEOUT',
                    status: 'AT_FACILITY',
                    timeoutMinutes: atFacilityThreshold + 15,
                    severity: 'CRITICAL',
                    enabled: true
                },
                {
                    type: 'EXTENDED_TRANSPORT',
                    status: 'TRANSPORTING',
                    timeoutMinutes: 120, // 2 hours
                    severity: 'WARNING',
                    enabled: true
                }
            ],
            quietHoursStart: organization.quiet_hours_start,
            quietHoursEnd: organization.quiet_hours_end,
            suppressDuringQuietHours: organization.suppress_alerts_quiet_hours
        };
    }
    /**
     * Check if current time is within quiet hours
     */
    isQuietHours(config) {
        if (!config.suppressDuringQuietHours || !config.quietHoursStart || !config.quietHoursEnd) {
            return false;
        }
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        const [startHour, startMinute] = config.quietHoursStart.split(':').map(Number);
        const [endHour, endMinute] = config.quietHoursEnd.split(':').map(Number);
        const quietStart = startHour * 60 + startMinute;
        const quietEnd = endHour * 60 + endMinute;
        // Handle overnight quiet hours (e.g., 22:00 to 06:00)
        if (quietStart > quietEnd) {
            return currentTime >= quietStart || currentTime < quietEnd;
        }
        return currentTime >= quietStart && currentTime < quietEnd;
    }
    /**
     * Start continuous monitoring (call periodically)
     */
    async startMonitoring(organizations, intervalMinutes = 5) {
        const monitor = async () => {
            for (const org of organizations) {
                if (!org.active)
                    continue;
                const config = this.buildConfig(org);
                await this.monitorIncidents(config);
            }
        };
        // Run immediately
        await monitor();
        // Schedule periodic runs
        return setInterval(monitor, intervalMinutes * 60 * 1000);
    }
    /**
     * Generate UUID (helper method)
     */
    generateUUID() {
        const crypto = require('crypto');
        return crypto.randomUUID();
    }
    /**
     * Format alert for display
     */
    formatAlert(alert) {
        const severityIcon = alert.severity === 'CRITICAL' ? '🚨' : '⚠️';
        const lines = [
            `${severityIcon} ${alert.severity} ALERT`,
            `Incident: ${alert.metadata.incidentNumber}`,
            `Patient: ${alert.metadata.patientName}`,
            `Type: ${alert.alertType}`,
            `Message: ${alert.message}`,
            `Created: ${alert.createdAt.toLocaleString()}`
        ];
        if (alert.acknowledgedAt) {
            lines.push(`Acknowledged: ${alert.acknowledgedAt.toLocaleString()}`);
        }
        return lines.join('\n');
    }
}
exports.EscalationManager = EscalationManager;
//# sourceMappingURL=EscalationManager.js.map