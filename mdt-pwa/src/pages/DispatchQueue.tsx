import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../lib/api'

interface QueueIncident {
  id: string
  incident_number: string
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENT' | 'STAT'
  status: string
  pickup_facility: string
  destination_facility: string
  transport_type: string
  assigned_unit?: string
  created_at: string
  scheduled_time?: string
  notes?: string
}

export default function DispatchQueue() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState<QueueIncident[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'active'>('all')
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const unitId = localStorage.getItem('unit_id')

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(() => {
      fetchQueue()
      setLastUpdate(new Date())
    }, 10000)
    return () => clearInterval(interval)
  }, [filter])

  const fetchQueue = async () => {
    try {
      const response = await api.get('/crewlink/trips/pending')
      let data = response.data || []
      
      if (filter === 'pending') {
        data = data.filter((i: QueueIncident) => i.status === 'pending')
      } else if (filter === 'assigned') {
        data = data.filter((i: QueueIncident) => i.assigned_unit === unitId)
      } else if (filter === 'active') {
        data = data.filter((i: QueueIncident) => 
          ['acknowledged', 'enroute', 'on_scene', 'transporting'].includes(i.status)
        )
      }
      
      setIncidents(data)
    } catch (error) {
      console.error('Failed to fetch dispatch queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'STAT':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          glow: 'shadow-lg shadow-red-500/50',
          text: 'text-red-100'
        }
      case 'EMERGENT':
        return {
          bg: 'bg-orange-600',
          border: 'border-orange-500',
          glow: 'shadow-lg shadow-orange-500/50',
          text: 'text-orange-100'
        }
      case 'URGENT':
        return {
          bg: 'bg-yellow-600',
          border: 'border-yellow-500',
          glow: 'shadow-lg shadow-yellow-500/50',
          text: 'text-yellow-100'
        }
      default:
        return {
          bg: 'bg-green-600',
          border: 'border-green-500',
          glow: '',
          text: 'text-green-100'
        }
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: string }> = {
      pending: { bg: 'bg-gray-700', text: 'text-gray-300', icon: '⏱' },
      acknowledged: { bg: 'bg-blue-700', text: 'text-blue-200', icon: '✓' },
      enroute: { bg: 'bg-yellow-700', text: 'text-yellow-200', icon: '→' },
      on_scene: { bg: 'bg-orange-700', text: 'text-orange-200', icon: '📍' },
      transporting: { bg: 'bg-purple-700', text: 'text-purple-200', icon: '🚑' },
    }
    const badge = badges[status] || badges.pending
    return (
      <span className={`${badge.bg} ${badge.text} px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5`}>
        <span>{badge.icon}</span>
        {status.replace(/_/g, ' ')}
      </span>
    )
  }

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'HH:mm')
    } catch {
      return '--:--'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-xl border-b border-gray-800 shadow-2xl sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')} 
                className="text-3xl hover:text-blue-400 transition-colors p-2"
              >
                ⬅
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  DISPATCH QUEUE
                </h1>
                <p className="text-sm text-gray-500 font-mono">LIVE CAD MONITOR</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400 font-mono">{unitId || 'NO UNIT'}</div>
              <div className="text-xs text-gray-500">Last Update: {format(lastUpdate, 'HH:mm:ss')}</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'all', label: 'ALL', icon: '📋' },
              { key: 'pending', label: 'PENDING', icon: '⏱' },
              { key: 'assigned', label: 'YOUR UNIT', icon: '🚑' },
              { key: 'active', label: 'ACTIVE', icon: '⚡' }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                  filter === f.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50 scale-105'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <span className="mr-2">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Read-Only Notice */}
        <div className="bg-yellow-900/30 border-t border-yellow-700/50 px-6 py-3 text-sm flex items-center gap-3">
          <span className="text-yellow-500 text-lg">⚠️</span>
          <span className="text-yellow-200">
            <span className="font-bold">AWARENESS ONLY:</span> This is a read-only queue. 
            Accept/decline calls on <span className="font-bold underline">CrewLink</span>, not MDT.
          </span>
        </div>
      </header>

      {/* Queue List */}
      <main className="p-6">
        {/* Quick Access Buttons */}
        <div className="max-w-7xl mx-auto mb-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/messages')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-3"
          >
            <span className="text-2xl">💬</span>
            <span>Message Dispatch</span>
          </button>
          
          <button
            onClick={() => navigate('/mileage')}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-3"
          >
            <span className="text-2xl">📏</span>
            <span>Mileage Tracking</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">⏳</div>
            <div className="text-xl">Loading dispatch queue...</div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-2xl">No incidents in <span className="font-bold">{filter}</span> queue</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto">
            {incidents.map((incident) => {
              const priorityStyles = getPriorityStyles(incident.priority)
              const isYourUnit = incident.assigned_unit === unitId
              
              return (
                <div
                  key={incident.id}
                  className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 transition-all hover:scale-[1.02] ${
                    isYourUnit
                      ? 'border-blue-500 shadow-2xl shadow-blue-500/50 ring-4 ring-blue-500/20'
                      : 'border-gray-700 hover:border-gray-600'
                  } ${priorityStyles.glow}`}
                >
                  {/* Priority Banner */}
                  <div className="absolute -top-3 left-6">
                    <span className={`${priorityStyles.bg} ${priorityStyles.text} px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg`}>
                      {incident.priority}
                    </span>
                  </div>

                  {/* Your Unit Badge */}
                  {isYourUnit && (
                    <div className="absolute -top-3 right-6">
                      <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg animate-pulse">
                        🚑 YOUR UNIT
                      </span>
                    </div>
                  )}

                  {/* Header Row */}
                  <div className="flex items-center justify-between mt-4 mb-4">
                    <span className="text-2xl font-black text-gray-400 font-mono">
                      #{incident.incident_number}
                    </span>
                    {getStatusBadge(incident.status)}
                  </div>

                  {/* Transport Info */}
                  <div className="space-y-3 mb-4">
                    <div className="bg-black/40 rounded-xl p-4 border border-gray-700">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pickup</div>
                      <div className="text-xl font-bold text-white">{incident.pickup_facility}</div>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="bg-gray-700 rounded-full p-2">
                        <span className="text-2xl">↓</span>
                      </div>
                    </div>
                    
                    <div className="bg-black/40 rounded-xl p-4 border border-gray-700">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Destination</div>
                      <div className="text-xl font-bold text-white">{incident.destination_facility}</div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 uppercase mb-1">Type</div>
                      <div className="text-sm font-bold text-white">{incident.transport_type}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 uppercase mb-1">Created</div>
                      <div className="text-sm font-bold text-white font-mono">
                        {formatTime(incident.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Time */}
                  {incident.scheduled_time && (
                    <div className="mt-3 bg-blue-900/30 border border-blue-700 rounded-lg p-3 flex items-center gap-2">
                      <span className="text-blue-400 text-lg">🕐</span>
                      <span className="text-sm text-blue-200">
                        Scheduled: <span className="font-bold">{formatTime(incident.scheduled_time)}</span>
                      </span>
                    </div>
                  )}

                  {/* Assigned Unit (if not yours) */}
                  {incident.assigned_unit && !isYourUnit && (
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                      <span>🚑</span>
                      <span>Assigned: <span className="font-mono font-bold">{incident.assigned_unit}</span></span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
