import { useEffect, useState } from 'react'
import { Bell, X, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react'

interface IntelligentAlert {
  id: string
  alert_type: string
  severity: string
  audience: string
  title: string
  message: string
  explanation: string | null
  entity_type: string | null
  entity_id: string | null
  confidence: string
  suggested_actions: string[] | null
  created_at: string
  acknowledged_at: string | null
  dismissed: boolean
}

interface IntelligentAlertsProps {
  userId: string
  userRole: 'DISPATCHER' | 'SUPERVISOR' | 'CLINICAL_LEADERSHIP' | 'BILLING_COMPLIANCE'
  refreshInterval?: number
}

export default function IntelligentAlerts({
  userId,
  userRole,
  refreshInterval = 30000
}: IntelligentAlertsProps) {
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<IntelligentAlert | null>(null)

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`/api/intelligence/alerts?audience=${userRole}`)
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(data.filter((a: IntelligentAlert) => !a.dismissed))
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, refreshInterval)
    return () => clearInterval(interval)
  }, [userRole, refreshInterval])

  const handleAcknowledge = async (alertId: string) => {
    try {
      await fetch(`/api/intelligence/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      fetchAlerts()
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    }
  }

  const handleDismiss = async (alertId: string, reason: string) => {
    try {
      await fetch(`/api/intelligence/alerts/${alertId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason })
      })
      setSelectedAlert(null)
      fetchAlerts()
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
    }
  }

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged_at)
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged_at)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-white">Intelligent Alerts</h3>
          {unacknowledgedAlerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unacknowledgedAlerts.length}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 text-center text-gray-400">
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 text-center text-gray-400">
          No active alerts
        </div>
      ) : (
        <>
          {unacknowledgedAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400 uppercase">New Alerts</h4>
              {unacknowledgedAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => handleAcknowledge(alert.id)}
                  onViewDetails={() => setSelectedAlert(alert)}
                />
              ))}
            </div>
          )}

          {acknowledgedAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400 uppercase">Acknowledged</h4>
              {acknowledgedAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  acknowledged
                  onViewDetails={() => setSelectedAlert(alert)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedAlert && (
        <AlertDetailsDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onDismiss={(reason) => handleDismiss(selectedAlert.id, reason)}
        />
      )}

      <div className="text-xs text-gray-500 text-center">
        Role-aware notifications · Contextual alerts only
      </div>
    </div>
  )
}

function AlertCard({
  alert,
  acknowledged = false,
  onAcknowledge,
  onViewDetails
}: {
  alert: IntelligentAlert
  acknowledged?: boolean
  onAcknowledge?: () => void
  onViewDetails: () => void
}) {
  const severityConfig = {
    INFO: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30' },
    WARNING: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    CRITICAL: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' },
    URGENT: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-600/10 border-red-600/30' }
  }

  const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.INFO
  const Icon = config.icon

  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${acknowledged ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div>
            <h4 className="text-white font-semibold">{alert.title}</h4>
            <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
          </div>
        </div>
        {acknowledged && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(alert.created_at).toLocaleString()}</span>
          <span>·</span>
          <span className="text-gray-500">{alert.confidence} confidence</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onViewDetails}
            className="text-xs text-orange-500 hover:text-orange-400 font-medium"
          >
            View Details
          </button>
          {!acknowledged && onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded font-medium"
            >
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AlertDetailsDrawer({
  alert,
  onClose,
  onDismiss
}: {
  alert: IntelligentAlert
  onClose: () => void
  onDismiss: (reason: string) => void
}) {
  const [dismissReason, setDismissReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Alert Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-1">Title</h4>
            <p className="text-white">{alert.title}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-1">Message</h4>
            <p className="text-gray-300">{alert.message}</p>
          </div>

          {alert.explanation && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-1">Explanation</h4>
              <p className="text-gray-300 bg-zinc-800 rounded p-3">{alert.explanation}</p>
            </div>
          )}

          {alert.suggested_actions && alert.suggested_actions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Suggested Actions</h4>
              <ul className="space-y-2">
                {alert.suggested_actions.map((action, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span className="text-gray-300">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Severity</h4>
              <p className="text-white">{alert.severity}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Confidence</h4>
              <p className="text-white">{alert.confidence}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Type</h4>
              <p className="text-white">{alert.alert_type}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Created</h4>
              <p className="text-white">{new Date(alert.created_at).toLocaleString()}</p>
            </div>
          </div>

          {!alert.dismissed && (
            <div className="pt-4 border-t border-zinc-800">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Dismiss Alert</h4>
              <input
                type="text"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="Reason for dismissing (optional)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white placeholder-gray-500 mb-2"
              />
              <button
                onClick={() => onDismiss(dismissReason)}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
              >
                Dismiss Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
