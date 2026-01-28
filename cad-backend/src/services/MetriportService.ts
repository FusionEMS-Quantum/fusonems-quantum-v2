import { MetriportMedicalApi } from '@metriport/api-sdk';
import { UUID } from '../types';

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

export class MetriportService {
  private client: MetriportMedicalApi | null = null;
  private apiKey: string;
  private facilityId: string;

  constructor(apiKey: string, facilityId?: string) {
    this.apiKey = apiKey;
    this.facilityId = facilityId || process.env.METRIPORT_FACILITY_ID || '';

    if (!apiKey) {
      console.warn('Metriport API key not provided. Service will run in mock mode.');
      return;
    }

    try {
      this.client = new MetriportMedicalApi(apiKey, {
        baseURL: process.env.METRIPORT_BASE_URL
      });
    } catch (error) {
      console.error('Failed to initialize Metriport client:', error);
    }
  }

  /**
   * Search for a patient in Metriport
   */
  async searchPatient(params: PatientSearchParams, facilityId?: string): Promise<PatientSearchResult> {
    if (!this.client) {
      return this.mockPatientSearch(params);
    }

    try {
      const facility = facilityId || this.facilityId;
      if (!facility) {
        return {
          found: false,
          error: 'Facility ID not configured'
        };
      }

      // Search for patient using demographics
      const patients = await this.client.listPatients(facility);

      // Match by demographics
      const matchedPatient = patients.patients.find(p => 
        p.firstName.toLowerCase() === params.firstName.toLowerCase() &&
        p.lastName.toLowerCase() === params.lastName.toLowerCase() &&
        p.dob === params.dateOfBirth
      );

      if (matchedPatient) {
        return {
          found: true,
          patientId: matchedPatient.id,
          demographics: {
            id: matchedPatient.id,
            firstName: matchedPatient.firstName,
            lastName: matchedPatient.lastName,
            dateOfBirth: matchedPatient.dob,
            gender: matchedPatient.genderAtBirth,
            address: matchedPatient.address ? {
              addressLine1: matchedPatient.address[0]?.addressLine1,
              addressLine2: matchedPatient.address[0]?.addressLine2,
              city: matchedPatient.address[0]?.city,
              state: matchedPatient.address[0]?.state,
              zip: matchedPatient.address[0]?.zip,
              country: matchedPatient.address[0]?.country
            } : undefined,
            contact: {
              phone: matchedPatient.contact?.[0]?.phone,
              email: matchedPatient.contact?.[0]?.email
            }
          }
        };
      }

      // Patient not found - create new patient record
      const newPatient = await this.createPatient(params, facility);
      
      return {
        found: false, // Newly created
        patientId: newPatient.id,
        demographics: newPatient
      };

    } catch (error: any) {
      console.error('Metriport patient search error:', error);
      return {
        found: false,
        error: error.message || 'Failed to search patient'
      };
    }
  }

  /**
   * Create a new patient in Metriport
   */
  async createPatient(params: PatientSearchParams, facilityId?: string): Promise<PatientDemographics> {
    if (!this.client) {
      throw new Error('Metriport client not initialized');
    }

    const facility = facilityId || this.facilityId;
    if (!facility) {
      throw new Error('Facility ID not configured');
    }

    const patient = await this.client.createPatient({
      facilityId: facility,
      firstName: params.firstName,
      lastName: params.lastName,
      dob: params.dateOfBirth,
      genderAtBirth: params.gender || 'U'
    });

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dob,
      gender: patient.genderAtBirth
    };
  }

  /**
   * Retrieve consolidated medical records for a patient
   */
  async getConsolidatedRecords(patientId: string): Promise<ConsolidatedRecordResult> {
    if (!this.client) {
      return this.mockConsolidatedRecords(patientId);
    }

    try {
      // Start a consolidated query
      const query = await this.client.startConsolidatedQuery(patientId, {
        resources: ['Condition', 'MedicationStatement', 'AllergyIntolerance', 'Encounter'],
        dateFrom: this.getDateYearsAgo(2), // Last 2 years
        dateTo: new Date().toISOString().split('T')[0]
      });

      return {
        available: true,
        patientId,
        queryId: query.requestId,
        records: [] // Records will be available via webhook
      };

    } catch (error: any) {
      console.error('Metriport consolidated records error:', error);
      return {
        available: false,
        patientId,
        error: error.message || 'Failed to retrieve records'
      };
    }
  }

  /**
   * Get patient history summary (aggregated data)
   */
  async getPatientHistorySummary(patientId: string): Promise<PatientHistorySummary> {
    if (!this.client) {
      return this.mockHistorySummary(patientId);
    }

    try {
      // In production, this would parse the consolidated data
      // For now, return a simplified summary

      const summary: PatientHistorySummary = {
        patientId,
        recordCount: 0,
        recentDiagnoses: [],
        recentMedications: [],
        allergies: [],
        conditions: [],
        providers: []
      };

      return summary;

    } catch (error: any) {
      console.error('Metriport history summary error:', error);
      throw error;
    }
  }

  /**
   * Handle Metriport webhook for document query status
   */
  async handleWebhook(payload: any): Promise<void> {
    const { meta, patients } = payload;

    console.log('Metriport webhook received:', meta.type);

    switch (meta.type) {
      case 'medical.document-query':
        // Document query completed
        if (meta.data.status === 'completed') {
          console.log('Document query completed for patients:', patients);
          // Process and store the consolidated data
        } else if (meta.data.status === 'failed') {
          console.error('Document query failed:', meta.data.message);
        }
        break;

      case 'medical.document-download':
        // Document downloaded
        console.log('Document downloaded:', meta.data.fileName);
        break;

      case 'medical.consolidated-data':
        // Consolidated data available
        console.log('Consolidated data available for patients:', patients);
        // Parse and store FHIR resources
        break;

      default:
        console.log('Unhandled Metriport webhook type:', meta.type);
    }
  }

  /**
   * Extract relevant patient information for transport
   */
  async extractTransportRelevantInfo(patientId: string): Promise<{
    allergies: string[];
    activeMedications: string[];
    recentDiagnoses: string[];
    mobility: string;
    specialNeeds: string[];
  }> {
    // In production, parse consolidated FHIR data
    // For now, return mock data structure

    return {
      allergies: [],
      activeMedications: [],
      recentDiagnoses: [],
      mobility: 'ambulatory',
      specialNeeds: []
    };
  }

  /**
   * Check if patient has recent transport history in Metriport
   */
  async checkRecentTransports(patientId: string, daysBack: number = 30): Promise<{
    hasRecentTransports: boolean;
    transportCount: number;
    lastTransportDate?: string;
  }> {
    // Query for recent Encounter resources with transport-related codes
    
    return {
      hasRecentTransports: false,
      transportCount: 0
    };
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    available: boolean;
    apiKeyConfigured: boolean;
    facilityConfigured: boolean;
    error?: string;
  }> {
    if (!this.apiKey) {
      return {
        available: false,
        apiKeyConfigured: false,
        facilityConfigured: false,
        error: 'Metriport API key not configured'
      };
    }

    if (!this.facilityId) {
      return {
        available: false,
        apiKeyConfigured: true,
        facilityConfigured: false,
        error: 'Metriport facility ID not configured'
      };
    }

    if (!this.client) {
      return {
        available: false,
        apiKeyConfigured: true,
        facilityConfigured: true,
        error: 'Metriport client initialization failed'
      };
    }

    try {
      // Test API connectivity
      await this.client.listPatients(this.facilityId);

      return {
        available: true,
        apiKeyConfigured: true,
        facilityConfigured: true
      };
    } catch (error: any) {
      return {
        available: false,
        apiKeyConfigured: true,
        facilityConfigured: true,
        error: error.message || 'Metriport API error'
      };
    }
  }

  /**
   * Mock patient search (when no API key)
   */
  private mockPatientSearch(params: PatientSearchParams): PatientSearchResult {
    console.log('[MOCK] Metriport patient search:', params);
    
    return {
      found: true,
      patientId: `mock-patient-${Date.now()}`,
      demographics: {
        id: `mock-patient-${Date.now()}`,
        firstName: params.firstName,
        lastName: params.lastName,
        dateOfBirth: params.dateOfBirth,
        gender: params.gender || 'U'
      }
    };
  }

  /**
   * Mock consolidated records (when no API key)
   */
  private mockConsolidatedRecords(patientId: string): ConsolidatedRecordResult {
    console.log('[MOCK] Metriport consolidated records for:', patientId);
    
    return {
      available: true,
      patientId,
      records: [
        {
          id: 'mock-1',
          type: 'Condition',
          date: new Date().toISOString(),
          provider: 'Mock Hospital',
          facility: 'Mock Facility',
          data: {
            code: 'I10',
            display: 'Essential hypertension'
          }
        }
      ]
    };
  }

  /**
   * Mock history summary (when no API key)
   */
  private mockHistorySummary(patientId: string): PatientHistorySummary {
    console.log('[MOCK] Metriport history summary for:', patientId);
    
    return {
      patientId,
      recordCount: 5,
      recentDiagnoses: ['Hypertension', 'Type 2 Diabetes'],
      recentMedications: ['Lisinopril 10mg', 'Metformin 500mg'],
      allergies: ['Penicillin'],
      conditions: ['Hypertension', 'Type 2 Diabetes', 'Hyperlipidemia'],
      lastEncounterDate: new Date().toISOString().split('T')[0],
      providers: ['Dr. Smith', 'Dr. Johnson']
    };
  }

  /**
   * Helper: Get date N years ago
   */
  private getDateYearsAgo(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse FHIR Condition resources
   */
  private parseConditions(conditions: any[]): string[] {
    return conditions
      .map(c => c.code?.coding?.[0]?.display || c.code?.text)
      .filter(Boolean);
  }

  /**
   * Parse FHIR MedicationStatement resources
   */
  private parseMedications(medications: any[]): string[] {
    return medications
      .map(m => m.medicationCodeableConcept?.coding?.[0]?.display || m.medicationCodeableConcept?.text)
      .filter(Boolean);
  }

  /**
   * Parse FHIR AllergyIntolerance resources
   */
  private parseAllergies(allergies: any[]): string[] {
    return allergies
      .map(a => a.code?.coding?.[0]?.display || a.code?.text)
      .filter(Boolean);
  }
}
