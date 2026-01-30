import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleContext } from '../App'
import { initSocket } from '../lib/socket'
import { showNotification, playTripAlert, playAcknowledge } from '../lib/notifications'
import { hasModule } from '../lib/modules'
<<<<<<< Current (Your changes)
import { acknowledgeTrip, getActiveTrip, getDutyStatus, getTrip, recordPatientContact, unableToRespond } from '../lib/api'
=======
import { acknowledgeTrip, getActiveTrip, getDutyStatus, getPages, recordPatientContact, unableToRespond } from '../lib/api'
import type { CrewPage } from '../lib/api'
>>>>>>> Incoming (Background Agent changes)
import type { TripRequest, HEMSFlightRequest, DutyStatus, TripPriority, UnableToRespondReason } from '../types'
import { UNABLE_TO_RESPOND_REASONS } from '../types'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const PRIORITY_COLORS: Record<TripPriority, string> = {
  ROUTINE: 'bg-emerald-600',
  URGENT: 'bg-amber-500',
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
  const [crewPages, setCrewPages] = useState<CrewPage[]>([])
  const [lastPageId, setLastPageId] = useState<number>(0)

  const crewRole = localStorage.getItem('crew_role')
  const isHEMSRole = localStorage.getItem('is_hems') === 'true'

  useEffect(() => {
    const unitId = localStorage.getItem('unit_id')
    const socket = initSocket(unitId || undefined)

    getActiveTrip().then(setActiveTrip).catch(() => {})
    getPages().then((pages) => {
      setCrewPages(pages)
      const maxId = Math.max(0, ...pages.map((p) => p.id))
      setLastPageId(maxId)
    }).catch(() => {})
    if (hasModule(modules, 'hemsDutyTime') && isHEMSRole) {
      getDutyStatus().then(setDutyStatus).catch(() => {})
    }

    socket.on('crewlink:page', (data: CrewPage) => {
      setCrewPages((prev) => [data, ...prev])
      playTripAlert(data.priority)
      showNotification(data.title, {
        body: data.message,
        tag: `page-${data.id}`,
        requireInteraction: data.priority === 'STAT' || data.priority === 'EMERGENT',
      })
    })

    socket.on('trip:request', (data: TripRequest | HEMSFlightRequest) => {
      setPendingTrip(data)
      playTripAlert(data.priority)
      showNotification(`${data.priority} - New Trip Request`, {
        body: `${data.pickup_facility} → ${data.destination_facility}\n${data.service_level} | ${data.chief_complaint}`,
        tag: 'trip-request',
        requireInteraction: true,
      })
    })

    // CAD assignment:received (from Node when FastAPI assigns via socket bridge) — fetch full trip from API
    socket.on('assignment:received', async (data: { incidentId?: string; incident?: { incidentId?: string }; unitId?: string }) => {
      const incidentId = data?.incidentId ?? data?.incident?.incidentId
      if (!incidentId) return
      try {
        const trip = await getTrip(String(incidentId))
        if (trip) {
          setPendingTrip(trip)
          playTripAlert(trip.priority)
          showNotification(`${trip.priority} - New Trip Request`, {
            body: `${trip.pickup_facility} → ${trip.destination_facility}\n${trip.service_level} | ${trip.chief_complaint}`,
            tag: 'trip-request',
            requireInteraction: true,
          })
        }
      } catch {
        // Trip may not be for this unit; ignore
      }
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

    const pagesInterval = setInterval(() => {
      getPages().then((pages) => {
        setCrewPages(pages)
        const maxId = Math.max(0, ...pages.map((p) => p.id))
        if (maxId > lastPageId) {
          const newPage = pages.find((p) => p.id === maxId)
          if (newPage) {
            playTripAlert(newPage.priority)
            showNotification(newPage.title, { body: newPage.message, tag: `page-${newPage.id}` })
          }
          setLastPageId(maxId)
        }
      }).catch(() => {})
    }, 30000)
    return () => {
      clearInterval(pagesInterval)
      socket.off('crewlink:page')
      socket.off('trip:request')
      socket.off('assignment:received')
      socket.off('trip:cancelled')
      socket.off('trip:updated')
    }
  }, [modules, activeTrip?.id, pendingTrip?.id, isHEMSRole, lastPageId])

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

  const settingsButton = (
    <button
      onClick={() => navigate('/settings')}
      className="p-2 rounded-button text-muted hover:text-white hover:bg-surface-elevated transition-colors"
      aria-label="Settings"
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    </button>
  )

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <PageHeader
        variant="dashboard"
        title="CrewLink"
        subtitle={crewRole?.replace('_', ' ') || 'No Role'}
        right={settingsButton}
      />

      {hasModule(modules, 'hemsDutyTime') && dutyStatus && isHEMSRole && (
        <div className={`px-4 py-2.5 text-sm animate-fade-in ${dutyStatus.is_compliant ? 'bg-emerald-900/40 border-b border-emerald-700/50' : 'bg-red-900/40 border-b border-red-700/50'}`}>
          <div className="flex justify-between">
            <span>Duty: {dutyStatus.total_hours_today.toFixed(1)}h today</span>
            <span>7-day: {dutyStatus.total_hours_7_day.toFixed(1)}/{dutyStatus.max_hours_7_day}h</span>
          </div>
          {dutyStatus.warnings.length > 0 && (
            <div className="text-amber-300 text-xs mt-1">{dutyStatus.warnings[0]}</div>
          )}
        </div>
      )}

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {crewPages.length > 0 && (
          <div className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">
            <div className="px-4 py-2 bg-gray-700 font-semibold text-sm">Crew pages / Alerts</div>
            <ul className="divide-y divide-gray-700 max-h-32 overflow-y-auto">
              {crewPages.slice(0, 5).map((p) => (
                <li key={p.id} className={`px-4 py-2 text-sm border-l-4 ${p.priority === 'STAT' ? 'border-red-600' : p.priority === 'EMERGENT' ? 'border-orange-500' : p.priority === 'URGENT' ? 'border-yellow-500' : 'border-green-600'}`}>
                  <span className="font-medium">{p.title}</span>
                  <span className="text-gray-400 ml-2">{p.message}</span>
                  <div className="text-xs text-gray-500 mt-0.5">{p.sent_by} · {new Date(p.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {pendingTrip && (
          <div className={`rounded-card-lg overflow-hidden ${PRIORITY_COLORS[pendingTrip.priority]} animate-pulse-soft shadow-card`}>
            <div className="bg-black/25 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold">{pendingTrip.priority}</span>
                <span className="px-2.5 py-1 bg-white/20 rounded-button text-sm font-medium">{pendingTrip.service_level}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-white/70 uppercase tracking-wide">PICKUP</div>
                  <div className="font-semibold">{pendingTrip.pickup_facility}</div>
                </div>
                <div className="text-center text-2xl text-white/80">↓</div>
                <div>
                  <div className="text-xs text-white/70 uppercase tracking-wide">DESTINATION</div>
                  <div className="font-semibold">{pendingTrip.destination_facility}</div>
                </div>
                <div className="pt-2 border-t border-white/20">
                  <div className="text-sm">{pendingTrip.chief_complaint}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowUnableModal(true)}
                    className="crewlink-btn-secondary py-4 text-base font-bold"
                  >
                    UNABLE TO RESPOND
                  </button>
                  <button
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                    className="bg-white text-gray-900 font-bold py-4 rounded-button text-base disabled:opacity-50 active:scale-[0.98]"
                  >
                    {acknowledging ? 'ACK...' : 'ACKNOWLEDGE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showUnableModal && pendingTrip && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="crewlink-card p-6 max-w-md w-full animate-slide-up">
              <h2 className="text-xl font-bold mb-4 text-white">Unable to Respond</h2>
              <p className="text-muted text-sm mb-4">Select reason (required):</p>
              <div className="space-y-2 mb-4">
                {(Object.keys(UNABLE_TO_RESPOND_REASONS) as UnableToRespondReason[]).map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setUnableReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-button border-2 transition-colors ${
                      unableReason === reason
                        ? 'border-primary bg-primary/20 text-white'
                        : 'border-border bg-surface-elevated text-muted-light hover:border-muted'
                    }`}
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
                  className="crewlink-input mb-4"
                  rows={3}
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowUnableModal(false); setUnableReason(null); setUnableNotes('') }}
                  className="flex-1 crewlink-btn-secondary py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnableToRespond}
                  disabled={!unableReason || submittingUnable}
                  className="flex-1 crewlink-btn-primary py-3 disabled:opacity-50"
                >
                  {submittingUnable ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTrip && !pendingTrip && (
          <div className="crewlink-card p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-white">Active Trip</span>
              <span className={`px-2.5 py-1 rounded-button text-xs font-medium ${PRIORITY_COLORS[activeTrip.priority]}`}>
                {activeTrip.priority}
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">From:</span>
                <span>{activeTrip.pickup_facility}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">To:</span>
                <span>{activeTrip.destination_facility}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Service:</span>
                <span>{activeTrip.service_level}</span>
              </div>
            </div>
            {activeTrip.acknowledged_at && (
              <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-button p-3 mb-3">
                <div className="text-xs text-emerald-400 font-medium">ACKNOWLEDGED</div>
                <div className="font-mono text-sm">{new Date(activeTrip.acknowledged_at).toLocaleTimeString()}</div>
              </div>
            )}
            {activeTrip.status === 'ACKNOWLEDGED' && !activeTrip.patient_contact_at && (
              <button
                onClick={handlePatientContact}
                disabled={recordingContact}
                className="w-full crewlink-btn-primary py-4 disabled:opacity-50"
              >
                {recordingContact ? 'RECORDING...' : 'PATIENT CONTACT'}
              </button>
            )}
            {activeTrip.patient_contact_at && (
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-button p-3">
                <div className="text-xs text-blue-400 font-medium">PATIENT CONTACT</div>
                <div className="font-mono text-sm">{new Date(activeTrip.patient_contact_at).toLocaleTimeString()}</div>
              </div>
            )}
            <button
              onClick={() => navigate(`/trip/${activeTrip.id}`)}
              className="w-full mt-3 crewlink-btn-secondary py-3"
            >
              View Trip Details
            </button>
          </div>
        )}

        {!activeTrip && !pendingTrip && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-4 bg-surface-elevated rounded-2xl flex items-center justify-center border border-border/50 shadow-card">
              <svg className="w-10 h-10 text-muted" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-muted font-medium mb-1">Waiting for dispatch</div>
            <p className="text-muted text-sm mb-6">New trip requests will appear here</p>
            <button
              onClick={() => navigate('/history')}
              className="text-primary hover:text-primary-hover text-sm font-medium"
            >
              View trip history →
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
