import { useState, useEffect } from 'react'
import { getTripHistory } from '../lib/api'
import type { TripHistoryItem } from '../types'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const PRIORITY_BG: Record<string, string> = {
  STAT: 'bg-red-600',
  EMERGENT: 'bg-orange-500',
  URGENT: 'bg-amber-500',
  ROUTINE: 'bg-emerald-600',
}
const STATUS_BG: Record<string, string> = {
  COMPLETED: 'bg-emerald-900/50 text-emerald-400 border border-emerald-600/50',
  CANCELLED: 'bg-red-900/50 text-red-400 border border-red-600/50',
}

export default function History() {
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
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <PageHeader variant="subpage" showBack title="Trip History" />
      <main className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-muted text-sm">Loading...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-3 bg-surface-elevated rounded-2xl flex items-center justify-center border border-border/50">
              <svg className="w-8 h-8 text-muted" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-muted font-medium">No trip history</p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {trips.map((trip) => (
              <div key={trip.id} className="crewlink-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-muted">#{trip.trip_number}</span>
                  <span className={`px-2.5 py-1 rounded-button text-xs font-bold ${PRIORITY_BG[trip.priority] || 'bg-emerald-600'}`}>
                    {trip.service_level}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="text-muted-light">{trip.pickup_facility}</div>
                  <div className="text-muted text-center py-0.5">↓</div>
                  <div className="text-muted-light">{trip.destination_facility}</div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{formatDate(trip.acknowledged_at)}</span>
                  <span className={`px-2 py-1 rounded-button ${STATUS_BG[trip.status] || 'bg-primary/20 text-primary border border-primary/50'}`}>
                    {trip.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
