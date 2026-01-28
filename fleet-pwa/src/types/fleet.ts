export interface FleetVehicle {
  id: number
  org_id: number
  vehicle_id: string
  vin: string
  year: number
  make: string
  model: string
  license_plate: string
  call_sign: string
  vehicle_type: 'ambulance' | 'support' | 'supervisor' | 'logistics' | 'command'
  fuel_type: 'diesel' | 'gasoline' | 'electric' | 'hybrid'
  operational_status: 'available' | 'assigned' | 'maintenance' | 'out_of_service'
  mileage_km: number
  last_service_date: string | null
  next_service_date: string | null
  next_service_mileage_km: number | null
}

export interface FleetTelemetry {
  id: number
  vehicle_id: number
  timestamp: string
  latitude: number | null
  longitude: number | null
  speed_kmh: number
  odometer_km: number
  fuel_level_percent: number
  battery_voltage: number
  engine_rpm: number
  check_engine: boolean
}

export interface FleetMaintenance {
  id: number
  vehicle_id: number
  service_type: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_date: string | null
  completed_date: string | null
  notes: string | null
  cost: number | null
  payload: any
}

export interface DVIR {
  id: number
  vehicle_id: number
  inspector_user_id: number
  inspection_type: 'pre_trip' | 'post_trip'
  inspection_date: string
  odometer_km: number
  defects_found: boolean
  vehicle_safe: boolean
  notes: string | null
  payload: any
}

export interface VehicleWithTelemetry extends FleetVehicle {
  telemetry: FleetTelemetry | null
  maintenance_alerts: FleetMaintenance[]
}
