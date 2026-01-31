import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUnits, getIncidents } from '../lib/api'
import { initSocket } from '../lib/socket'
import Map from '../components/Map'
import type { Unit, Incident } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [units, setUnits] = useState<Unit[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [socketConnected, setSocketConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: getUnits,
    refetchInterval: () => socketConnected ? 30000 : 5000,
  })

  const { data: incidentsData } = useQuery({
    queryKey: ['incidents'],
    queryFn: getIncidents,
    refetchInterval: () => socketConnected ? 30000 : 8000,
  })

  useEffect(() => {
    if (unitsData) {
      setUnits(unitsData)
    }
  }, [unitsData])

  useEffect(() => {
    if (incidentsData) {
      setIncidents(incidentsData.filter((inc: Incident) => inc.status !== 'completed'))
    }
  }, [incidentsData])

  useEffect(() => {
    const socket = initSocket()

    socket.on('connect', () => {
      console.log('Socket connected')
      setSocketConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setSocketConnected(false)
    })

    socket.on('connect_error', () => {
      setSocketConnected(false)
    })

    // Real-time unit location updates
    socket.on('unit:location:updated', (data: {
      unitId: string
      location: { type: string; coordinates: [number, number] }
      heading?: number
      speed?: number
    }) => {
      setUnits(prev => prev.map(unit => 
        unit.id === data.unitId 
          ? { 
              ...unit, 
              current_location: data.location,
              heading: data.heading,
              speed: data.speed,
              last_location_update: new Date().toISOString()
            }
          : unit
      ))
      setLastUpdate(new Date())
    })

    // Real-time unit status updates
    socket.on('unit:status:updated', (data: {
      unitId: string
      status: Unit['status']
      incidentId?: string
    }) => {
      setUnits(prev => prev.map(unit => 
        unit.id === data.unitId 
          ? { 
              ...unit, 
              status: data.status,
              current_incident_id: data.incidentId
            }
          : unit
      ))
      setLastUpdate(new Date())
      queryClient.invalidateQueries({ queryKey: ['units'] })
    })

    // New incident created
    socket.on('incident:new', (data: Incident) => {
      setIncidents(prev => [...prev, data])
      setLastUpdate(new Date())
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
    })

    // Incident status updated
    socket.on('incident:status:updated', (data: {
      incidentId: string
      status: string
    }) => {
      setIncidents(prev => prev.map(inc =>
        inc.id === data.incidentId
          ? { ...inc, status: data.status }
          : inc
      ).filter(inc => inc.status !== 'completed'))
      setLastUpdate(new Date())
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
    })

    // Incident timestamp updated (geofence events, etc)
    socket.on('incident:timestamp:updated', (data: {
      incidentId: string
      field: string
      timestamp: string
    }) => {
      setIncidents(prev => prev.map(inc =>
        inc.id === data.incidentId
          ? { ...inc, [data.field]: data.timestamp }
          : inc
      ))
      setLastUpdate(new Date())
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('unit:location:updated')
      socket.off('unit:status:updated')
      socket.off('incident:new')
      socket.off('incident:status:updated')
      socket.off('incident:timestamp:updated')
    }
  }, [queryClient])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-600'
      case 'assigned': return 'bg-yellow-600'
      case 'en_route': return 'bg-orange-600'
      case 'at_scene': return 'bg-blue-600'
      case 'transporting': return 'bg-purple-600'
      case 'at_facility': return 'bg-cyan-600'
      case 'out_of_service': return 'bg-gray-600'
      default: return 'bg-gray-600'
    }
  }

  const activeUnits = units.filter(u => u.status !== 'out_of_service')
  const availableCount = units.filter(u => u.status === 'available').length
  const busyCount = units.filter(u => 
    ['assigned', 'en_route', 'at_scene', 'transporting', 'at_facility'].includes(u.status)
  ).length

  return (
    <div className="h-screen bg-dark flex">
      <div className="w-1/3 bg-dark-lighter p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">FusionEMS CAD</h1>
          <p className="text-gray-400">Computer-Aided Dispatch</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {socketConnected ? 'Connected' : 'Disconnected'} • Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/intake')}
          className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg mb-6 transition-colors"
        >
          + New Call / Incident
        </button>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-dark p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-400">{availableCount}</p>
            <p className="text-gray-400 text-xs">Available</p>
          </div>
          <div className="bg-dark p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-400">{busyCount}</p>
            <p className="text-gray-400 text-xs">In Service</p>
          </div>
          <div className="bg-dark p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-400">{incidents.length}</p>
            <p className="text-gray-400 text-xs">Active Calls</p>
          </div>
        </div>

        <div className="bg-dark p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Active Units ({activeUnits.length})</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activeUnits.map(unit => (
              <div key={unit.id} className="bg-dark-lighter p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-semibold">{unit.name}</p>
                    <p className="text-gray-400 text-sm">{unit.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(unit.status)}`}>
                    {unit.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                {unit.current_location && (
                  <div className="text-xs text-gray-500 mb-1">
                    GPS: {unit.current_location.coordinates[1].toFixed(4)}, {unit.current_location.coordinates[0].toFixed(4)}
                    {unit.speed !== undefined && unit.speed !== null && (
                      <span className="ml-2">• {(unit.speed * 2.237).toFixed(0)} mph</span>
                    )}
                  </div>
                )}
                {unit.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {unit.capabilities.map((cap, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {incidents.length > 0 && (
          <div className="bg-dark p-4 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">Active Incidents ({incidents.length})</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {incidents.map(incident => (
                <div key={incident.id} className="bg-dark-lighter p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-white font-semibold text-sm">
                      {incident.patient_first_name} {incident.patient_last_name}
                    </p>
                    <span className="px-2 py-0.5 bg-blue-600 rounded text-xs font-semibold">
                      {incident.transport_type}
                    </span>
                  </div>
                  {incident.incident_number && (
                    <p className="text-gray-500 text-xs mb-1">#{incident.incident_number}</p>
                  )}
                  <p className="text-gray-400 text-xs mb-1">
                    From: {incident.pickup_facility || incident.pickup_address.substring(0, 30)}...
                  </p>
                  <p className="text-gray-400 text-xs">
                    To: {incident.destination_facility || incident.destination_address.substring(0, 30)}...
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-red-500/30 text-red-300 rounded text-xs">
                      {incident.acuity_level}
                    </span>
                    {incident.status && (
                      <span className="px-2 py-0.5 bg-orange-500/30 text-orange-300 rounded text-xs">
                        {incident.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-2/3">
        <Map 
          units={units} 
          incidents={incidents}
          showGeofences={true}
          onlineStatus={socketConnected}
        />
      </div>
    </div>
  )
}
