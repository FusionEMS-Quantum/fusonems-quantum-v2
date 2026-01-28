import { UUID, RepeatPatientCache, Incident } from '../types';
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

export class RepeatPatientDetector {
  private static readonly REPEAT_THRESHOLD_3M = 3;  // 3+ transports in 3 months
  private static readonly REPEAT_THRESHOLD_12M = 5; // 5+ transports in 12 months
  private static readonly HIGH_FREQUENCY_THRESHOLD = 10; // 10+ transports = high frequency

  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  /**
   * Detect if a patient is a repeat patient and retrieve their history
   */
  async detect(
    patient: PatientIdentifier,
    organizationId: UUID
  ): Promise<RepeatPatientResult> {
    // First, try to find existing cache
    const cache = await this.findCachedPatient(patient, organizationId);

    if (cache) {
      // Update cache with fresh data if it's older than 7 days
      const cacheAge = Date.now() - new Date(cache.last_updated).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      if (cacheAge > sevenDaysMs) {
        return await this.refreshCache(cache, organizationId);
      }

      // Return cached result
      return this.buildResultFromCache(cache);
    }

    // No cache found - build new profile
    return await this.buildNewProfile(patient, organizationId);
  }

  /**
   * Find cached patient record
   */
  private async findCachedPatient(
    patient: PatientIdentifier,
    organizationId: UUID
  ): Promise<RepeatPatientCache | null> {
    const query = this.db('repeat_patient_cache')
      .where('organization_id', organizationId)
      .whereRaw('LOWER(patient_name) = LOWER(?)', [
        `${patient.firstName} ${patient.lastName}`
      ]);

    // If we have DOB, use it for better matching
    if (patient.dateOfBirth) {
      // Note: In production, would need patient_dob column
      // For now, just match by name
    }

    const result = await query.first();
    return result || null;
  }

  /**
   * Build a new patient profile by analyzing transport history
   */
  private async buildNewProfile(
    patient: PatientIdentifier,
    organizationId: UUID
  ): Promise<RepeatPatientResult> {
    // Query incidents for this patient
    const incidents = await this.db('incidents')
      .where('organization_id', organizationId)
      .whereRaw('LOWER(patient_first_name) = LOWER(?)', [patient.firstName])
      .whereRaw('LOWER(patient_last_name) = LOWER(?)', [patient.lastName])
      .where('status', 'COMPLETED')
      .orderBy('created_at', 'desc')
      .limit(100); // Limit to last 100 transports

    if (incidents.length === 0) {
      return {
        isRepeatPatient: false,
        repeatPatientScore: 0,
        recommendations: ['First transport for this patient'],
        transportHistory: {
          total12Months: 0,
          total6Months: 0,
          total3Months: 0,
          primaryDiagnoses: [],
          frequentOrigins: [],
          frequentDestinations: [],
          knownIssues: {
            behavioral: [],
            medical: [],
            access: [],
            crewPreferences: {}
          }
        }
      };
    }

    // Aggregate history
    const history = this.aggregateHistory(incidents);
    const score = this.calculateRepeatScore(history);
    const isRepeat = this.isRepeatPatient(history);

    // Create cache entry if repeat patient
    if (isRepeat) {
      await this.createCache(patient, history, incidents, organizationId);
    }

    return {
      isRepeatPatient: isRepeat,
      repeatPatientScore: score,
      recommendations: this.generateRecommendations(history, score),
      transportHistory: history
    };
  }

  /**
   * Refresh existing cache with latest data
   */
  private async refreshCache(
    cache: RepeatPatientCache,
    organizationId: UUID
  ): Promise<RepeatPatientResult> {
    // Query recent incidents since last update
    const incidents = await this.db('incidents')
      .where('organization_id', organizationId)
      .where('patient_id', cache.patient_id)
      .where('status', 'COMPLETED')
      .where('created_at', '>', cache.last_updated)
      .orderBy('created_at', 'desc');

    if (incidents.length === 0) {
      // No new incidents, return existing cache
      return this.buildResultFromCache(cache);
    }

    // Fetch all incidents for re-aggregation
    const allIncidents = await this.db('incidents')
      .where('organization_id', organizationId)
      .where('patient_id', cache.patient_id)
      .where('status', 'COMPLETED')
      .orderBy('created_at', 'desc')
      .limit(100);

    const history = this.aggregateHistory(allIncidents);
    const score = this.calculateRepeatScore(history);

    // Update cache
    await this.db('repeat_patient_cache')
      .where('id', cache.id)
      .update({
        transport_count_12m: history.total12Months,
        transport_count_6m: history.total6Months,
        transport_count_3m: history.total3Months,
        recent_transport_date: history.recentTransportDate,
        primary_diagnoses: JSON.stringify(history.primaryDiagnoses),
        previous_transport_origins: JSON.stringify(history.frequentOrigins),
        previous_transport_destinations: JSON.stringify(history.frequentDestinations),
        known_behavioral_issues: JSON.stringify(history.knownIssues.behavioral),
        known_medical_issues: JSON.stringify(history.knownIssues.medical),
        known_access_issues: JSON.stringify(history.knownIssues.access),
        crew_preferences: JSON.stringify(history.knownIssues.crewPreferences),
        needs_case_management: score >= 80,
        last_updated: new Date(),
        last_transport_incident_id: allIncidents[0]?.id
      });

    return {
      isRepeatPatient: this.isRepeatPatient(history),
      repeatPatientScore: score,
      recommendations: this.generateRecommendations(history, score),
      transportHistory: history
    };
  }

  /**
   * Aggregate transport history from incidents
   */
  private aggregateHistory(incidents: any[]): TransportHistorySummary {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    let total3Months = 0;
    let total6Months = 0;
    let total12Months = 0;

    const diagnoses: Map<string, number> = new Map();
    const origins: Map<string, number> = new Map();
    const destinations: Map<string, number> = new Map();
    const behavioralIssues: Set<string> = new Set();
    const medicalIssues: Set<string> = new Set();
    const accessIssues: Set<string> = new Set();
    const crewPreferences: Record<string, any> = {};

    for (const incident of incidents) {
      const incidentDate = new Date(incident.created_at);

      if (incidentDate >= threeMonthsAgo) total3Months++;
      if (incidentDate >= sixMonthsAgo) total6Months++;
      if (incidentDate >= twelveMonthsAgo) total12Months++;

      // Aggregate diagnoses
      if (incident.diagnosis) {
        diagnoses.set(incident.diagnosis, (diagnoses.get(incident.diagnosis) || 0) + 1);
      }

      // Aggregate facilities
      if (incident.origin_facility_name) {
        origins.set(incident.origin_facility_name, (origins.get(incident.origin_facility_name) || 0) + 1);
      }
      if (incident.destination_facility_name) {
        destinations.set(incident.destination_facility_name, (destinations.get(incident.destination_facility_name) || 0) + 1);
      }

      // Extract known issues from incident
      if (incident.known_issues) {
        const issues = typeof incident.known_issues === 'string' 
          ? JSON.parse(incident.known_issues) 
          : incident.known_issues;

        if (issues.behavioral) {
          (Array.isArray(issues.behavioral) ? issues.behavioral : [issues.behavioral]).forEach((i: string) => 
            behavioralIssues.add(i)
          );
        }
        if (issues.medical) {
          (Array.isArray(issues.medical) ? issues.medical : [issues.medical]).forEach((i: string) => 
            medicalIssues.add(i)
          );
        }
        if (issues.access) {
          (Array.isArray(issues.access) ? issues.access : [issues.access]).forEach((i: string) => 
            accessIssues.add(i)
          );
        }
        if (issues.crew_preferences) {
          Object.assign(crewPreferences, issues.crew_preferences);
        }
      }
    }

    // Get top diagnoses, origins, destinations
    const topDiagnoses = Array.from(diagnoses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([diagnosis]) => diagnosis);

    const topOrigins = Array.from(origins.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([origin]) => origin);

    const topDestinations = Array.from(destinations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dest]) => dest);

    return {
      total12Months,
      total6Months,
      total3Months,
      recentTransportDate: incidents[0]?.created_at,
      primaryDiagnoses: topDiagnoses,
      frequentOrigins: topOrigins,
      frequentDestinations: topDestinations,
      knownIssues: {
        behavioral: Array.from(behavioralIssues),
        medical: Array.from(medicalIssues),
        access: Array.from(accessIssues),
        crewPreferences
      }
    };
  }

  /**
   * Calculate repeat patient score (0-100)
   */
  private calculateRepeatScore(history: TransportHistorySummary): number {
    let score = 0;

    // Frequency scoring
    if (history.total3Months >= RepeatPatientDetector.HIGH_FREQUENCY_THRESHOLD) {
      score += 40;
    } else if (history.total3Months >= RepeatPatientDetector.REPEAT_THRESHOLD_3M) {
      score += 20;
    }

    if (history.total12Months >= 20) {
      score += 30;
    } else if (history.total12Months >= RepeatPatientDetector.REPEAT_THRESHOLD_12M) {
      score += 15;
    }

    // Known issues scoring
    score += Math.min(15, history.knownIssues.behavioral.length * 5);
    score += Math.min(10, history.knownIssues.medical.length * 3);
    score += Math.min(5, history.knownIssues.access.length * 2);

    return Math.min(100, score);
  }

  /**
   * Determine if patient meets repeat patient criteria
   */
  private isRepeatPatient(history: TransportHistorySummary): boolean {
    return (
      history.total3Months >= RepeatPatientDetector.REPEAT_THRESHOLD_3M ||
      history.total12Months >= RepeatPatientDetector.REPEAT_THRESHOLD_12M
    );
  }

  /**
   * Generate recommendations based on history
   */
  private generateRecommendations(history: TransportHistorySummary, score: number): string[] {
    const recommendations: string[] = [];

    if (history.total3Months >= RepeatPatientDetector.HIGH_FREQUENCY_THRESHOLD) {
      recommendations.push(
        `HIGH FREQUENCY PATIENT: ${history.total3Months} transports in 3 months - case management referral recommended`
      );
    } else if (history.total3Months >= RepeatPatientDetector.REPEAT_THRESHOLD_3M) {
      recommendations.push(
        `Repeat patient: ${history.total3Months} transports in 3 months`
      );
    }

    if (history.primaryDiagnoses.length > 0) {
      recommendations.push(`Primary diagnoses: ${history.primaryDiagnoses.join(', ')}`);
    }

    if (history.knownIssues.behavioral.length > 0) {
      recommendations.push(`Known behavioral issues: ${history.knownIssues.behavioral.join(', ')}`);
    }

    if (history.knownIssues.medical.length > 0) {
      recommendations.push(`Known medical issues: ${history.knownIssues.medical.join(', ')}`);
    }

    if (history.knownIssues.access.length > 0) {
      recommendations.push(`Access considerations: ${history.knownIssues.access.join(', ')}`);
    }

    if (Object.keys(history.knownIssues.crewPreferences).length > 0) {
      recommendations.push('Crew preferences documented - review before assignment');
    }

    if (score >= 80) {
      recommendations.push('URGENT: Case management referral strongly recommended');
    }

    if (history.frequentOrigins.length === 1 && history.frequentDestinations.length === 1) {
      recommendations.push(
        `Regular route: ${history.frequentOrigins[0]} → ${history.frequentDestinations[0]}`
      );
    }

    return recommendations;
  }

  /**
   * Create new cache entry
   */
  private async createCache(
    patient: PatientIdentifier,
    history: TransportHistorySummary,
    incidents: any[],
    organizationId: UUID
  ): Promise<void> {
    const patientId = incidents[0]?.patient_id || this.generatePatientId(patient);

    await this.db('repeat_patient_cache').insert({
      patient_id: patientId,
      patient_name: `${patient.firstName} ${patient.lastName}`,
      transport_count_12m: history.total12Months,
      transport_count_6m: history.total6Months,
      transport_count_3m: history.total3Months,
      recent_transport_date: history.recentTransportDate,
      primary_diagnoses: JSON.stringify(history.primaryDiagnoses),
      previous_transport_origins: JSON.stringify(history.frequentOrigins),
      previous_transport_destinations: JSON.stringify(history.frequentDestinations),
      known_behavioral_issues: JSON.stringify(history.knownIssues.behavioral),
      known_medical_issues: JSON.stringify(history.knownIssues.medical),
      known_access_issues: JSON.stringify(history.knownIssues.access),
      crew_preferences: JSON.stringify(history.knownIssues.crewPreferences),
      needs_case_management: this.calculateRepeatScore(history) >= 80,
      last_updated: new Date(),
      last_transport_incident_id: incidents[0]?.id,
      organization_id: organizationId
    });
  }

  /**
   * Build result from cached data
   */
  private buildResultFromCache(cache: RepeatPatientCache): RepeatPatientResult {
    const history: TransportHistorySummary = {
      total12Months: cache.transport_count_12m || 0,
      total6Months: cache.transport_count_6m || 0,
      total3Months: cache.transport_count_3m || 0,
      recentTransportDate: cache.recent_transport_date,
      primaryDiagnoses: this.parseJsonArray(cache.primary_diagnoses),
      frequentOrigins: this.parseJsonArray(cache.previous_transport_origins),
      frequentDestinations: this.parseJsonArray(cache.previous_transport_destinations),
      knownIssues: {
        behavioral: this.parseJsonArray(cache.known_behavioral_issues),
        medical: this.parseJsonArray(cache.known_medical_issues),
        access: this.parseJsonArray(cache.known_access_issues),
        crewPreferences: this.parseJson(cache.crew_preferences) || {}
      }
    };

    const score = this.calculateRepeatScore(history);

    return {
      isRepeatPatient: this.isRepeatPatient(history),
      repeatPatientScore: score,
      cache,
      recommendations: this.generateRecommendations(history, score),
      transportHistory: history
    };
  }

  /**
   * Generate patient ID from demographics
   */
  private generatePatientId(patient: PatientIdentifier): UUID {
    // In production, use proper UUID generation or MPI lookup
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(`${patient.firstName}${patient.lastName}${patient.dateOfBirth || ''}`)
      .digest('hex');
    
    // Format as UUID v4 style
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  /**
   * Parse JSON array safely
   */
  private parseJsonArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Parse JSON safely
   */
  private parseJson(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
