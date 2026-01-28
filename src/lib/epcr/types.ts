// Core ePCR Types

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  gender: string;
  phone?: string;
  address?: string;
}

export interface EpcrRecord {
  id: string;
  record_id: string;
  variant: "EMS" | "FIRE" | "HEMS";
  patient: Patient;
  incident_id: string;
  unit_id?: string;
  crew?: string[];
  status: "DRAFT" | "IN_PROGRESS" | "VALIDATION" | "POSTED" | "LOCKED";
  chief_complaint: string;
  created_at: string;
  updated_at: string;
  posted_at?: string;
}

export interface Vitals {
  timestamp: string;
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  respiratory_rate?: number;
  spO2?: number;
  temperature?: number;
  glucose?: number;
  end_tidal_co2?: number;
  notes?: string;
}

export interface Assessment {
  chief_complaint: string;
  history_of_present_illness: string;
  medications: string[];
  allergies: string[];
  past_medical_history: string[];
  physical_exam_findings: string;
}

export interface Intervention {
  id: string;
  timestamp: string;
  type: string; // "IV", "Airway", "Decompression", etc.
  location?: string;
  success: boolean;
  attempts?: number;
  notes?: string;
}

export interface Medication {
  id: string;
  timestamp: string;
  name: string;
  dose: string;
  route: string;
  ndc_code?: string;
  administered_by: string;
  confidence?: number;
}

export interface OcrSnapshot {
  id: string;
  type: "MONITOR" | "MEDICATION" | "ID" | "INSURANCE" | "EKG" | "LAB";
  timestamp: string;
  image_base64: string;
  extracted_data: Record<string, unknown>;
  confidence: number;
  manual_confirmed: boolean;
}

export interface PreArrivalNotification {
  id: string;
  timestamp: string;
  hospital_name: string;
  hospital_phone: string;
  hospital_address: string;
  eta_minutes: number;
  triggered_at: string;
  acknowledged_at?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface ProtocolSuggestion {
  protocol: "BLS" | "ALS" | "PALS" | "NRP" | "TPATC";
  confidence: number;
  reasoning: string;
  suggested_fields: string[];
}
