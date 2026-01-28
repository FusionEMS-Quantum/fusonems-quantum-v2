import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip } from '../lib/api'
import type { TripRequest, HEMSFlightRequest } from '../types'

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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Trip not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-2xl">←</button>
        <h1 className="font-semibold">Trip #{trip.trip_number}</h1>
        <div className="w-8" />
      </header>

      <div className={`px-4 py-2 text-center font-bold ${
        trip.priority === 'STAT' ? 'bg-red-600' :
        trip.priority === 'EMERGENT' ? 'bg-orange-500' :
        trip.priority === 'URGENT' ? 'bg-yellow-500' : 'bg-green-600'
      }`}>
        {trip.priority} - {trip.service_level}
      </div>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {trip.acknowledged_at && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
            <div className="text-xs text-green-400">ACKNOWLEDGED</div>
            <div className="font-mono text-sm">{new Date(trip.acknowledged_at).toLocaleString()}</div>
          </div>
        )}

        {trip.patient_contact_at && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <div className="text-xs text-blue-400">PATIENT CONTACT</div>
            <div className="font-mono text-sm">{new Date(trip.patient_contact_at).toLocaleString()}</div>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">PATIENT</div>
          <div className="text-xl font-bold">
            {trip.patient_first_name} {trip.patient_last_name}
          </div>
          <div className="text-gray-400">DOB: {trip.patient_dob}</div>
          <div className="mt-2 text-sm">{trip.chief_complaint}</div>
          {trip.special_needs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {trip.special_needs.map((need, i) => (
                <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">{need}</span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">PICKUP</div>
          <div className="font-bold">{trip.pickup_facility}</div>
          <div className="text-sm text-gray-300">{trip.pickup_address}</div>
          {trip.pickup_floor_room && (
            <div className="text-sm text-gray-400">Room: {trip.pickup_floor_room}</div>
          )}
          <div className="text-sm text-gray-400 mt-1">
            Contact: {trip.pickup_contact} - {trip.pickup_phone}
          </div>
          <button
            onClick={() => openNavigation(trip.pickup_lat, trip.pickup_lng, trip.pickup_address)}
            className="mt-2 w-full py-2 bg-blue-600 rounded-lg font-medium"
          >
            Navigate to Pickup →
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">DESTINATION</div>
          <div className="font-bold">{trip.destination_facility}</div>
          <div className="text-sm text-gray-300">{trip.destination_address}</div>
          {trip.destination_floor_room && (
            <div className="text-sm text-gray-400">Room: {trip.destination_floor_room}</div>
          )}
          <div className="text-sm text-gray-400 mt-1">
            Contact: {trip.destination_contact} - {trip.destination_phone}
          </div>
          <button
            onClick={() => openNavigation(trip.destination_lat, trip.destination_lng, trip.destination_address)}
            className="mt-2 w-full py-2 bg-blue-600 rounded-lg font-medium"
          >
            Navigate to Destination →
          </button>
        </div>

        {trip.notes && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">NOTES</div>
            <div className="text-sm whitespace-pre-wrap">{trip.notes}</div>
          </div>
        )}

        {trip.dispatch_notes && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4">
            <div className="text-xs text-yellow-400 mb-1">DISPATCH NOTES</div>
            <div className="text-sm whitespace-pre-wrap">{trip.dispatch_notes}</div>
          </div>
        )}

        {trip.equipment_needed.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-2">EQUIPMENT NEEDED</div>
            <div className="flex flex-wrap gap-1">
              {trip.equipment_needed.map((item, i) => (
                <span key={i} className="px-2 py-1 bg-blue-900/30 border border-blue-600 rounded text-xs">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
