// Business Logic Services
export { MedicalNecessityValidator } from './MedicalNecessityValidator';
export type { ValidationResult } from './MedicalNecessityValidator';

export { AssignmentEngine } from './AssignmentEngine';
export type { 
  UnitScore, 
  AssignmentRecommendation 
} from './AssignmentEngine';

export { RepeatPatientDetector } from './RepeatPatientDetector';
export type {
  PatientIdentifier,
  RepeatPatientResult,
  TransportHistorySummary,
  KnownIssuesAggregate
} from './RepeatPatientDetector';

export { BillingCalculator } from './BillingCalculator';
export type {
  ChargeCalculation,
  ChargeLineItem,
  CalculateChargesParams,
  InsuranceProcessingResult
} from './BillingCalculator';

export { EscalationManager } from './EscalationManager';
export type {
  EscalationAlert,
  EscalationType,
  EscalationRule,
  EscalationMonitorConfig
} from './EscalationManager';

export { TelnyxService } from './TelnyxService';
export type {
  VoiceCallParams,
  SMSParams,
  CallResult,
  SMSResult,
  CommunicationLog
} from './TelnyxService';

export { MetriportService } from './MetriportService';
export type {
  PatientSearchParams,
  PatientSearchResult,
  PatientDemographics,
  ConsolidatedRecordResult,
  PatientHistorySummary,
  MedicalRecord
} from './MetriportService';
