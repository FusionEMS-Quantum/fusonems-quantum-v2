import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip } from '../lib/api'
import type { TripRequest, HEMSFlightRequest } from '../types'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const PRIORITY_BG: Record<string, string> = {
  STAT: 'bg-red-600',
  EMERGENT: 'bg-orange-500',
  URGENT: 'bg-amber-500',
  ROUTINE: 'bg-emerald-600',
}

export default function TripDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<TripRequest | HEMSFlightRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getTrip(id)
      .then(setTrip)
      .finally(() => setLoading(false))
  }, [id])

  const openNavigation = (lat: number | null, lng: number | null, address: string) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted">Loading trip...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center p-4">
        <p className="text-muted">Trip not found</p>
        <button onClick={() => navigate('/')} className="mt-4 crewlink-btn-primary px-6 py-2">Back to Home</button>
      </div>
    )
  }

  const priorityBg = PRIORITY_BG[trip.priority] || 'bg-emerald-600'

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <PageHeader
        variant="subpage"
        showBack
        onBack={() => navigate('/')}
        title={`Trip #${trip.trip_number}`}
      />
      <div className={`px-4 py-2.5 text-center font-bold text-sm ${priorityBg} animate-fade-in`}>
        {trip.priority} — {trip.service_level}
      </div>
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {trip.acknowledged_at && (
          <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-button p-3 animate-fade-in">
            <div className="text-xs text-emerald-400 font-medium">ACKNOWLEDGED</div>
            <div className="font-mono text-sm">{new Date(trip.acknowledged_at).toLocaleString()}</div>
          </div>
        )}
        {trip.patient_contact_at && (
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-button p-3 animate-fade-in">
            <div className="text-xs text-blue-400 font-medium">PATIENT CONTACT</div>
            <div className="font-mono text-sm">{new Date(trip.patient_contact_at).toLocaleString()}</div>
          </div>
        )}
        <div className="crewlink-card p-4 animate-slide-up">
          <div className="text-xs text-muted uppercase tracking-wide mb-1">PATIENT</div>
          <div className="text-xl font-bold">{trip.patient_first_name} {trip.patient_last_name}</div>
          <div className="text-muted text-sm">DOB: {trip.patient_dob}</div>
          <div className="mt-2 text-sm text-muted-light">{trip.chief_complaint}</div>
          {trip.special_needs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {trip.special_needs.map((need, i) => (
                <span key={i} className="px-2 py-1 bg-surface-elevated rounded-button text-xs border border-border">{need}</span>
              ))}
            </div>
          )}
        </div>
        <div className="crewlink-card p-4 animate-slide-up">
          <div className="text-xs text-muted uppercase tracking-wide mb-1">PICKUP</div>
          <div className="font-bold">{trip.pickup_facility}</div>
          <div className="text-sm text-muted-light">{trip.pickup_address}</div>
          {trip.pickup_floor_room && <div className="text-sm text-muted">Room: {trip.pickup_floor_room}</div>}
          <div className="text-sm text-muted mt-1">Contact: {trip.pickup_contact} — {trip.pickup_phone}</div>
          <button onClick={() => openNavigation(trip.pickup_lat, trip.pickup_lng, trip.pickup_address)} className="mt-3 w-full crewlink-btn-primary py-2.5">
            Navigate to Pickup →
          </button>
        </div>
        <div className="crewlink-card p-4 animate-slide-up">
          <div className="text-xs text-muted uppercase tracking-wide mb-1">DESTINATION</div>
          <div className="font-bold">{trip.destination_facility}</div>
          <div className="text-sm text-muted-light">{trip.destination_address}</div>
          {trip.destination_floor_room && <div className="text-sm text-muted">Room: {trip.destination_floor_room}</div>}
          <div className="text-sm text-muted mt-1">Contact: {trip.destination_contact} — {trip.destination_phone}</div>
          <button onClick={() => openNavigation(trip.destination_lat, trip.destination_lng, trip.destination_address)} className="mt-3 w-full crewlink-btn-primary py-2.5">
            Navigate to Destination →
          </button>
        </div>
        {trip.notes && (
          <div className="crewlink-card p-4 animate-slide-up">
            <div className="text-xs text-muted uppercase tracking-wide mb-1">NOTES</div>
            <div className="text-sm whitespace-pre-wrap text-muted-light">{trip.notes}</div>
          </div>
        )}
        {trip.dispatch_notes && (
          <div className="bg-amber-900/25 border border-amber-600/50 rounded-card p-4 animate-fade-in">
            <div className="text-xs text-amber-400 font-medium mb-1">DISPATCH NOTES</div>
            <div className="text-sm whitespace-pre-wrap text-muted-light">{trip.dispatch_notes}</div>
          </div>
        )}
        {trip.equipment_needed.length > 0 && (
          <div className="crewlink-card p-4 animate-slide-up">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">EQUIPMENT NEEDED</div>
            <div className="flex flex-wrap gap-1.5">
              {trip.equipment_needed.map((item, i) => (
                <span key={i} className="px-2.5 py-1 bg-primary/20 border border-primary/50 rounded-button text-xs text-primary font-medium">{item}</span>
              ))}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
