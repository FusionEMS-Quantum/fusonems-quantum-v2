export interface Incident {
  id: string
  incident_number: string
  patient_first_name: string
  patient_last_name: string
  patient_dob: string
  patient_gender: string
  pickup_address: string
  pickup_facility?: string
  pickup_location: { type: string; coordinates: [number, number] }
  destination_address: string
  destination_facility?: string
  destination_location: { type: string; coordinates: [number, number] }
  transport_type: 'IFT' | 'CCT' | 'Bariatric' | 'HEMS'
  acuity_level: string
  status: string
  acknowledged_at?: string
  en_route_hospital?: string
  at_destination_facility?: string
  transporting_patient?: string
  arrived_destination?: string
  created_at: string
}

export interface TimelineEvent {
  id: string
  incident_id: string
  event_type: string
  event_data: any
  created_by: string
  created_at: string
}

export interface GeofenceStatus {
  pickupEntered: boolean
  destinationEntered: boolean
  pickupExited: boolean
  destinationExited: boolean
}

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  speed?: number | null
  heading?: number | null
}
