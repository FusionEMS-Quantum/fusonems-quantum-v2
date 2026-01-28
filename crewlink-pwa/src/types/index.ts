export type ServiceLevel = 'BLS' | 'ALS' | 'CCT' | 'SPECIALTY' | 'HEMS_SCENE' | 'HEMS_IFT'

export type TripPriority = 'ROUTINE' | 'URGENT' | 'EMERGENT' | 'STAT'

export type TripStatus = 
  | 'PENDING'
  | 'ACKNOWLEDGED'
  | 'UNABLE_TO_RESPOND'
  | 'PATIENT_CONTACT'
  | 'COMPLETED'
  | 'CANCELLED'

export type UnableToRespondReason =
  | 'ALREADY_ASSIGNED'
  | 'OUT_OF_SERVICE'
  | 'CREW_UNAVAILABLE'
  | 'EQUIPMENT_UNAVAILABLE'
  | 'SAFETY_CONCERN'
  | 'OTHER'

export const UNABLE_TO_RESPOND_REASONS: Record<UnableToRespondReason, string> = {
  ALREADY_ASSIGNED: 'Already assigned',
  OUT_OF_SERVICE: 'Out of service',
  CREW_UNAVAILABLE: 'Crew unavailable',
  EQUIPMENT_UNAVAILABLE: 'Equipment unavailable',
  SAFETY_CONCERN: 'Safety concern',
  OTHER: 'Other',
}

export type CrewStatus = 
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'BUSY'
  | 'OFF_DUTY'
  | 'ON_BREAK'

export type NEMSISCrewRole = 
  | 'EMT_BASIC'
  | 'EMT_ADVANCED'
  | 'PARAMEDIC'
  | 'DRIVER'
  | 'FLIGHT_NURSE'
  | 'FLIGHT_PARAMEDIC'
  | 'PILOT'
  | 'CCT_NURSE'
  | 'CCT_PARAMEDIC'
  | 'PHYSICIAN'
  | 'RESPIRATORY_THERAPIST'
  | 'OTHER'

export type NEMSISResponseRole = 
  | 'DRIVER_ATTENDANT'
  | 'PATIENT_ATTENDANT'
  | 'LEAD_ATTENDANT'
  | 'OTHER_ATTENDANT'

export interface CrewRoleConfig {
  code: NEMSISCrewRole
  label: string
  nemsisCrewMemberLevel: string
  nemsisResponseRole: NEMSISResponseRole
  isHEMS: boolean
  isGround: boolean
  canSeePilotInfo: boolean
  canSeeFlightInfo: boolean
}

export const CREW_ROLES: CrewRoleConfig[] = [
  { code: 'EMT_BASIC', label: 'EMT-Basic', nemsisCrewMemberLevel: '9925001', nemsisResponseRole: 'PATIENT_ATTENDANT', isHEMS: false, isGround: true, canSeePilotInfo: false, canSeeFlightInfo: false },
  { code: 'EMT_ADVANCED', label: 'EMT-Advanced/Intermediate', nemsisCrewMemberLevel: '9925003', nemsisResponseRole: 'PATIENT_ATTENDANT', isHEMS: false, isGround: true, canSeePilotInfo: false, canSeeFlightInfo: false },
  { code: 'PARAMEDIC', label: 'Paramedic', nemsisCrewMemberLevel: '9925005', nemsisResponseRole: 'LEAD_ATTENDANT', isHEMS: false, isGround: true, canSeePilotInfo: false, canSeeFlightInfo: false },
  { code: 'DRIVER', label: 'Driver/EMT', nemsisCrewMemberLevel: '9925001', nemsisResponseRole: 'DRIVER_ATTENDANT', isHEMS: false, isGround: true, canSeePilotInfo: false, canSeeFlightInfo: false },
  { code: 'FLIGHT_NURSE', label: 'Flight Nurse (RN)', nemsisCrewMemberLevel: '9925023', nemsisResponseRole: 'LEAD_ATTENDANT', isHEMS: true, isGround: false, canSeePilotInfo: false, canSeeFlightInfo: true },
  { code: 'FLIGHT_PARAMEDIC', label: 'Flight Paramedic', nemsisCrewMemberLevel: '9925005', nemsisResponseRole: 'PATIENT_ATTENDANT', isHEMS: true, isGround: false, canSeePilotInfo: false, canSeeFlightInfo: true },
  { code: 'PILOT', label: 'Pilot', nemsisCrewMemberLevel: '9925039', nemsisResponseRole: 'OTHER_ATTENDANT', isHEMS: true, isGround: false, canSeePilotInfo: true, canSeeFlightInfo: true },
  { code: 'CCT_NURSE', label: 'CCT Nurse (RN)', nemsisCrewMemberLevel: '9925023', nemsisResponseRole: 'LEAD_ATTENDANT', isHEMS: false, isGround: true, canSeePilotInfo: false, canSeeFlightInfo: false },
  { code: 'CCT_PARAMEDIC', label: 'CCT Paramedic', nemsisCrewMemberLevel: '9925005', nemsisResponseRole: 'PATIENT_ATTENDANT', isHEMS: false, isGround: true, canSeePilotInfo: false, canSeeFlightInfo: false },
  { code: 'RESPIRATORY_THERAPIST', label: 'Respiratory Therapist', nemsisCrewMemberLevel: '9925029', nemsisResponseRole: 'PATIENT_ATTENDANT', isHEMS: false, isGround: true, canSeePilotInfo: false, canSeeFlightInfo: false },
]

export interface TripRequest {
  id: string
  trip_number: string
  service_level: ServiceLevel
  priority: TripPriority
  status: TripStatus
  
  patient_first_name: string
  patient_last_name: string
  patient_dob: string
  patient_weight_kg: number | null
  
  pickup_facility: string
  pickup_address: string
  pickup_floor_room: string
  pickup_contact: string
  pickup_phone: string
  pickup_lat: number | null
  pickup_lng: number | null
  
  destination_facility: string
  destination_address: string
  destination_floor_room: string
  destination_contact: string
  destination_phone: string
  destination_lat: number | null
  destination_lng: number | null
  
  scheduled_time: string | null
  appointment_time: string | null
  requested_time: string | null
  
  chief_complaint: string
  special_needs: string[]
  equipment_needed: string[]
  isolation_precautions: string | null
  oxygen_required: boolean
  oxygen_lpm: number | null
  iv_required: boolean
  monitor_required: boolean
  ventilator_required: boolean
  
  notes: string
  dispatch_notes: string
  
  authorization_number: string | null
  pcs_on_file: boolean
  
  created_at: string
  acknowledged_at: string | null
  patient_contact_at: string | null
  assigned_unit: string | null
  assigned_crew: string[]
}

export interface HEMSFlightRequest extends TripRequest {
  scene_coordinates: { lat: number; lng: number } | null
  scene_landing_zone: string
  scene_lz_obstructions: string[]
  scene_weather: WeatherData | null
  destination_helipad: string
  destination_weather: WeatherData | null
  frat_score: number | null
  frat_completed: boolean
  go_no_go_decision: 'PENDING' | 'GO' | 'NO_GO' | null
  notams: NOTAM[]
  estimated_flight_time_min: number | null
  fuel_required_gal: number | null
}

export interface WeatherData {
  station: string
  raw_metar: string
  temperature_c: number
  dewpoint_c: number
  wind_direction: number
  wind_speed_kt: number
  wind_gust_kt: number | null
  visibility_sm: number
  ceiling_ft: number | null
  conditions: string
  flight_category: 'VFR' | 'MVFR' | 'IFR' | 'LIFR'
  observed_at: string
}

export interface NOTAM {
  id: string
  type: string
  location: string
  text: string
  effective_start: string
  effective_end: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface PTTChannel {
  id: string
  name: string
  type: 'DISPATCH' | 'TAC' | 'OPS' | 'ADMIN' | 'MEDICAL_CONTROL'
  is_default: boolean
  members_count: number
}

export interface PTTMessage {
  id: string
  channel_id: string
  sender_id: string
  sender_name: string
  audio_url: string
  duration_sec: number
  timestamp: string
  is_emergency: boolean
}

export interface TextMessage {
  id: string
  sender_id: string
  sender_name: string
  recipient_id: string | null
  channel_id: string | null
  content: string
  attachments: string[]
  timestamp: string
  read_at: string | null
  is_canned: boolean
}

export interface CrewMember {
  id: string
  name: string
  role: NEMSISCrewRole
  response_role: NEMSISResponseRole
  status: CrewStatus
  unit_id: string | null
  phone: string
}

export interface OnlineCrewMember extends CrewMember {
  is_online: boolean
  last_seen: string | null
  current_trip_id: string | null
}

export interface DutyStatus {
  on_duty_since: string
  total_hours_today: number
  total_hours_7_day: number
  total_hours_30_day: number
  max_hours_7_day: number
  max_hours_30_day: number
  rest_required_hours: number
  next_required_rest: string | null
  is_compliant: boolean
  warnings: string[]
}

export interface TripHistoryItem {
  id: string
  trip_number: string
  service_level: ServiceLevel
  priority: TripPriority
  pickup_facility: string
  destination_facility: string
  patient_name: string
  acknowledged_at: string
  patient_contact_at: string | null
  completed_at: string | null
  status: TripStatus
}

export interface HospitalDirectory {
  id: string
  name: string
  type: 'HOSPITAL' | 'CLINIC' | 'NURSING_FACILITY' | 'DIALYSIS' | 'HELIPAD' | 'OTHER'
  address: string
  city: string
  state: string
  zip: string
  main_phone: string
  er_phone: string | null
  dispatch_phone: string | null
  helipad_radio_freq: string | null
  helipad_phone: string | null
  latitude: number | null
  longitude: number | null
  is_trauma_center: boolean
  trauma_level: 'I' | 'II' | 'III' | 'IV' | null
  is_stroke_center: boolean
  is_stemi_center: boolean
  is_burn_center: boolean
  is_peds_center: boolean
  notes: string
}

export interface ScannedDocument {
  id: string
  document_type: 'FACESHEET' | 'PCS_FORM' | 'AOB_FORM' | 'DNR' | 'OTHER'
  image_data: string
  ocr_text: string | null
  ocr_confidence: number | null
  ocr_fields: Record<string, string>
  trip_id: string | null
  epcr_id: string | null
  queued: boolean
  scanned_at: string
  scanned_by: string
}

export interface NEMSISTimestamp {
  psUnitNotifiedByDispatch: string | null
  psUnitEnRouteDateTime: string | null
  psUnitArrivedOnSceneDateTime: string | null
  psPatientContactDateTime: string | null
  psUnitLeftSceneDateTime: string | null
  psPatientArrivedAtDestinationDateTime: string | null
  psUnitBackInServiceDateTime: string | null
}
