import { useEffect, useState } from 'react'
import { Polyline } from 'react-leaflet'
import { NavigationEngine, NavigationState, formatDistance, formatDuration } from '../lib/navigation'
import type { LocationData } from '../types'

interface NavigationPanelProps {
  startLocation: [number, number]
  destination: [number, number]
  currentLocation: LocationData | null
  onRouteLoaded?: (geometry: [number, number][]) => void
}

export function NavigationPanel({
  startLocation,
  destination,
  currentLocation,
  onRouteLoaded,
}: NavigationPanelProps) {
  const [navEngine] = useState(
    () => new NavigationEngine(startLocation, destination)
  )
  const [navState, setNavState] = useState<NavigationState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    navEngine.fetchRoute(true)
      .then((route) => {
        setLoading(false)
        onRouteLoaded?.(route.geometry)
      })
      .catch((err) => {
        setLoading(false)
        setError(err.message)
      })
  }, [navEngine, onRouteLoaded])

  useEffect(() => {
    if (currentLocation) {
      const state = navEngine.updateLocation(currentLocation)
      setNavState(state)
    }
  }, [currentLocation, navEngine])

  if (loading) {
    return (
      <div className="bg-dark p-4 rounded-lg">
        <p className="text-gray-400 text-sm">Calculating route...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!navState) {
    return null
  }

  const getManeuverIcon = (instruction: string) => {
    if (instruction.toLowerCase().includes('left')) return '↰'
    if (instruction.toLowerCase().includes('right')) return '↱'
    if (instruction.toLowerCase().includes('arrive')) return '🏁'
    return '↑'
  }

  return (
    <div className="bg-dark p-4 rounded-lg">
      <h3 className="text-lg font-bold text-primary mb-3">Navigation</h3>
      
      {/* Next Maneuver */}
      <div className="bg-blue-900/30 border-2 border-blue-500 p-4 rounded-lg mb-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{getManeuverIcon(navState.nextInstruction)}</span>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{navState.nextInstruction}</p>
            <p className="text-gray-400 text-sm">
              in {formatDistance(navState.distanceToNextStep)}
            </p>
          </div>
        </div>
      </div>

      {/* Trip Summary */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-800 p-2 rounded">
          <p className="text-xs text-gray-500">Distance</p>
          <p className="text-white font-semibold">
            {formatDistance(navState.remainingDistance)}
          </p>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <p className="text-xs text-gray-500">ETA</p>
          <p className="text-white font-semibold">
            {navState.eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Route Time */}
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          {formatDuration(navState.remainingTime)} remaining
        </p>
      </div>
    </div>
  )
}

interface RoutePolylineProps {
  geometry: [number, number][]
}

export function RoutePolyline({ geometry }: RoutePolylineProps) {
  return (
    <Polyline
      positions={geometry}
      pathOptions={{
        color: '#3b82f6',
        weight: 5,
        opacity: 0.7,
      }}
    />
  )
}
