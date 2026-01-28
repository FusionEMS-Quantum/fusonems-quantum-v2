import { UUID, RepeatPatientCache } from '../types';
import { Knex } from 'knex';
export interface PatientIdentifier {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
}
export interface RepeatPatientResult {
    isRepeatPatient: boolean;
    repeatPatientScore: number;
    cache?: RepeatPatientCache;
    recommendations: string[];
    transportHistory: TransportHistorySummary;
}
export interface TransportHistorySummary {
    total12Months: number;
    total6Months: number;
    total3Months: number;
    recentTransportDate?: string;
    primaryDiagnoses: string[];
    frequentOrigins: string[];
    frequentDestinations: string[];
    knownIssues: KnownIssuesAggregate;
}
export interface KnownIssuesAggregate {
    behavioral: string[];
    medical: string[];
    access: string[];
    crewPreferences: Record<string, any>;
}
export declare class RepeatPatientDetector {
    private static readonly REPEAT_THRESHOLD_3M;
    private static readonly REPEAT_THRESHOLD_12M;
    private static readonly HIGH_FREQUENCY_THRESHOLD;
    private db;
    constructor(db: Knex);
    /**
     * Detect if a patient is a repeat patient and retrieve their history
     */
    detect(patient: PatientIdentifier, organizationId: UUID): Promise<RepeatPatientResult>;
    /**
     * Find cached patient record
     */
    private findCachedPatient;
    /**
     * Build a new patient profile by analyzing transport history
     */
    private buildNewProfile;
    /**
     * Refresh existing cache with latest data
     */
    private refreshCache;
    /**
     * Aggregate transport history from incidents
     */
    private aggregateHistory;
    /**
     * Calculate repeat patient score (0-100)
     */
    private calculateRepeatScore;
    /**
     * Determine if patient meets repeat patient criteria
     */
    private isRepeatPatient;
    /**
     * Generate recommendations based on history
     */
    private generateRecommendations;
    /**
     * Create new cache entry
     */
    private createCache;
    /**
     * Build result from cached data
     */
    private buildResultFromCache;
    /**
     * Generate patient ID from demographics
     */
    private generatePatientId;
    /**
     * Parse JSON array safely
     */
    private parseJsonArray;
    /**
     * Parse JSON safely
     */
    private parseJson;
}
//# sourceMappingURL=RepeatPatientDetector.d.ts.map