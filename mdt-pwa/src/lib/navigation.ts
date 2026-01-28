import { LocationData } from '../types'

export interface RouteStep {
  instruction: string
  distance: number // meters
  duration: number // seconds
  maneuver: 'turn-left' | 'turn-right' | 'straight' | 'arrive' | 'depart'
  coordinates: [number, number]
}

export interface Route {
  steps: RouteStep[]
  totalDistance: number // meters
  totalDuration: number // seconds
  geometry: [number, number][]
}

export interface NavigationState {
  currentStep: number
  distanceToNextStep: number
  nextInstruction: string
  eta: Date
  remainingDistance: number
  remainingTime: number
}

export class NavigationEngine {
  private route: Route | null = null
  private startLocation: [number, number]
  private destination: [number, number]
  private currentStepIndex: number = 0
  
  constructor(start: [number, number], destination: [number, number]) {
    this.startLocation = start
    this.destination = destination
  }
  
  async fetchRoute(useTraffic: boolean = true): Promise<Route> {
    // In production, use OSRM (Open Source Routing Machine) or similar
    // For now, create a simplified route
    const route = await this.fetchRouteFromOSRM(
      this.startLocation,
      this.destination,
      useTraffic
    )
    this.route = route
    return route
  }
  
  private async fetchRouteFromOSRM(
    start: [number, number],
    end: [number, number],
    useTraffic: boolean
  ): Promise<Route> {
    try {
      // Free OSRM API (demo server - replace with self-hosted for production)
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?steps=true&overview=full&geometries=geojson`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found')
      }
      
      const osrmRoute = data.routes[0]
      const steps: RouteStep[] = []
      
      // Parse OSRM steps
      for (const leg of osrmRoute.legs) {
        for (const step of leg.steps) {
          steps.push({
            instruction: step.maneuver.instruction || this.getManeuverText(step.maneuver.type),
            distance: step.distance,
            duration: step.duration,
            maneuver: this.mapManeuverType(step.maneuver.type),
            coordinates: [step.maneuver.location[1], step.maneuver.location[0]],
          })
        }
      }
      
      const geometry = osrmRoute.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
      
      return {
        steps,
        totalDistance: osrmRoute.distance,
        totalDuration: osrmRoute.duration * (useTraffic ? 1.2 : 1), // Rough traffic adjustment
        geometry,
      }
    } catch (error) {
      console.error('OSRM routing failed, using fallback:', error)
      return this.createFallbackRoute(start, end)
    }
  }
  
  private createFallbackRoute(start: [number, number], end: [number, number]): Route {
    // Simple straight-line fallback for offline mode
    const distance = this.calculateDistance(start, end)
    const duration = (distance / 1000) * 60 // Assume 60 km/h average
    
    return {
      steps: [
        {
          instruction: 'Head to destination',
          distance,
          duration,
          maneuver: 'depart',
          coordinates: start,
        },
        {
          instruction: 'Arrive at destination',
          distance: 0,
          duration: 0,
          maneuver: 'arrive',
          coordinates: end,
        },
      ],
      totalDistance: distance,
      totalDuration: duration,
      geometry: [start, end],
    }
  }
  
  private mapManeuverType(osrmType: string): 'turn-left' | 'turn-right' | 'straight' | 'arrive' | 'depart' {
    if (osrmType.includes('left')) return 'turn-left'
    if (osrmType.includes('right')) return 'turn-right'
    if (osrmType === 'arrive') return 'arrive'
    if (osrmType === 'depart') return 'depart'
    return 'straight'
  }
  
  private getManeuverText(type: string): string {
    const texts: Record<string, string> = {
      'turn-left': 'Turn left',
      'turn-right': 'Turn right',
      'turn-slight-left': 'Bear left',
      'turn-slight-right': 'Bear right',
      'turn-sharp-left': 'Sharp left',
      'turn-sharp-right': 'Sharp right',
      'straight': 'Continue straight',
      'arrive': 'Arrive at destination',
      'depart': 'Depart',
    }
    return texts[type] || 'Continue'
  }
  
  updateLocation(location: LocationData): NavigationState | null {
    if (!this.route) return null
    
    const currentCoords: [number, number] = [location.latitude, location.longitude]
    
    // Find closest step
    let closestStepIndex = this.currentStepIndex
    let minDistance = Infinity
    
    for (let i = this.currentStepIndex; i < this.route.steps.length; i++) {
      const stepCoords = this.route.steps[i].coordinates
      const distance = this.calculateDistance(currentCoords, stepCoords)
      if (distance < minDistance) {
        minDistance = distance
        closestStepIndex = i
      }
    }
    
    this.currentStepIndex = closestStepIndex
    const currentStep = this.route.steps[this.currentStepIndex]
    const distanceToStep = this.calculateDistance(currentCoords, currentStep.coordinates)
    
    // Calculate remaining distance/time
    let remainingDistance = distanceToStep
    let remainingTime = 0
    
    for (let i = this.currentStepIndex; i < this.route.steps.length; i++) {
      remainingDistance += this.route.steps[i].distance
      remainingTime += this.route.steps[i].duration
    }
    
    const eta = new Date(Date.now() + remainingTime * 1000)
    
    return {
      currentStep: this.currentStepIndex,
      distanceToNextStep: distanceToStep,
      nextInstruction: currentStep.instruction,
      eta,
      remainingDistance,
      remainingTime,
    }
  }
  
  private calculateDistance(point1: [number, number], point2: [number, number]): number {
    // Haversine formula
    const R = 6371e3 // Earth radius in meters
    const φ1 = (point1[0] * Math.PI) / 180
    const φ2 = (point2[0] * Math.PI) / 180
    const Δφ = ((point2[0] - point1[0]) * Math.PI) / 180
    const Δλ = ((point2[1] - point1[1]) * Math.PI) / 180
    
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c
  }
  
  getRoute(): Route | null {
    return this.route
  }
  
  reset() {
    this.currentStepIndex = 0
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
