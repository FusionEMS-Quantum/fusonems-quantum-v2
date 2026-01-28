export interface Incident {
  id?: string
  incident_number?: string
  patient_first_name: string
  patient_last_name: string
  patient_dob: string
  patient_gender: string
  patient_mrn?: string
  pickup_address: string
  pickup_facility?: string
  pickup_location: { type: string; coordinates: [number, number] }
  destination_address: string
  destination_facility?: string
  destination_location: { type: string; coordinates: [number, number] }
  transport_type: 'IFT' | 'CCT' | 'Bariatric' | 'HEMS'
  acuity_level: 'ESI-1' | 'ESI-2' | 'ESI-3' | 'ESI-4' | 'ESI-5'
  diagnosis: string
  medical_necessity_justification: string
  status?: string
  assigned_unit_id?: string
  special_requirements: {
    oxygen?: boolean
    suction?: boolean
    monitor?: boolean
    defibrillator?: boolean
    ventilator?: boolean
    iv_pump?: boolean
    wheelchair?: boolean
    stretcher?: boolean
  }
  vitals?: {
    systolic_bp?: number
    diastolic_bp?: number
    heart_rate?: number
    respiratory_rate?: number
    spo2?: number
    temperature?: number
    gcs?: number
  }
  cct_physician_order?: string
  cct_justification?: string
  bariatric_weight_lbs?: number
  hems_weather_check?: string
  hems_flight_justification?: string
}

export interface Unit {
  id: string
  name: string
  type: 'ALS' | 'BLS' | 'CCT' | 'HEMS'
  status: 'available' | 'assigned' | 'en_route' | 'at_scene' | 'transporting' | 'at_facility' | 'out_of_service'
  current_location?: { type: string; coordinates: [number, number] }
  current_incident_id?: string
  capabilities: string[]
  heading?: number
  speed?: number
  last_location_update?: string
}

export interface Recommendation {
  unit: Unit
  score: number
  score_breakdown: {
    distance_score: number
    qualification_score: number
    performance_score: number
    fatigue_score: number
  }
  distance_miles: number
  eta_minutes: number
}

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  speed?: number | null
  heading?: number | null
}

export interface GeofenceZone {
  center: [number, number]
  radius: number
  type: 'pickup' | 'destination'
  incidentId: string
}
