import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import { getIncident, getTimeline, updateUnitStatus } from '../lib/api'
import { initSocket, sendTimestamp, sendLocationUpdate } from '../lib/socket'
import { startTracking, stopTracking } from '../lib/geolocation'
import { GeofenceManager, type GeofenceEvent } from '../lib/geofence'
import { NavigationPanel, RoutePolyline } from '../components/NavigationPanel'
import type { Incident, TimelineEvent, LocationData } from '../types'
import { format } from 'date-fns'

const ambulanceIcon = new Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2913/2913133.png',
  iconSize: [40, 40],
})

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export default function ActiveTrip() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null)
  const geofenceManagerRef = useRef<GeofenceManager | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const [incidentData, timelineData] = await Promise.all([
          getIncident(id),
          getTimeline(id)
        ])
        setIncident(incidentData)
        setTimeline(timelineData)
      } catch (error) {
        console.error('Failed to fetch trip data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const socket = initSocket(localStorage.getItem('unit_id') || undefined)
    socket.emit('join:incident', id)

    socket.on('incident:timestamp:updated', () => {
      fetchData()
    })

    socket.on('incident:status:updated', () => {
      fetchData()
    })

    return () => {
      socket.emit('leave:incident', id)
      socket.off('incident:timestamp:updated')
      socket.off('incident:status:updated')
    }
  }, [id])

  useEffect(() => {
    if (!incident) return

    const handleGeofenceEvent = (event: GeofenceEvent) => {
      console.log('Geofence event:', event)
      sendTimestamp(
        incident.id,
        event.type,
        event.timestamp,
        { latitude: event.location.latitude, longitude: event.location.longitude },
        'auto'
      )
    }

    geofenceManagerRef.current = new GeofenceManager(
      incident.pickup_location.coordinates,
      incident.destination_location.coordinates,
      handleGeofenceEvent
    )

    const trackingInterval = setInterval(() => {
      if (currentLocation && geofenceManagerRef.current) {
        geofenceManagerRef.current.checkGeofences(currentLocation)
        
        const unitId = localStorage.getItem('unit_id')
        if (unitId) {
          sendLocationUpdate(
            unitId,
            { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
            currentLocation.heading || undefined,
            currentLocation.speed || undefined
          )
        }
      }
    }, 5000)

    startTracking((location) => {
      setCurrentLocation(location)
      setGpsError(null)
    }).catch((error) => {
      setGpsError('GPS tracking failed: ' + error.message)
    })

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100))
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100))
        })
      })
    }

    return () => {
      clearInterval(trackingInterval)
      stopTracking()
    }
  }, [incident, currentLocation])

  const handleManualTimestamp = async (status: string) => {
    if (!incident || !currentLocation) return
    
    try {
      await updateUnitStatus(
        status,
        currentLocation.latitude,
        currentLocation.longitude
      )
      
      // Refresh incident data
      const [incidentData, timelineData] = await Promise.all([
        getIncident(incident.id),
        getTimeline(incident.id)
      ])
      setIncident(incidentData)
      setTimeline(timelineData)
    } catch (error) {
      console.error('Failed to update unit status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading trip data...</div>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white text-xl">Incident not found</div>
      </div>
    )
  }

  const mapCenter: [number, number] = currentLocation
    ? [currentLocation.latitude, currentLocation.longitude]
    : [incident.pickup_location.coordinates[1], incident.pickup_location.coordinates[0]]

  const distanceToPickup = currentLocation && geofenceManagerRef.current
    ? (geofenceManagerRef.current.getDistanceToPickup(currentLocation) / 1000).toFixed(2)
    : 'N/A'

  const distanceToDestination = currentLocation && geofenceManagerRef.current
    ? (geofenceManagerRef.current.getDistanceToDestination(currentLocation) / 1000).toFixed(2)
    : 'N/A'

  return (
    <div className="h-screen bg-dark flex flex-col">
      <div className="bg-dark-lighter p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {incident.patient_first_name} {incident.patient_last_name}
            </h1>
            <p className="text-gray-400 text-sm">{incident.incident_number}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Unit: {localStorage.getItem('unit_id')}</p>
            {batteryLevel !== null && (
              <p className={`text-sm ${batteryLevel < 20 ? 'text-red-500' : 'text-gray-400'}`}>
                Battery: {batteryLevel}%
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-2/3 relative">
          {gpsError && (
            <div className="absolute top-4 left-4 right-4 bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded-lg z-[1000]">
              {gpsError}
            </div>
          )}
          
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <MapUpdater center={mapCenter} />

            {currentLocation && (
              <Marker
                position={[currentLocation.latitude, currentLocation.longitude]}
                icon={ambulanceIcon}
              >
                <Popup>
                  <div>
                    <p><strong>Current Location</strong></p>
                    <p>Speed: {currentLocation.speed ? (currentLocation.speed * 3.6).toFixed(1) : 0} km/h</p>
                    <p>Accuracy: {currentLocation.accuracy.toFixed(0)}m</p>
                  </div>
                </Popup>
              </Marker>
            )}

            <Marker position={[incident.pickup_location.coordinates[1], incident.pickup_location.coordinates[0]]}>
              <Popup>
                <div>
                  <p><strong>Pickup</strong></p>
                  <p>{incident.pickup_facility || incident.pickup_address}</p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[incident.pickup_location.coordinates[1], incident.pickup_location.coordinates[0]]}
              radius={500}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
            />

            <Marker position={[incident.destination_location.coordinates[1], incident.destination_location.coordinates[0]]}>
              <Popup>
                <div>
                  <p><strong>Destination</strong></p>
                  <p>{incident.destination_facility || incident.destination_address}</p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[incident.destination_location.coordinates[1], incident.destination_location.coordinates[0]]}
              radius={500}
              pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.1 }}
            />
            
            {routeGeometry && <RoutePolyline geometry={routeGeometry} />}
          </MapContainer>
        </div>

        <div className="w-1/3 bg-dark-lighter p-6 overflow-y-auto">
          <div className="space-y-4">
            <NavigationPanel
              startLocation={currentLocation ? [currentLocation.latitude, currentLocation.longitude] : [incident.pickup_location.coordinates[1], incident.pickup_location.coordinates[0]]}
              destination={[incident.destination_location.coordinates[1], incident.destination_location.coordinates[0]]}
              currentLocation={currentLocation}
              onRouteLoaded={setRouteGeometry}
            />

            <button
              onClick={() => navigate(`/navigate/${incident.id}`)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg"
            >
              🧭 Full-Screen Navigation
            </button>

            <div className="bg-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-2">GPS Status</h3>
              <p className="text-white">Lat: {currentLocation?.latitude.toFixed(6) || 'N/A'}</p>
              <p className="text-white">Lon: {currentLocation?.longitude.toFixed(6) || 'N/A'}</p>
              <p className="text-gray-400 text-sm">Accuracy: {currentLocation?.accuracy.toFixed(0) || 'N/A'}m</p>
            </div>

            <div className="bg-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-2">Distances</h3>
              <p className="text-white">To Pickup: {distanceToPickup} km</p>
              <p className="text-white">To Destination: {distanceToDestination} km</p>
            </div>

            <div className="bg-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-2">Auto-Timestamps</h3>
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${incident.en_route_hospital ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>En Route</span>
                  <span>{incident.en_route_hospital ? '✓' : '○'}</span>
                </div>
                <div className={`flex justify-between ${incident.at_destination_facility ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>At Facility</span>
                  <span>{incident.at_destination_facility ? '✓' : '○'}</span>
                </div>
                <div className={`flex justify-between ${incident.transporting_patient ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>Transporting</span>
                  <span>{incident.transporting_patient ? '✓' : '○'}</span>
                </div>
                <div className={`flex justify-between ${incident.arrived_destination ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>Arrived</span>
                  <span>{incident.arrived_destination ? '✓' : '○'}</span>
                </div>
              </div>
            </div>

            <div className="bg-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-3">Vehicle Status</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleManualTimestamp('enroute_to_pickup')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  disabled={incident.status === 'enroute_to_pickup'}
                >
                  {incident.status === 'enroute_to_pickup' ? '✓ En Route to Pickup' : 'En Route to Pickup'}
                </button>
                <button
                  onClick={() => handleManualTimestamp('on_scene')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  disabled={incident.status === 'on_scene'}
                >
                  {incident.status === 'on_scene' ? '✓ On Scene' : 'On Scene'}
                </button>
                <button
                  onClick={() => handleManualTimestamp('transporting')}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  disabled={incident.status === 'transporting'}
                >
                  {incident.status === 'transporting' ? '✓ Transporting' : 'Transporting'}
                </button>
                <button
                  onClick={() => handleManualTimestamp('at_destination')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  disabled={incident.status === 'at_destination'}
                >
                  {incident.status === 'at_destination' ? '✓ At Destination' : 'At Destination'}
                </button>
                <button
                  onClick={() => handleManualTimestamp('available')}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Clear & Available
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
                Vehicle operational status only. Patient contact on CrewLink.
              </p>
            </div>

            <div className="bg-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-3">Timeline</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {timeline.map((event) => (
                  <div key={event.id} className="text-sm">
                    <p className="text-white font-medium">
                      {event.event_type.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {format(new Date(event.created_at), 'HH:mm:ss')}
                      {event.event_data?.source && ` (${event.event_data.source})`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
