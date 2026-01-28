import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import type { Unit, Incident, GeofenceZone } from '../types'

const GEOFENCE_RADIUS = 500

// Custom ambulance/unit icons by status
const createUnitIcon = (status: string, type: string, heading?: number) => {
  let color = '#6B7280' // gray
  let label = 'U'
  
  switch (status) {
    case 'available':
      color = '#10B981' // green
      break
    case 'assigned':
      color = '#F59E0B' // yellow/amber
      break
    case 'en_route':
      color = '#F97316' // orange
      break
    case 'at_scene':
      color = '#3B82F6' // blue
      break
    case 'transporting':
      color = '#8B5CF6' // purple
      break
    case 'at_facility':
      color = '#06B6D4' // cyan
      break
    case 'out_of_service':
      color = '#EF4444' // red
      break
  }

  switch (type) {
    case 'ALS':
      label = 'A'
      break
    case 'BLS':
      label = 'B'
      break
    case 'CCT':
      label = 'C'
      break
    case 'HEMS':
      label = 'H'
      break
  }

  const rotation = heading ? `rotate(${heading}deg)` : 'rotate(0deg)'
  
  return new DivIcon({
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        transform: ${rotation};
        transition: transform 0.3s ease;
      ">
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2 L35 35 L20 28 L5 35 Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="20" cy="20" r="8" fill="#ffffff"/>
          <text x="20" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${label}</text>
        </svg>
        ${status === 'transporting' ? `
          <div style="
            position: absolute;
            top: -5px;
            right: -5px;
            width: 10px;
            height: 10px;
            background: #EF4444;
            border-radius: 50%;
            border: 2px solid white;
            animation: pulse 2s infinite;
          "></div>
        ` : ''}
      </div>
    `,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })
}

// Incident/Call markers
const getIncidentIcon = (type: 'pickup' | 'destination') => {
  const emoji = type === 'pickup' ? '📍' : '🏥'
  
  return new DivIcon({
    html: `
      <div style="
        font-size: 32px;
        text-shadow: 0 0 3px rgba(0,0,0,0.5);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      ">${emoji}</div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

interface MapUpdaterProps {
  center: [number, number]
  zoom?: number
}

function MapUpdater({ center, zoom }: MapUpdaterProps) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true })
  }, [center, zoom, map])
  
  return null
}

interface MapProps {
  units: Unit[]
  incidents?: Incident[]
  center?: [number, number]
  zoom?: number
  showGeofences?: boolean
  onlineStatus?: boolean
}

export default function Map({ 
  units, 
  incidents = [], 
  center, 
  zoom = 11,
  showGeofences = true,
  onlineStatus = true 
}: MapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center || [40.7128, -74.0060])
  const [mapZoom] = useState(zoom)
  const [stalledUnits, setStalledUnits] = useState<Set<string>>(new Set())

  // Auto-center map on first unit with location or first incident
  useEffect(() => {
    if (!center) {
      const unitWithLocation = units.find(u => u.current_location)
      if (unitWithLocation?.current_location) {
        setMapCenter([
          unitWithLocation.current_location.coordinates[1],
          unitWithLocation.current_location.coordinates[0]
        ])
      } else if (incidents.length > 0 && incidents[0].pickup_location) {
        setMapCenter([
          incidents[0].pickup_location.coordinates[1],
          incidents[0].pickup_location.coordinates[0]
        ])
      }
    } else {
      setMapCenter(center)
    }
  }, [center, units, incidents])

  // Detect stalled units (no location update in 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const stalled = new Set<string>()
      
      units.forEach(unit => {
        if (unit.last_location_update) {
          const lastUpdate = new Date(unit.last_location_update).getTime()
          if (now - lastUpdate > 120000) { // 2 minutes
            stalled.add(unit.id)
          }
        }
      })
      
      setStalledUnits(stalled)
    }, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [units])

  // Build geofence zones from active incidents
  const geofenceZones: GeofenceZone[] = []
  if (showGeofences) {
    incidents.forEach(incident => {
      if (incident.id && incident.status !== 'completed') {
        geofenceZones.push({
          center: [
            incident.pickup_location.coordinates[1],
            incident.pickup_location.coordinates[0]
          ],
          radius: GEOFENCE_RADIUS,
          type: 'pickup',
          incidentId: incident.id
        })
        geofenceZones.push({
          center: [
            incident.destination_location.coordinates[1],
            incident.destination_location.coordinates[0]
          ],
          radius: GEOFENCE_RADIUS,
          type: 'destination',
          incidentId: incident.id
        })
      }
    })
  }

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400'
      case 'assigned': return 'text-yellow-400'
      case 'en_route': return 'text-orange-400'
      case 'at_scene': return 'text-blue-400'
      case 'transporting': return 'text-purple-400'
      case 'at_facility': return 'text-cyan-400'
      case 'out_of_service': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="relative w-full h-full">
      {!onlineStatus && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-900/95 border border-red-700 text-red-200 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">OFFLINE - Reconnecting...</span>
        </div>
      )}

      {stalledUnits.size > 0 && (
        <div className="absolute top-4 right-4 z-[999] bg-yellow-900/95 border border-yellow-700 text-yellow-200 px-4 py-2 rounded-lg shadow-lg text-sm">
          <p className="font-semibold">{stalledUnits.size} unit(s) with stale GPS</p>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapUpdater center={mapCenter} zoom={mapZoom} />

        {/* Render Units */}
        {units.map(unit => {
          if (!unit.current_location) return null
          
          const isStalled = stalledUnits.has(unit.id)
          const position: [number, number] = [
            unit.current_location.coordinates[1],
            unit.current_location.coordinates[0]
          ]
          
          return (
            <Marker
              key={`unit-${unit.id}`}
              position={position}
              icon={createUnitIcon(unit.status, unit.type, unit.heading)}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-bold text-lg mb-1">{unit.name}</p>
                  <p className="text-gray-400 text-xs mb-2">{unit.type}</p>
                  <div className="space-y-1">
                    <p>
                      <span className="text-gray-400">Status:</span>{' '}
                      <span className={`font-semibold ${getStatusColor(unit.status)}`}>
                        {getStatusLabel(unit.status)}
                      </span>
                    </p>
                    {unit.speed !== undefined && unit.speed !== null && (
                      <p>
                        <span className="text-gray-400">Speed:</span>{' '}
                        <span className="font-semibold">{(unit.speed * 2.237).toFixed(1)} mph</span>
                      </p>
                    )}
                    {unit.heading !== undefined && unit.heading !== null && (
                      <p>
                        <span className="text-gray-400">Heading:</span>{' '}
                        <span className="font-semibold">{unit.heading}°</span>
                      </p>
                    )}
                    {isStalled && (
                      <p className="text-yellow-400 text-xs mt-2">
                        ⚠️ GPS data stale
                      </p>
                    )}
                    {unit.capabilities.length > 0 && (
                      <div className="mt-2">
                        <p className="text-gray-400 text-xs mb-1">Capabilities:</p>
                        <div className="flex flex-wrap gap-1">
                          {unit.capabilities.map((cap, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-orange-500/30 text-orange-300 rounded text-xs">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Render Incidents/Calls with Geofences */}
        {incidents.map(incident => {
          if (!incident.id) return null
          
          const pickupPos: [number, number] = [
            incident.pickup_location.coordinates[1],
            incident.pickup_location.coordinates[0]
          ]
          const destPos: [number, number] = [
            incident.destination_location.coordinates[1],
            incident.destination_location.coordinates[0]
          ]
          
          return (
            <div key={`incident-${incident.id}`}>
              {/* Pickup Location */}
              <Marker position={pickupPos} icon={getIncidentIcon('pickup')}>
                <Popup>
                  <div className="text-sm min-w-[220px]">
                    <p className="font-bold text-blue-400 mb-1">PICKUP</p>
                    <p className="font-semibold mb-1">
                      {incident.patient_first_name} {incident.patient_last_name}
                    </p>
                    {incident.incident_number && (
                      <p className="text-gray-400 text-xs mb-2">#{incident.incident_number}</p>
                    )}
                    <p className="text-xs mb-1">
                      <span className="text-gray-400">From:</span>{' '}
                      {incident.pickup_facility || incident.pickup_address}
                    </p>
                    <p className="text-xs mb-1">
                      <span className="text-gray-400">Type:</span>{' '}
                      <span className="font-semibold">{incident.transport_type}</span>
                    </p>
                    <p className="text-xs">
                      <span className="text-gray-400">Acuity:</span>{' '}
                      <span className="font-semibold">{incident.acuity_level}</span>
                    </p>
                  </div>
                </Popup>
              </Marker>
              
              {showGeofences && (
                <Circle
                  center={pickupPos}
                  radius={GEOFENCE_RADIUS}
                  pathOptions={{ 
                    color: '#3B82F6', 
                    fillColor: '#3B82F6', 
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />
              )}

              {/* Destination Location */}
              <Marker position={destPos} icon={getIncidentIcon('destination')}>
                <Popup>
                  <div className="text-sm min-w-[220px]">
                    <p className="font-bold text-green-400 mb-1">DESTINATION</p>
                    <p className="font-semibold mb-1">
                      {incident.patient_first_name} {incident.patient_last_name}
                    </p>
                    {incident.incident_number && (
                      <p className="text-gray-400 text-xs mb-2">#{incident.incident_number}</p>
                    )}
                    <p className="text-xs mb-1">
                      <span className="text-gray-400">To:</span>{' '}
                      {incident.destination_facility || incident.destination_address}
                    </p>
                    <p className="text-xs">
                      <span className="text-gray-400">Diagnosis:</span>{' '}
                      {incident.diagnosis}
                    </p>
                  </div>
                </Popup>
              </Marker>
              
              {showGeofences && (
                <Circle
                  center={destPos}
                  radius={GEOFENCE_RADIUS}
                  pathOptions={{ 
                    color: '#10B981', 
                    fillColor: '#10B981', 
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />
              )}
            </div>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[999] bg-dark-lighter/95 border border-gray-700 p-3 rounded-lg shadow-lg text-xs">
        <p className="font-bold text-white mb-2">Unit Status</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-300">Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-300">En Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-gray-300">Transporting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-300">At Scene</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-300">Out of Service</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
