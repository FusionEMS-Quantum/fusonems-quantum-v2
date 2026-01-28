import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { fleetAPI } from '../lib/api'
import type { VehicleWithTelemetry, FleetMaintenance, DVIR } from '../types/fleet'

import 'leaflet/dist/leaflet.css'

const statusColors = {
  available: '#22c55e',
  assigned: '#3b82f6',
  maintenance: '#f97316',
  out_of_service: '#ef4444',
}

const statusIcons = {
  available: '✓',
  assigned: '🚑',
  maintenance: '🔧',
  out_of_service: '⚠️',
}

function createMarkerIcon(status: string) {
  const color = statusColors[status as keyof typeof statusColors] || '#6b7280'
  const icon = statusIcons[status as keyof typeof statusIcons] || '📍'
  
  return L.divIcon({
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">
        ${icon}
      </div>
    `,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

export default function FleetDashboard() {
  const [vehicles, setVehicles] = useState<VehicleWithTelemetry[]>([])
  const [maintenance, setMaintenance] = useState<FleetMaintenance[]>([])
  const [dvirData, setDvirData] = useState<DVIR[]>([])
  const [aiInsights, setAiInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [vehiclesData, maintenanceData, dvirDataRes, insightsData] = await Promise.all([
        fleetAPI.getVehicles(),
        fleetAPI.getMaintenance(),
        fleetAPI.getDVIRToday(),
        fetch('/api/fleet/ai/insights?status=active').then(r => r.json()).catch(() => []),
      ])

      const vehiclesWithTelemetry = await Promise.all(
        vehiclesData.map(async (vehicle: VehicleWithTelemetry) => {
          try {
            const telemetry = await fleetAPI.getTelemetry(vehicle.id)
            const alerts = maintenanceData.filter((m: FleetMaintenance) => m.vehicle_id === vehicle.id)
            return { ...vehicle, telemetry: telemetry[0] || null, maintenance_alerts: alerts }
          } catch {
            return { ...vehicle, telemetry: null, maintenance_alerts: [] }
          }
        })
      )

      setVehicles(vehiclesWithTelemetry)
      setMaintenance(maintenanceData)
      setDvirData(dvirDataRes)
      setAiInsights(insightsData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch fleet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const inServiceCount = vehicles.filter(v => v.operational_status === 'available' || v.operational_status === 'assigned').length
  const maintenanceAlerts = maintenance.filter(m => m.status === 'scheduled' || m.status === 'in_progress').length
  const criticalAlerts = vehicles.filter(v => v.telemetry?.check_engine || (v.telemetry?.fuel_level_percent !== undefined && v.telemetry.fuel_level_percent < 20)).length
  const avgAge = vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (new Date().getFullYear() - v.year), 0) / vehicles.length) : 0

  const totalVehicles = vehicles.length
  const dvirCompleted = dvirData.filter(d => d.inspection_type === 'pre_trip').length
  const dvirProgress = totalVehicles > 0 ? (dvirCompleted / totalVehicles) * 100 : 0

  const defaultCenter: [number, number] = [39.8283, -98.5795]
  const hasVehiclesWithLocation = vehicles.some(v => v.telemetry?.latitude && v.telemetry?.longitude)
  const mapCenter: [number, number] = hasVehiclesWithLocation
    ? [
        vehicles.find(v => v.telemetry?.latitude)?.telemetry?.latitude || defaultCenter[0],
        vehicles.find(v => v.telemetry?.longitude)?.telemetry?.longitude || defaultCenter[1],
      ]
    : defaultCenter

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-2xl font-bold text-blue-400 animate-pulse">Loading Fleet Data...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-900 text-white overflow-hidden flex flex-col">
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Fleet Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time vehicle monitoring & telemetry</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ai-insights')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg flex items-center gap-2"
          >
            🤖 AI Insights
            {aiInsights.length > 0 && (
              <span className="bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {aiInsights.length}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold transition-colors shadow-lg"
          >
            🔔 Settings
          </button>
          <div className="text-right text-sm">
            <div className="text-slate-400">Last Update</div>
            <div className="text-white font-mono">{lastUpdate.toLocaleTimeString()}</div>
          </div>
        </div>
      </header>

      {aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-purple-500/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <div className="font-bold text-purple-300">AI Insights Active</div>
                <div className="text-sm text-slate-300">
                  {aiInsights.filter(i => i.priority === 'critical').length} critical, 
                  {' '}{aiInsights.filter(i => i.priority === 'high').length} high priority
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/ai-insights')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-colors text-sm"
            >
              View All Insights →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 px-6 py-4">
        <MetricCard
          label="In Service"
          value={inServiceCount}
          total={totalVehicles}
          icon="🚑"
          color="blue"
        />
        <MetricCard
          label="Maintenance Alerts"
          value={maintenanceAlerts}
          icon="🔧"
          color={maintenanceAlerts > 0 ? 'orange' : 'green'}
        />
        <MetricCard
          label="Critical Alerts"
          value={criticalAlerts}
          icon="⚠️"
          color={criticalAlerts > 0 ? 'red' : 'green'}
        />
        <MetricCard
          label="Avg Vehicle Age"
          value={`${avgAge} yrs`}
          icon="📅"
          color="slate"
        />
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 px-6 pb-6 overflow-hidden">
        <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 border-b border-slate-600 flex items-center justify-between">
            <h2 className="text-xl font-bold text-blue-400">📍 Live Vehicle Map</h2>
            <div className="flex gap-3 text-xs">
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1">
                  <div style={{ background: color }} className="w-3 h-3 rounded-full"></div>
                  <span className="text-slate-300 capitalize">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 relative">
            <MapContainer
              center={mapCenter}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {vehicles.map(vehicle => {
                if (!vehicle.telemetry?.latitude || !vehicle.telemetry?.longitude) return null
                return (
                  <Marker
                    key={vehicle.id}
                    position={[vehicle.telemetry.latitude, vehicle.telemetry.longitude]}
                    icon={createMarkerIcon(vehicle.operational_status)}
                  >
                    <Popup>
                      <div className="text-slate-900">
                        <div className="font-bold text-lg">{vehicle.call_sign}</div>
                        <div className="text-sm">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div>Speed: {vehicle.telemetry.speed_kmh} km/h</div>
                          <div>Fuel: {vehicle.telemetry.fuel_level_percent}%</div>
                          <div>Battery: {vehicle.telemetry.battery_voltage}V</div>
                          {vehicle.telemetry.check_engine && (
                            <div className="text-red-600 font-bold">⚠️ Check Engine</div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl p-4">
            <h2 className="text-xl font-bold text-orange-400 mb-3">🔔 Critical Alerts</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {vehicles
                .filter(v => v.telemetry?.check_engine || (v.telemetry?.fuel_level_percent !== undefined && v.telemetry.fuel_level_percent < 20))
                .map(vehicle => (
                  <div key={vehicle.id} className="bg-slate-700 rounded p-3 border-l-4 border-red-500">
                    <div className="font-bold text-white">{vehicle.call_sign}</div>
                    <div className="text-sm text-slate-300">
                      {vehicle.telemetry?.check_engine && <div>⚠️ Check Engine Light</div>}
                      {vehicle.telemetry && vehicle.telemetry.fuel_level_percent < 20 && (
                        <div>⛽ Low Fuel: {vehicle.telemetry.fuel_level_percent}%</div>
                      )}
                    </div>
                  </div>
                ))}
              {criticalAlerts === 0 && (
                <div className="text-center text-slate-400 py-4">✓ No critical alerts</div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl p-4">
            <h2 className="text-xl font-bold text-green-400 mb-3">📋 DVIR Status (Today)</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Completed</span>
                <span className="text-white font-bold">{dvirCompleted} / {totalVehicles}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${dvirProgress}%` }}
                ></div>
              </div>
              <div className="text-center text-2xl font-bold text-green-400">
                {Math.round(dvirProgress)}%
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl p-4 flex-1 overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold text-cyan-400 mb-3">🚗 Vehicle List</h2>
            <div className="space-y-2 overflow-y-auto flex-1">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className="bg-slate-700 rounded p-3 hover:bg-slate-600 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-white">{vehicle.call_sign}</div>
                    <div
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ background: statusColors[vehicle.operational_status], color: 'white' }}
                    >
                      {vehicle.operational_status.toUpperCase().replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </div>
                  {vehicle.telemetry && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Speed:</span>{' '}
                        <span className="text-white font-mono">{vehicle.telemetry.speed_kmh} km/h</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Fuel:</span>{' '}
                        <span className="text-white font-mono">{vehicle.telemetry.fuel_level_percent}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Battery:</span>{' '}
                        <span className="text-white font-mono">{vehicle.telemetry.battery_voltage}V</span>
                      </div>
                      <div>
                        <span className="text-slate-400">RPM:</span>{' '}
                        <span className="text-white font-mono">{vehicle.telemetry.engine_rpm}</span>
                      </div>
                    </div>
                  )}
                  {vehicle.maintenance_alerts.length > 0 && (
                    <div className="mt-2 text-xs text-orange-400">
                      🔧 {vehicle.maintenance_alerts.length} maintenance alert(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number | string
  total?: number
  icon: string
  color: 'blue' | 'green' | 'orange' | 'red' | 'slate'
}

function MetricCard({ label, value, total, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700 border-blue-500',
    green: 'from-green-600 to-green-700 border-green-500',
    orange: 'from-orange-600 to-orange-700 border-orange-500',
    red: 'from-red-600 to-red-700 border-red-500',
    slate: 'from-slate-600 to-slate-700 border-slate-500',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg border-2 p-4 shadow-xl`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-4xl">{icon}</div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            {value}
            {total !== undefined && <span className="text-xl text-white/70"> / {total}</span>}
          </div>
          <div className="text-sm text-white/80 font-medium">{label}</div>
        </div>
      </div>
    </div>
  )
}
