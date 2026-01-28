import { IncidentStatus, UUID, Organization } from '../types';
import { Knex } from 'knex';
export interface EscalationAlert {
    id: UUID;
    incidentId: UUID;
    alertType: EscalationType;
    severity: 'WARNING' | 'CRITICAL';
    message: string;
    createdAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: UUID;
    resolved: boolean;
    metadata: Record<string, any>;
}
export type EscalationType = 'UNASSIGNED_TIMEOUT' | 'AT_FACILITY_TIMEOUT' | 'EXTENDED_TRANSPORT' | 'CREW_FATIGUE' | 'UNIT_UNAVAILABLE' | 'NO_UNITS_AVAILABLE';
export interface EscalationRule {
    type: EscalationType;
    status: IncidentStatus;
    timeoutMinutes: number;
    severity: 'WARNING' | 'CRITICAL';
    enabled: boolean;
}
export interface EscalationMonitorConfig {
    organizationId: UUID;
    rules: EscalationRule[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    suppressDuringQuietHours: boolean;
}
export declare class EscalationManager {
    private db;
    private alertHandlers;
    constructor(db: Knex);
    /**
     * Monitor all active incidents for escalation conditions
     */
    monitorIncidents(config: EscalationMonitorConfig): Promise<EscalationAlert[]>;
    /**
     * Check a single incident against escalation rules
     */
    private checkIncident;
    /**
     * Create an escalation alert
     */
    private createAlert;
    /**
     * Emit alert through registered handlers
     */
    private emitAlert;
    /**
     * Store alert in database
     */
    private storeAlert;
    /**
     * Register an alert handler
     */
    onAlert(type: EscalationType, handler: (alert: EscalationAlert) => void): void;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: UUID, userId: UUID): Promise<void>;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: UUID): Promise<void>;
    /**
     * Get active alerts for an organization
     */
    getActiveAlerts(organizationId: UUID): Promise<EscalationAlert[]>;
    /**
     * Get alerts for a specific incident
     */
    getIncidentAlerts(incidentId: UUID): Promise<EscalationAlert[]>;
    /**
     * Build default escalation configuration from organization settings
     */
    buildConfig(organization: Organization): EscalationMonitorConfig;
    /**
     * Check if current time is within quiet hours
     */
    private isQuietHours;
    /**
     * Start continuous monitoring (call periodically)
     */
    startMonitoring(organizations: Organization[], intervalMinutes?: number): Promise<NodeJS.Timeout>;
    /**
     * Generate UUID (helper method)
     */
    private generateUUID;
    /**
     * Format alert for display
     */
    formatAlert(alert: EscalationAlert): string;
}
//# sourceMappingURL=EscalationManager.d.ts.map