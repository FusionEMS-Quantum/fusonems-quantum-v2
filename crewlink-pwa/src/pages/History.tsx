import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTripHistory } from '../lib/api'
import type { TripHistoryItem } from '../types'

export default function History() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<TripHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTripHistory()
      .then(setTrips)
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-2xl">←</button>
        <h1 className="font-semibold">Trip History</h1>
        <div className="w-8" />
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : trips.length === 0 ? (
          <div className="text-center text-gray-400">No trip history</div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-gray-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-gray-400">#{trip.trip_number}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    trip.priority === 'STAT' ? 'bg-red-600' :
                    trip.priority === 'EMERGENT' ? 'bg-orange-500' :
                    trip.priority === 'URGENT' ? 'bg-yellow-500' : 'bg-green-600'
                  }`}>
                    {trip.service_level}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="text-gray-300">{trip.pickup_facility}</div>
                  <div className="text-gray-500 text-center">↓</div>
                  <div className="text-gray-300">{trip.destination_facility}</div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>{formatDate(trip.acknowledged_at)}</span>
                  <span className={`px-2 py-1 rounded ${
                    trip.status === 'COMPLETED' ? 'bg-green-900 text-green-400' :
                    trip.status === 'CANCELLED' ? 'bg-red-900 text-red-400' : 'bg-blue-900 text-blue-400'
                  }`}>
                    {trip.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="bg-gray-800 px-4 py-3 flex justify-around">
        <button onClick={() => navigate('/')} className="flex flex-col items-center text-gray-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">Home</span>
        </button>
        <button onClick={() => navigate('/ptt')} className="flex flex-col items-center text-gray-400">
          <span className="text-xl">🎙️</span>
          <span className="text-xs">PTT</span>
        </button>
        <button className="flex flex-col items-center text-blue-400">
          <span className="text-xl">📋</span>
          <span className="text-xs">History</span>
        </button>
        <button onClick={() => navigate('/settings')} className="flex flex-col items-center text-gray-400">
          <span className="text-xl">⚙️</span>
          <span className="text-xs">Settings</span>
        </button>
      </nav>
    </div>
  )
}
