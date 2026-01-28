import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleContext } from '../App'
import { initSocket } from '../lib/socket'
import { showNotification, playTripAlert, playAcknowledge } from '../lib/notifications'
import { hasModule } from '../lib/modules'
import { acknowledgeTrip, getActiveTrip, getDutyStatus, recordPatientContact, unableToRespond } from '../lib/api'
import type { TripRequest, HEMSFlightRequest, DutyStatus, TripPriority, UnableToRespondReason } from '../types'
import { UNABLE_TO_RESPOND_REASONS } from '../types'

const PRIORITY_COLORS: Record<TripPriority, string> = {
  ROUTINE: 'bg-green-600',
  URGENT: 'bg-yellow-500',
  EMERGENT: 'bg-orange-500',
  STAT: 'bg-red-600',
}

export default function Dashboard() {
  const modules = useContext(ModuleContext)
  const navigate = useNavigate()
  const [activeTrip, setActiveTrip] = useState<TripRequest | HEMSFlightRequest | null>(null)
  const [pendingTrip, setPendingTrip] = useState<TripRequest | HEMSFlightRequest | null>(null)
  const [dutyStatus, setDutyStatus] = useState<DutyStatus | null>(null)
  const [acknowledging, setAcknowledging] = useState(false)
  const [recordingContact, setRecordingContact] = useState(false)
  const [showUnableModal, setShowUnableModal] = useState(false)
  const [unableReason, setUnableReason] = useState<UnableToRespondReason | null>(null)
  const [unableNotes, setUnableNotes] = useState('')
  const [submittingUnable, setSubmittingUnable] = useState(false)

  const crewRole = localStorage.getItem('crew_role')
  const isHEMSRole = localStorage.getItem('is_hems') === 'true'

  useEffect(() => {
    const unitId = localStorage.getItem('unit_id')
    const socket = initSocket(unitId || undefined)

    getActiveTrip().then(setActiveTrip).catch(() => {})
    if (hasModule(modules, 'hemsDutyTime') && isHEMSRole) {
      getDutyStatus().then(setDutyStatus).catch(() => {})
    }

    socket.on('trip:request', (data: TripRequest | HEMSFlightRequest) => {
      setPendingTrip(data)
      playTripAlert(data.priority)
      showNotification(`${data.priority} - New Trip Request`, {
        body: `${data.pickup_facility} → ${data.destination_facility}\n${data.service_level} | ${data.chief_complaint}`,
        tag: 'trip-request',
        requireInteraction: true,
      })
    })

    socket.on('trip:cancelled', (tripId: string) => {
      if (pendingTrip?.id === tripId) {
        setPendingTrip(null)
        showNotification('Trip Cancelled', { body: 'The pending trip has been cancelled' })
      }
      if (activeTrip?.id === tripId) {
        setActiveTrip(null)
        showNotification('Trip Cancelled', { body: 'Your active trip has been cancelled' })
      }
    })

    socket.on('trip:updated', (data: TripRequest) => {
      if (activeTrip?.id === data.id) {
        setActiveTrip(data)
      }
    })

    return () => {
      socket.off('trip:request')
      socket.off('trip:cancelled')
      socket.off('trip:updated')
    }
  }, [modules, activeTrip?.id, pendingTrip?.id, isHEMSRole])

  const handleAcknowledge = async () => {
    if (!pendingTrip) return
    setAcknowledging(true)
    try {
      const timestamp = new Date().toISOString()
      await acknowledgeTrip(pendingTrip.id, timestamp)
      playAcknowledge()
      setActiveTrip({ ...pendingTrip, status: 'ACKNOWLEDGED', acknowledged_at: timestamp })
      setPendingTrip(null)
      localStorage.setItem('active_trip_id', pendingTrip.id)
      showNotification('Trip Acknowledged', {
        body: `${pendingTrip.pickup_facility} → ${pendingTrip.destination_facility}`,
      })
    } catch (error) {
      alert('Failed to acknowledge trip')
    } finally {
      setAcknowledging(false)
    }
  }

  const handlePatientContact = async () => {
    if (!activeTrip) return
    setRecordingContact(true)
    try {
      const timestamp = new Date().toISOString()
      await recordPatientContact(activeTrip.id, timestamp)
      setActiveTrip({ ...activeTrip, status: 'PATIENT_CONTACT', patient_contact_at: timestamp })
      showNotification('Patient Contact Recorded', {
        body: `Time: ${new Date(timestamp).toLocaleTimeString()}`,
      })
    } catch (error) {
      alert('Failed to record patient contact')
    } finally {
      setRecordingContact(false)
    }
  }

  const handleUnableToRespond = async () => {
    if (!pendingTrip || !unableReason) return
    setSubmittingUnable(true)
    try {
      await unableToRespond(pendingTrip.id, unableReason, unableNotes || undefined)
      setPendingTrip(null)
      setShowUnableModal(false)
      setUnableReason(null)
      setUnableNotes('')
      showNotification('Response Recorded', {
        body: `Unable to respond: ${UNABLE_TO_RESPOND_REASONS[unableReason]}`,
      })
    } catch (error) {
      alert('Failed to record response')
    } finally {
      setSubmittingUnable(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
            CL
          </div>
          <div>
            <div className="font-semibold">CrewLink</div>
            <div className="text-xs text-gray-400">{crewRole?.replace('_', ' ') || 'No Role'}</div>
          </div>
        </div>
        <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-gray-700">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </header>

      {hasModule(modules, 'hemsDutyTime') && dutyStatus && isHEMSRole && (
        <div className={`px-4 py-2 text-sm ${dutyStatus.is_compliant ? 'bg-green-900' : 'bg-red-900'}`}>
          <div className="flex justify-between">
            <span>Duty: {dutyStatus.total_hours_today.toFixed(1)}h today</span>
            <span>7-day: {dutyStatus.total_hours_7_day.toFixed(1)}/{dutyStatus.max_hours_7_day}h</span>
          </div>
          {dutyStatus.warnings.length > 0 && (
            <div className="text-yellow-400 text-xs mt-1">{dutyStatus.warnings[0]}</div>
          )}
        </div>
      )}

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {pendingTrip && (
          <div className={`rounded-xl overflow-hidden ${PRIORITY_COLORS[pendingTrip.priority]} animate-pulse`}>
            <div className="bg-black/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold">{pendingTrip.priority}</span>
                <span className="px-2 py-1 bg-white/20 rounded text-sm">{pendingTrip.service_level}</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-white/70">PICKUP</div>
                  <div className="font-semibold">{pendingTrip.pickup_facility}</div>
                </div>
                
                <div className="text-center text-2xl">↓</div>
                
                <div>
                  <div className="text-xs text-white/70">DESTINATION</div>
                  <div className="font-semibold">{pendingTrip.destination_facility}</div>
                </div>
                
                <div className="pt-2 border-t border-white/20">
                  <div className="text-sm">{pendingTrip.chief_complaint}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowUnableModal(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-lg text-lg"
                  >
                    UNABLE TO RESPOND
                  </button>
                  <button
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                    className="bg-white text-black font-bold py-4 rounded-lg text-lg disabled:opacity-50"
                  >
                    {acknowledging ? 'ACK...' : 'ACKNOWLEDGE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showUnableModal && pendingTrip && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Unable to Respond</h2>
              <p className="text-gray-400 text-sm mb-4">
                Select reason (required):
              </p>

              <div className="space-y-2 mb-4">
                {(Object.keys(UNABLE_TO_RESPOND_REASONS) as UnableToRespondReason[]).map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setUnableReason(reason)}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg border-2 transition-colors
                      ${unableReason === reason 
                        ? 'border-blue-500 bg-blue-900/30 text-white' 
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    {UNABLE_TO_RESPOND_REASONS[reason]}
                  </button>
                ))}
              </div>

              {unableReason === 'OTHER' && (
                <textarea
                  value={unableNotes}
                  onChange={(e) => setUnableNotes(e.target.value)}
                  placeholder="Brief note (optional)"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white mb-4"
                  rows={3}
                />
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnableModal(false)
                    setUnableReason(null)
                    setUnableNotes('')
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnableToRespond}
                  disabled={!unableReason || submittingUnable}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                >
                  {submittingUnable ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTrip && !pendingTrip && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Active Trip</span>
              <span className={`px-2 py-1 rounded text-xs ${PRIORITY_COLORS[activeTrip.priority]}`}>
                {activeTrip.priority}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">From:</span>
                <span>{activeTrip.pickup_facility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">To:</span>
                <span>{activeTrip.destination_facility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Service:</span>
                <span>{activeTrip.service_level}</span>
              </div>
            </div>

            {activeTrip.acknowledged_at && (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-3">
                <div className="text-xs text-green-400">ACKNOWLEDGED</div>
                <div className="font-mono">{new Date(activeTrip.acknowledged_at).toLocaleTimeString()}</div>
              </div>
            )}

            {activeTrip.status === 'ACKNOWLEDGED' && !activeTrip.patient_contact_at && (
              <button
                onClick={handlePatientContact}
                disabled={recordingContact}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg disabled:opacity-50"
              >
                {recordingContact ? 'RECORDING...' : 'PATIENT CONTACT'}
              </button>
            )}

            {activeTrip.patient_contact_at && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                <div className="text-xs text-blue-400">PATIENT CONTACT</div>
                <div className="font-mono">{new Date(activeTrip.patient_contact_at).toLocaleTimeString()}</div>
              </div>
            )}

            <button
              onClick={() => navigate(`/trip/${activeTrip.id}`)}
              className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
            >
              View Trip Details
            </button>
          </div>
        )}

        {!activeTrip && !pendingTrip && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-gray-400">Waiting for dispatch</div>
          </div>
        )}
      </main>

      <nav className="bg-gray-800 border-t border-gray-700 p-2">
        <div className="grid grid-cols-5 gap-1">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center py-2 rounded-lg bg-blue-600/20 text-blue-400"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button
            onClick={() => navigate('/ptt')}
            className="flex flex-col items-center py-2 rounded-lg hover:bg-gray-700 text-gray-400"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span className="text-xs mt-1">PTT</span>
          </button>
          
          <button
            onClick={() => navigate('/messages')}
            className="flex flex-col items-center py-2 rounded-lg hover:bg-gray-700 text-gray-400"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span className="text-xs mt-1">Messages</span>
          </button>
          
          <button
            onClick={() => navigate('/directory')}
            className="flex flex-col items-center py-2 rounded-lg hover:bg-gray-700 text-gray-400"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span className="text-xs mt-1">Directory</span>
          </button>
          
          <button
            onClick={() => navigate('/scanner')}
            className="flex flex-col items-center py-2 rounded-lg hover:bg-gray-700 text-gray-400"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs mt-1">Scan</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
