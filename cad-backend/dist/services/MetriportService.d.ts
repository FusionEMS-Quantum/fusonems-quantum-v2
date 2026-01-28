export interface PatientSearchParams {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: 'M' | 'F' | 'O' | 'U';
}
export interface PatientSearchResult {
    found: boolean;
    patientId?: string;
    demographics?: PatientDemographics;
    error?: string;
}
export interface PatientDemographics {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    address?: Address;
    contact?: ContactInfo;
}
export interface Address {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}
export interface ContactInfo {
    phone?: string;
    email?: string;
}
export interface ConsolidatedRecordResult {
    available: boolean;
    patientId: string;
    records?: MedicalRecord[];
    error?: string;
    queryId?: string;
}
export interface MedicalRecord {
    id: string;
    type: string;
    date: string;
    provider?: string;
    facility?: string;
    data: any;
}
export interface PatientHistorySummary {
    patientId: string;
    recordCount: number;
    recentDiagnoses: string[];
    recentMedications: string[];
    allergies: string[];
    conditions: string[];
    lastEncounterDate?: string;
    providers: string[];
}
export declare class MetriportService {
    private client;
    private apiKey;
    private facilityId;
    constructor(apiKey: string, facilityId?: string);
    /**
     * Search for a patient in Metriport
     */
    searchPatient(params: PatientSearchParams, facilityId?: string): Promise<PatientSearchResult>;
    /**
     * Create a new patient in Metriport
     */
    createPatient(params: PatientSearchParams, facilityId?: string): Promise<PatientDemographics>;
    /**
     * Retrieve consolidated medical records for a patient
     */
    getConsolidatedRecords(patientId: string): Promise<ConsolidatedRecordResult>;
    /**
     * Get patient history summary (aggregated data)
     */
    getPatientHistorySummary(patientId: string): Promise<PatientHistorySummary>;
    /**
     * Handle Metriport webhook for document query status
     */
    handleWebhook(payload: any): Promise<void>;
    /**
     * Extract relevant patient information for transport
     */
    extractTransportRelevantInfo(patientId: string): Promise<{
        allergies: string[];
        activeMedications: string[];
        recentDiagnoses: string[];
        mobility: string;
        specialNeeds: string[];
    }>;
    /**
     * Check if patient has recent transport history in Metriport
     */
    checkRecentTransports(patientId: string, daysBack?: number): Promise<{
        hasRecentTransports: boolean;
        transportCount: number;
        lastTransportDate?: string;
    }>;
    /**
     * Get service health status
     */
    getHealthStatus(): Promise<{
        available: boolean;
        apiKeyConfigured: boolean;
        facilityConfigured: boolean;
        error?: string;
    }>;
    /**
     * Mock patient search (when no API key)
     */
    private mockPatientSearch;
    /**
     * Mock consolidated records (when no API key)
     */
    private mockConsolidatedRecords;
    /**
     * Mock history summary (when no API key)
     */
    private mockHistorySummary;
    /**
     * Helper: Get date N years ago
     */
    private getDateYearsAgo;
    /**
     * Parse FHIR Condition resources
     */
    private parseConditions;
    /**
     * Parse FHIR MedicationStatement resources
     */
    private parseMedications;
    /**
     * Parse FHIR AllergyIntolerance resources
     */
    private parseAllergies;
}
//# sourceMappingURL=MetriportService.d.ts.map