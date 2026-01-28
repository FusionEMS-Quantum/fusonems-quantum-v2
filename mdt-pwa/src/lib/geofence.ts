import type { LocationData, GeofenceStatus } from '../types'

const GEOFENCE_RADIUS_METERS = 500

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export const isInsideGeofence = (
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radius: number = GEOFENCE_RADIUS_METERS
): boolean => {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon)
  return distance <= radius
}

export interface GeofenceEvent {
  type: 'en_route_hospital' | 'at_destination_facility' | 'transporting_patient' | 'arrived_destination'
  timestamp: string
  location: LocationData
}

export class GeofenceManager {
  private pickupLat: number
  private pickupLon: number
  private destinationLat: number
  private destinationLon: number
  private status: GeofenceStatus = {
    pickupEntered: false,
    destinationEntered: false,
    pickupExited: false,
    destinationExited: false,
  }
  private onEvent: (event: GeofenceEvent) => void

  constructor(
    pickupCoords: [number, number],
    destinationCoords: [number, number],
    onEvent: (event: GeofenceEvent) => void
  ) {
    this.pickupLon = pickupCoords[0]
    this.pickupLat = pickupCoords[1]
    this.destinationLon = destinationCoords[0]
    this.destinationLat = destinationCoords[1]
    this.onEvent = onEvent
  }

  checkGeofences(currentLocation: LocationData) {
    const insidePickup = isInsideGeofence(
      currentLocation.latitude,
      currentLocation.longitude,
      this.pickupLat,
      this.pickupLon
    )

    const insideDestination = isInsideGeofence(
      currentLocation.latitude,
      currentLocation.longitude,
      this.destinationLat,
      this.destinationLon
    )

    if (insidePickup && !this.status.pickupEntered) {
      this.status.pickupEntered = true
      console.log('Entered pickup geofence')
    }

    if (!insidePickup && this.status.pickupEntered && !this.status.pickupExited) {
      this.status.pickupExited = true
      this.onEvent({
        type: 'en_route_hospital',
        timestamp: new Date().toISOString(),
        location: currentLocation,
      })
      console.log('Exited pickup geofence - en route to hospital')
    }

    if (insideDestination && !this.status.destinationEntered && this.status.pickupExited) {
      this.status.destinationEntered = true
      this.onEvent({
        type: 'at_destination_facility',
        timestamp: new Date().toISOString(),
        location: currentLocation,
      })
      console.log('Entered destination geofence - at facility')
    }

    if (!insideDestination && this.status.destinationEntered && !this.status.destinationExited) {
      this.status.destinationExited = true
      this.onEvent({
        type: 'transporting_patient',
        timestamp: new Date().toISOString(),
        location: currentLocation,
      })
      console.log('Exited destination geofence - transporting patient')
    }

    if (insideDestination && this.status.destinationExited) {
      this.onEvent({
        type: 'arrived_destination',
        timestamp: new Date().toISOString(),
        location: currentLocation,
      })
      console.log('Re-entered destination - arrived at final destination')
      this.status.destinationExited = false
    }
  }

  getDistanceToPickup(currentLocation: LocationData): number {
    return calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      this.pickupLat,
      this.pickupLon
    )
  }

  getDistanceToDestination(currentLocation: LocationData): number {
    return calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      this.destinationLat,
      this.destinationLon
    )
  }

  getStatus(): GeofenceStatus {
    return { ...this.status }
  }
}
