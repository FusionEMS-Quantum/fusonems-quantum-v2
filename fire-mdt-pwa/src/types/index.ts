export type FireMDTState =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'ENROUTE'
  | 'ON_SCENE'
  | 'TRANSPORTING'
  | 'AT_HOSPITAL'
  | 'CLEARING'
  | 'UNAVAILABLE';

export type EventSource = 'manual' | 'gps' | 'geofence' | 'obd' | 'cad';

export interface FireIncident {
  id: string;
  incidentNumber: string;
  type: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  dispatchTime: Date;
  priority: string;
  notes?: string;
  destination?: {
    name: string;
    address: string;
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface FireEvent {
  id: string;
  incidentId: string;
  eventType: FireMDTState;
  timestamp: Date;
  source: EventSource;
  location?: {
    lat: number;
    lng: number;
  };
  metadata?: Record<string, any>;
  synced: boolean;
}

export interface GPSBreadcrumb {
  id: string;
  incidentId: string;
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  synced: boolean;
}

export interface OBDData {
  ignition: boolean;
  gear: 'P' | 'R' | 'N' | 'D' | 'L';
  speed: number;
  rpm?: number;
  timestamp: Date;
}

export interface Geofence {
  id: string;
  type: 'scene' | 'destination' | 'station';
  center: {
    lat: number;
    lng: number;
  };
  radiusMeters: number;
  triggerState: FireMDTState;
}

export interface DeviceConfig {
  unitId: string;
  stationLocation?: {
    lat: number;
    lng: number;
  };
  geofenceRadius: number;
  gpsUpdateInterval: number;
  obdEnabled: boolean;
}

export interface OfflineQueueItem {
  id: string;
  type: 'event' | 'breadcrumb' | 'incident';
  payload: any;
  timestamp: Date;
  retries: number;
}

export interface FireMDTStore {
  // Auth
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  setAuth: (user: any, token: string) => void;
  logout: () => void;

  // Device config
  config: DeviceConfig | null;
  setConfig: (config: DeviceConfig) => void;

  // Current state
  currentState: FireMDTState;
  setState: (state: FireMDTState) => void;

  // Active incident
  activeIncident: FireIncident | null;
  setActiveIncident: (incident: FireIncident | null) => void;

  // Events
  events: FireEvent[];
  addEvent: (event: Omit<FireEvent, 'id' | 'synced'>) => void;

  // GPS
  currentLocation: { lat: number; lng: number } | null;
  setCurrentLocation: (location: { lat: number; lng: number }) => void;
  breadcrumbs: GPSBreadcrumb[];
  addBreadcrumb: (breadcrumb: Omit<GPSBreadcrumb, 'id' | 'synced'>) => void;

  // OBD
  obdData: OBDData | null;
  setOBDData: (data: OBDData) => void;

  // Geofences
  geofences: Geofence[];
  setGeofences: (geofences: Geofence[]) => void;

  // Offline queue
  queueSize: number;
  setQueueSize: (size: number) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}
