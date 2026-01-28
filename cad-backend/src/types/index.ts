// ============================================
// CAD Backend - Comprehensive TypeScript Types
// ============================================

// ============================================
// Base & Utility Types
// ============================================

export type UUID = string;
export type Timestamp = Date | string;

export interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// ============================================
// Organization Interface
// ============================================

export interface Organization {
  id: UUID;
  created_at: Timestamp;
  
  // Organization Details
  name: string;
  organization_type?: string;
  timezone: string;
  
  // Configuration
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  suppress_alerts_quiet_hours: boolean;
  training_mode: boolean;
  
  // NEMSIS Compliance
  nemsis_version: string;
  
  // Integration API Keys (encrypted)
  telnyx_api_key_encrypted?: string;
  metriport_api_key_encrypted?: string;
  transportlink_api_key_encrypted?: string;
  
  // Feature Flags
  enable_hems: boolean;
  enable_cct: boolean;
  enable_bariatric: boolean;
  enable_ai_recommendations: boolean;
  enable_repeat_patient_detection: boolean;
  
  // Billing Configuration
  base_ambulance_rate: number;
  mileage_rate: number;
  paramedic_surcharge: number;
  cct_surcharge: number;
  bariatric_surcharge: number;
  hems_charge: number;
  
  // Performance Thresholds
  escalation_unassigned_minutes: number;
  escalation_at_facility_minutes: number;
  
  active: boolean;
}

// ============================================
// Incident Interface
// ============================================

export type TransportType = 'BLS' | 'ALS' | 'CCT' | 'HEMS' | 'BARIATRIC' | 'IFT';
export type IncidentStatus = 
  | 'PENDING'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'AT_FACILITY'
  | 'TRANSPORTING'
  | 'ARRIVED_DESTINATION'
  | 'COMPLETED'
  | 'CANCELLED';
export type AcuityLevel = 'CRITICAL' | 'URGENT' | 'STABLE' | 'ROUTINE';
export type PatientSex = 'M' | 'F' | 'X' | 'U';

export interface Vitals {
  sbp?: number;
  dbp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  spo2?: number;
  gcs?: number;
  pain_level?: number;
}

export interface Insurance {
  carrier?: string;
  policy_number?: string;
  group_number?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  relationship?: string;
}

export interface CrewRequirements {
  requires_paramedic?: boolean;
  requires_cct?: boolean;
  requires_ventilator?: boolean;
  requires_bariatric?: boolean;
  specialty_skills?: string[];
}

export interface CCTOrderDetails {
  drips?: string[];
  ventilator_settings?: Record<string, any>;
  monitoring_requirements?: string[];
  physician_notes?: string;
}

export interface Incident {
  id: UUID;
  incident_number: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  
  // Patient Information
  patient_id?: UUID;
  patient_first_name: string;
  patient_last_name: string;
  patient_dob?: string;
  patient_age?: number;
  patient_sex?: PatientSex;
  patient_weight_lbs?: number;
  
  // Clinical Information
  chief_complaint?: string;
  diagnosis?: string;
  acuity_level?: AcuityLevel;
  current_vitals?: Vitals;
  
  // Transport Details
  transport_type: TransportType;
  origin_facility_id: UUID;
  origin_facility_name?: string;
  origin_address?: string;
  destination_facility_id: UUID;
  destination_facility_name?: string;
  destination_address?: string;
  requested_eta?: Timestamp;
  
  // Medical Necessity & Physician Order
  medical_necessity_reason?: string;
  physician_order_ref?: string;
  ordering_physician_name?: string;
  ordering_physician_credentials?: string;
  ordering_physician_signature_type?: string;
  ordering_physician_signature_time?: Timestamp;
  cct_order_details?: CCTOrderDetails;
  
  // Insurance & Billing
  insurance_primary?: Insurance;
  insurance_secondary?: Insurance;
  patient_responsibility?: number;
  estimated_charge?: number;
  
  // Assignment & Status
  assigned_unit_id?: UUID;
  assigned_crew_ids?: UUID[];
  status: IncidentStatus;
  status_updated_at?: Timestamp;
  
  // Special Needs & Requirements
  crew_requirements?: CrewRequirements;
  special_instructions?: string;
  known_issues?: Record<string, any>;
  repeat_patient: boolean;
  repeat_patient_score?: number;
  
  // Timestamps (set by MDT app)
  time_incident_created?: Timestamp;
  time_unit_assigned?: Timestamp;
  time_en_route?: Timestamp;
  time_at_facility?: Timestamp;
  time_transporting?: Timestamp;
  time_arrived_destination?: Timestamp;
  time_completed?: Timestamp;
  
  // Tracking & Compliance
  locked: boolean;
  training_mode: boolean;
  organization_id: UUID;
  created_by_user_id?: UUID;
}

// ============================================
// Unit Interface
// ============================================

export type UnitType = 'AMBULANCE' | 'HEMS' | 'CCT' | 'BARIATRIC' | 'SUPERVISOR';
export type UnitStatus = 
  | 'AVAILABLE'
  | 'EN_ROUTE'
  | 'AT_FACILITY'
  | 'TRANSPORTING'
  | 'OUT_OF_SERVICE'
  | 'OFF_DUTY';
export type FatigueRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface UnitCapabilities {
  can_do_als?: boolean;
  can_do_cct?: boolean;
  can_do_bariatric?: boolean;
  has_ventilator?: boolean;
  max_weight_capacity_lbs?: number;
  specialty_equipment?: string[];
}

export interface CrewCredentials {
  has_paramedic?: boolean;
  has_rn?: boolean;
  has_cct_certified?: boolean;
  certifications?: string[];
}

export interface SpecialtyRates {
  als_rate?: number;
  cct_rate?: number;
  bariatric_rate?: number;
  hems_rate?: number;
}

export interface Unit {
  id: UUID;
  unit_id_display: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  
  // Unit Details
  unit_type: UnitType;
  unit_name?: string;
  organization_id: UUID;
  
  // Current Status
  status: UnitStatus;
  current_location?: Point;
  location_updated_at?: Timestamp;
  
  // Assignment Tracking
  current_incident_id?: UUID;
  last_incident_id?: UUID;
  incidents_completed_today: number;
  
  // Crew Information
  assigned_crew_ids?: UUID[];
  primary_paramedic_id?: UUID;
  backup_crew_ids?: UUID[];
  
  // Capabilities & Credentials
  capabilities?: UnitCapabilities;
  crew_credentials?: CrewCredentials;
  
  // Scheduling & Fatigue
  shift_start?: Timestamp;
  shift_end?: Timestamp;
  hours_worked_today?: number;
  transport_hours_today?: number;
  last_break_time?: Timestamp;
  fatigue_risk_level?: FatigueRiskLevel;
  
  // Historical Performance
  on_time_arrival_pct?: number;
  average_response_time_min?: number;
  total_incidents_completed?: number;
  compliance_audit_score?: number;
  
  // Telnyx Integration
  crew_phone_numbers?: Record<string, string>;
  
  // Billing & Cost
  base_rate?: number;
  specialty_rates?: SpecialtyRates;
  
  // Maintenance & Status
  last_maintenance?: Timestamp;
  maintenance_due_date?: Timestamp;
  vehicle_fuel_level?: number;
}

// ============================================
// Crew Interface
// ============================================

export type EMTLevel = 'EMT-B' | 'AEMT' | 'PARAMEDIC' | 'RN' | 'PA' | 'MD';

export interface Certifications {
  acls?: boolean;
  pals?: boolean;
  phtls?: boolean;
  nrp?: boolean;
  cct?: boolean;
  flight_paramedic?: boolean;
  other?: string[];
}

export interface CertificationExpiry {
  acls_expiry?: string;
  pals_expiry?: string;
  phtls_expiry?: string;
  nrp_expiry?: string;
  cct_expiry?: string;
  emt_license_expiry?: string;
}

export interface Crew {
  id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  
  // Personal Info
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  
  // Credentials & Certifications
  emt_level?: EMTLevel;
  certifications?: Certifications;
  certification_expiry?: CertificationExpiry;
  
  // Scope of Practice
  can_do_cct: boolean;
  can_handle_ventilator: boolean;
  can_handle_bariatric: boolean;
  specialty_skills?: string[];
  
  // Current Assignment
  assigned_unit_id?: UUID;
  current_incident_id?: UUID;
  
  // Shift & Fatigue
  current_shift_start?: Timestamp;
  current_shift_end?: Timestamp;
  hours_worked_today?: number;
  transport_hours_today?: number;
  last_break_time?: Timestamp;
  
  // Performance & History
  total_incidents: number;
  on_time_rate?: number;
  compliance_violations: number;
  known_issues?: Record<string, any>;
  
  // Organization
  organization_id: UUID;
}

// ============================================
// Timeline Event Interface
// ============================================

export type EventType = 
  | 'INCIDENT_CREATED'
  | 'UNIT_ASSIGNED'
  | 'UNIT_EN_ROUTE'
  | 'UNIT_AT_FACILITY'
  | 'PATIENT_LOADED'
  | 'TRANSPORTING'
  | 'ARRIVED_DESTINATION'
  | 'PATIENT_TRANSFERRED'
  | 'INCIDENT_COMPLETED'
  | 'INCIDENT_CANCELLED'
  | 'STATUS_CHANGED'
  | 'CREW_CHANGED'
  | 'MEDICAL_UPDATE'
  | 'NOTE_ADDED'
  | 'ALERT_SENT'
  | 'COMPLIANCE_FLAG';

export type TriggeredBy = 'USER' | 'SYSTEM' | 'MDT' | 'API' | 'AUTO';

export interface TimelineEvent {
  id: UUID;
  incident_id: UUID;
  created_at: Timestamp;
  
  // Event Details
  event_type: EventType;
  event_timestamp: Timestamp;
  
  // Actor Information
  triggered_by?: TriggeredBy;
  triggered_by_user_id?: UUID;
  triggered_by_unit_id?: UUID;
  
  // Event Content
  event_data?: Record<string, any>;
  event_description?: string;
  
  // Related Records
  unit_id?: UUID;
  crew_id?: UUID;
  
  // Compliance & Audit
  organization_id: UUID;
  is_immutable: boolean;
}

// ============================================
// Charges Interface
// ============================================

export type ClaimStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'DENIED' | 'PARTIALLY_PAID' | 'PAID';
export type BillingStatus = 'DRAFT' | 'READY' | 'SUBMITTED' | 'PROCESSING' | 'COMPLETED';

export interface ProcedureCode {
  code: string;
  description?: string;
  quantity?: number;
  charge?: number;
}

export interface Charges {
  id: UUID;
  incident_id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  
  // Base Charges
  base_ambulance_fee?: number;
  mileage_miles?: number;
  mileage_rate_per_mile?: number;
  mileage_charge?: number;
  
  // Specialty Surcharges
  emt_paramedic_surcharge?: number;
  cct_service_surcharge?: number;
  bariatric_surcharge?: number;
  hems_charge?: number;
  night_surcharge?: number;
  holiday_surcharge?: number;
  mutual_aid_fee?: number;
  
  // Time-Based Charges
  transport_duration_minutes?: number;
  hourly_rate?: number;
  time_based_charge?: number;
  
  // Procedure Codes
  procedures?: ProcedureCode[];
  
  // Total Calculation
  subtotal?: number;
  
  // Insurance & Patient Responsibility
  insurance_primary?: Insurance;
  insurance_secondary?: Insurance;
  allowed_amount?: number;
  patient_responsibility?: number;
  insurance_payment_expected?: number;
  
  // Telnyx Communication Costs
  telnyx_voice_call_minutes?: number;
  telnyx_voice_call_cost?: number;
  telnyx_sms_count?: number;
  telnyx_sms_cost?: number;
  
  // Final Total
  total_charge?: number;
  
  // Claim & Status
  claim_id?: string;
  claim_status?: ClaimStatus;
  billing_status?: BillingStatus;
  
  organization_id: UUID;
  locked: boolean;
}

// ============================================
// Medical Necessity Evidence Interface
// ============================================

export interface HemodynamicIssues {
  unstable_vitals?: boolean;
  cardiac_monitoring_required?: boolean;
  vasoactive_drips?: boolean;
  details?: string;
}

export interface CCTInterventions {
  mechanical_ventilation?: boolean;
  balloon_pump?: boolean;
  continuous_drips?: string[];
  other?: string[];
}

export interface ComplexDiagnosis {
  diagnoses?: string[];
  icd10_codes?: string[];
}

export interface BariatricEquipment {
  bariatric_stretcher?: boolean;
  lift_equipment?: boolean;
  extra_personnel?: boolean;
  specialized_ambulance?: boolean;
}

export interface WeatherConditions {
  temperature?: number;
  wind_speed_mph?: number;
  visibility_miles?: number;
  conditions?: string;
  safe_for_flight?: boolean;
}

export interface MedicalNecessityEvidence {
  id: UUID;
  incident_id: UUID;
  created_at: Timestamp;
  transport_type: TransportType;
  
  // IFT Evidence
  ift_justification?: string;
  
  // CCT Evidence
  cct_physician_order_ref?: string;
  cct_physician_name?: string;
  cct_physician_credentials?: string;
  cct_hemodynamic_issues?: HemodynamicIssues;
  cct_interventions?: CCTInterventions;
  cct_complex_diagnosis?: ComplexDiagnosis;
  
  // Bariatric Evidence
  bariatric_weight_lbs?: number;
  bariatric_mobility_issues?: string;
  bariatric_equipment_required?: BariatricEquipment;
  
  // HEMS Evidence
  hems_distance_miles?: number;
  hems_ground_eta_minutes?: number;
  hems_air_eta_minutes?: number;
  hems_time_saved_minutes?: number;
  hems_acuity_justification?: string;
  hems_weather_conditions?: WeatherConditions;
  hems_weather_suitable?: boolean;
  hems_medical_justification_code?: string;
  
  justification_narrative?: string;
  organization_id: UUID;
  is_approved: boolean;
}

// ============================================
// Repeat Patient Cache Interface
// ============================================

export interface RepeatPatientCache {
  id: UUID;
  patient_id: UUID;
  patient_name?: string;
  
  transport_count_12m?: number;
  transport_count_6m?: number;
  transport_count_3m?: number;
  recent_transport_date?: string;
  
  primary_diagnoses?: string[];
  previous_transport_origins?: string[];
  previous_transport_destinations?: string[];
  known_behavioral_issues?: string[];
  known_medical_issues?: string[];
  known_access_issues?: string[];
  crew_preferences?: Record<string, any>;
  
  needs_case_management: boolean;
  last_case_management_referral?: string;
  last_updated: Timestamp;
  last_transport_incident_id?: UUID;
  organization_id: UUID;
}

// ============================================
// API Request & Response Types
// ============================================

// Common API Response Wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: Timestamp;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Incident API Types
export interface CreateIncidentRequest {
  patient_first_name: string;
  patient_last_name: string;
  patient_dob?: string;
  patient_age?: number;
  patient_sex?: PatientSex;
  patient_weight_lbs?: number;
  transport_type: TransportType;
  origin_facility_id: UUID;
  destination_facility_id: UUID;
  chief_complaint?: string;
  diagnosis?: string;
  acuity_level?: AcuityLevel;
  current_vitals?: Vitals;
  insurance_primary?: Insurance;
  insurance_secondary?: Insurance;
  crew_requirements?: CrewRequirements;
  special_instructions?: string;
  requested_eta?: Timestamp;
  medical_necessity_reason?: string;
  physician_order_ref?: string;
  ordering_physician_name?: string;
  cct_order_details?: CCTOrderDetails;
}

export interface UpdateIncidentRequest {
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  patient_age?: number;
  patient_sex?: PatientSex;
  patient_weight_lbs?: number;
  transport_type?: TransportType;
  chief_complaint?: string;
  diagnosis?: string;
  acuity_level?: AcuityLevel;
  current_vitals?: Vitals;
  insurance_primary?: Insurance;
  insurance_secondary?: Insurance;
  special_instructions?: string;
  requested_eta?: Timestamp;
  status?: IncidentStatus;
}

export interface AssignUnitRequest {
  incident_id: UUID;
  unit_id: UUID;
  crew_ids?: UUID[];
}

export interface UpdateIncidentStatusRequest {
  incident_id: UUID;
  status: IncidentStatus;
  timestamp?: Timestamp;
  notes?: string;
}

export interface IncidentQueryParams {
  organization_id?: UUID;
  status?: IncidentStatus | IncidentStatus[];
  transport_type?: TransportType;
  assigned_unit_id?: UUID;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Unit API Types
export interface CreateUnitRequest {
  unit_id_display: string;
  unit_type: UnitType;
  unit_name?: string;
  capabilities?: UnitCapabilities;
  base_rate?: number;
  specialty_rates?: SpecialtyRates;
}

export interface UpdateUnitRequest {
  unit_name?: string;
  status?: UnitStatus;
  current_location?: Point;
  assigned_crew_ids?: UUID[];
  capabilities?: UnitCapabilities;
  shift_start?: Timestamp;
  shift_end?: Timestamp;
}

export interface UpdateUnitLocationRequest {
  unit_id: UUID;
  latitude: number;
  longitude: number;
  timestamp?: Timestamp;
}

export interface UnitQueryParams {
  organization_id?: UUID;
  status?: UnitStatus | UnitStatus[];
  unit_type?: UnitType;
  available_only?: boolean;
  page?: number;
  per_page?: number;
}

// Crew API Types
export interface CreateCrewRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  emt_level?: EMTLevel;
  certifications?: Certifications;
  certification_expiry?: CertificationExpiry;
  can_do_cct?: boolean;
  can_handle_ventilator?: boolean;
  can_handle_bariatric?: boolean;
  specialty_skills?: string[];
}

export interface UpdateCrewRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  emt_level?: EMTLevel;
  certifications?: Certifications;
  certification_expiry?: CertificationExpiry;
  can_do_cct?: boolean;
  can_handle_ventilator?: boolean;
  can_handle_bariatric?: boolean;
  specialty_skills?: string[];
  assigned_unit_id?: UUID;
  current_shift_start?: Timestamp;
  current_shift_end?: Timestamp;
}

export interface CrewQueryParams {
  organization_id?: UUID;
  emt_level?: EMTLevel;
  available_only?: boolean;
  can_do_cct?: boolean;
  assigned_unit_id?: UUID;
  page?: number;
  per_page?: number;
}

// Timeline Event API Types
export interface CreateTimelineEventRequest {
  incident_id: UUID;
  event_type: EventType;
  event_timestamp?: Timestamp;
  triggered_by?: TriggeredBy;
  triggered_by_user_id?: UUID;
  triggered_by_unit_id?: UUID;
  event_data?: Record<string, any>;
  event_description?: string;
  unit_id?: UUID;
  crew_id?: UUID;
}

export interface TimelineEventQueryParams {
  incident_id?: UUID;
  event_type?: EventType | EventType[];
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

// Charges API Types
export interface CreateChargesRequest {
  incident_id: UUID;
  base_ambulance_fee?: number;
  mileage_miles?: number;
  mileage_rate_per_mile?: number;
  emt_paramedic_surcharge?: number;
  cct_service_surcharge?: number;
  bariatric_surcharge?: number;
  hems_charge?: number;
  night_surcharge?: number;
  holiday_surcharge?: number;
  transport_duration_minutes?: number;
  procedures?: ProcedureCode[];
  insurance_primary?: Insurance;
  insurance_secondary?: Insurance;
}

export interface UpdateChargesRequest {
  base_ambulance_fee?: number;
  mileage_miles?: number;
  mileage_rate_per_mile?: number;
  emt_paramedic_surcharge?: number;
  cct_service_surcharge?: number;
  bariatric_surcharge?: number;
  hems_charge?: number;
  procedures?: ProcedureCode[];
  insurance_primary?: Insurance;
  insurance_secondary?: Insurance;
  patient_responsibility?: number;
  claim_status?: ClaimStatus;
  billing_status?: BillingStatus;
}

export interface CalculateChargesRequest {
  transport_type: TransportType;
  mileage_miles: number;
  transport_duration_minutes?: number;
  has_paramedic?: boolean;
  is_night_transport?: boolean;
  is_holiday?: boolean;
  procedures?: ProcedureCode[];
}

export interface CalculateChargesResponse {
  base_ambulance_fee: number;
  mileage_charge: number;
  emt_paramedic_surcharge: number;
  cct_service_surcharge: number;
  bariatric_surcharge: number;
  hems_charge: number;
  night_surcharge: number;
  holiday_surcharge: number;
  time_based_charge: number;
  procedure_charges: number;
  subtotal: number;
  total_charge: number;
  breakdown: Array<{ item: string; amount: number }>;
}

// Medical Necessity API Types
export interface CreateMedicalNecessityRequest {
  incident_id: UUID;
  transport_type: TransportType;
  ift_justification?: string;
  cct_physician_order_ref?: string;
  cct_physician_name?: string;
  cct_physician_credentials?: string;
  cct_hemodynamic_issues?: HemodynamicIssues;
  cct_interventions?: CCTInterventions;
  cct_complex_diagnosis?: ComplexDiagnosis;
  bariatric_weight_lbs?: number;
  bariatric_mobility_issues?: string;
  bariatric_equipment_required?: BariatricEquipment;
  hems_distance_miles?: number;
  hems_ground_eta_minutes?: number;
  hems_air_eta_minutes?: number;
  hems_acuity_justification?: string;
  hems_weather_conditions?: WeatherConditions;
  hems_medical_justification_code?: string;
  justification_narrative?: string;
}

// Repeat Patient API Types
export interface CheckRepeatPatientRequest {
  patient_first_name: string;
  patient_last_name: string;
  patient_dob?: string;
}

export interface RepeatPatientResponse {
  is_repeat_patient: boolean;
  repeat_patient_score?: number;
  patient_cache?: RepeatPatientCache;
  recommendations?: string[];
}

// Organization API Types
export interface CreateOrganizationRequest {
  name: string;
  organization_type?: string;
  timezone?: string;
  nemsis_version?: string;
  enable_hems?: boolean;
  enable_cct?: boolean;
  enable_bariatric?: boolean;
  base_ambulance_rate?: number;
  mileage_rate?: number;
  paramedic_surcharge?: number;
  cct_surcharge?: number;
  bariatric_surcharge?: number;
  hems_charge?: number;
}

export interface UpdateOrganizationRequest {
  name?: string;
  organization_type?: string;
  timezone?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  suppress_alerts_quiet_hours?: boolean;
  training_mode?: boolean;
  nemsis_version?: string;
  enable_hems?: boolean;
  enable_cct?: boolean;
  enable_bariatric?: boolean;
  enable_ai_recommendations?: boolean;
  enable_repeat_patient_detection?: boolean;
  base_ambulance_rate?: number;
  mileage_rate?: number;
  paramedic_surcharge?: number;
  cct_surcharge?: number;
  bariatric_surcharge?: number;
  hems_charge?: number;
  escalation_unassigned_minutes?: number;
  escalation_at_facility_minutes?: number;
  active?: boolean;
}

// Dashboard & Analytics Types
export interface DashboardStats {
  active_incidents: number;
  available_units: number;
  units_on_scene: number;
  units_transporting: number;
  incidents_completed_today: number;
  average_response_time_today: number;
  compliance_score: number;
  revenue_today: number;
}

export interface IncidentMetrics {
  total_incidents: number;
  by_status: Record<IncidentStatus, number>;
  by_transport_type: Record<TransportType, number>;
  average_response_time: number;
  average_transport_time: number;
  on_time_percentage: number;
}

export interface UnitMetrics {
  total_units: number;
  by_status: Record<UnitStatus, number>;
  by_type: Record<UnitType, number>;
  utilization_rate: number;
  average_incidents_per_unit: number;
}

export interface FinancialMetrics {
  total_revenue: number;
  total_charges: number;
  by_transport_type: Record<TransportType, number>;
  insurance_collected: number;
  patient_collected: number;
  pending_claims: number;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: Timestamp;
  organization_id?: UUID;
}

export interface IncidentUpdateEvent extends WebSocketEvent {
  type: 'INCIDENT_UPDATE';
  payload: {
    incident: Incident;
    previous_status?: IncidentStatus;
  };
}

export interface UnitUpdateEvent extends WebSocketEvent {
  type: 'UNIT_UPDATE';
  payload: {
    unit: Unit;
    previous_status?: UnitStatus;
  };
}

export interface AlertEvent extends WebSocketEvent {
  type: 'ALERT';
  payload: {
    alert_type: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    incident_id?: UUID;
    unit_id?: UUID;
  };
}

// Error Response Types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  validation_errors?: ValidationError[];
  timestamp: Timestamp;
}

// ============================================
// Exports
// ============================================

export type {
  // Core Entities
  Organization,
  Incident,
  Unit,
  Crew,
  TimelineEvent,
  Charges,
  MedicalNecessityEvidence,
  RepeatPatientCache,
  
  // Enums & Status Types
  TransportType,
  IncidentStatus,
  UnitStatus,
  UnitType,
  EMTLevel,
  EventType,
  ClaimStatus,
  BillingStatus,
  AcuityLevel,
  PatientSex,
  FatigueRiskLevel,
  TriggeredBy,
  
  // Nested Types
  Vitals,
  Insurance,
  CrewRequirements,
  CCTOrderDetails,
  UnitCapabilities,
  CrewCredentials,
  SpecialtyRates,
  Certifications,
  CertificationExpiry,
  ProcedureCode,
  HemodynamicIssues,
  CCTInterventions,
  ComplexDiagnosis,
  BariatricEquipment,
  WeatherConditions,
  
  // API Types
  APIResponse,
  PaginatedResponse,
  ErrorResponse,
  ValidationError,
  
  // Request Types
  CreateIncidentRequest,
  UpdateIncidentRequest,
  AssignUnitRequest,
  UpdateIncidentStatusRequest,
  CreateUnitRequest,
  UpdateUnitRequest,
  UpdateUnitLocationRequest,
  CreateCrewRequest,
  UpdateCrewRequest,
  CreateTimelineEventRequest,
  CreateChargesRequest,
  UpdateChargesRequest,
  CalculateChargesRequest,
  CreateMedicalNecessityRequest,
  CheckRepeatPatientRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  
  // Response Types
  CalculateChargesResponse,
  RepeatPatientResponse,
  
  // Query Params
  IncidentQueryParams,
  UnitQueryParams,
  CrewQueryParams,
  TimelineEventQueryParams,
  
  // Metrics & Analytics
  DashboardStats,
  IncidentMetrics,
  UnitMetrics,
  FinancialMetrics,
  
  // WebSocket Events
  WebSocketEvent,
  IncidentUpdateEvent,
  UnitUpdateEvent,
  AlertEvent,
};
