import type { LocationData } from '../types'

let watchId: number | null = null
let currentLocation: LocationData | null = null

export const startTracking = (onLocationUpdate: (location: LocationData) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
        }
        currentLocation = location
        onLocationUpdate(location)
        resolve()
      },
      (error) => {
        console.error('Geolocation error:', error)
        reject(error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    )
  })
}

export const stopTracking = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

export const getCurrentLocation = (): LocationData | null => {
  return currentLocation
}

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return result.state === 'granted'
  } catch {
    return false
  }
}
