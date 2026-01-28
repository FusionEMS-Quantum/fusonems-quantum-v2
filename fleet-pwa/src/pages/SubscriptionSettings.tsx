import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Subscription {
  id: number
  user_id: number
  push_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  critical_alerts: boolean
  maintenance_due: boolean
  maintenance_overdue: boolean
  dvir_defects: boolean
  daily_summary: boolean
  weekly_summary: boolean
  ai_recommendations: boolean
  vehicle_down: boolean
  fuel_alerts: boolean
  vehicle_ids: number[]
  quiet_hours_start: number
  quiet_hours_end: number
}

interface AlertConfig {
  id: keyof Subscription
  icon: string
  label: string
  description: string
  example: string
  color: string
  badge?: string
}

const ALERT_CONFIGS: AlertConfig[] = [
  {
    id: 'critical_alerts',
    icon: '🚨',
    label: 'Critical Alerts',
    description: 'Immediate action required',
    example: 'Check engine light detected on M101',
    color: 'from-red-600 to-red-700',
    badge: 'URGENT',
  },
  {
    id: 'maintenance_overdue',
    icon: '⏰',
    label: 'Overdue Maintenance',
    description: 'Past due service alerts',
    example: 'M102 oil change overdue by 2,000 km',
    color: 'from-orange-600 to-orange-700',
    badge: 'HIGH',
  },
  {
    id: 'dvir_defects',
    icon: '🔧',
    label: 'DVIR Defects',
    description: 'Failed inspection reports',
    example: 'M103 pre-trip found 2 defects - brake lights out',
    color: 'from-yellow-600 to-yellow-700',
  },
  {
    id: 'vehicle_down',
    icon: '🛑',
    label: 'Vehicle Out of Service',
    description: 'Unavailable vehicles',
    example: 'M104 taken out of service - transmission failure',
    color: 'from-purple-600 to-purple-700',
  },
  {
    id: 'ai_recommendations',
    icon: '🤖',
    label: 'AI Insights',
    description: 'Predictive & optimization',
    example: 'M101 battery failure predicted in 8 days (94% confidence)',
    color: 'from-pink-600 to-pink-700',
  },
  {
    id: 'fuel_alerts',
    icon: '⛽',
    label: 'Low Fuel',
    description: 'Fuel below 20%',
    example: 'M105 fuel level at 18% - refuel recommended',
    color: 'from-cyan-600 to-cyan-700',
  },
  {
    id: 'maintenance_due',
    icon: '📅',
    label: 'Maintenance Due Soon',
    description: 'Upcoming scheduled service',
    example: 'M106 due for inspection in 500 km',
    color: 'from-blue-600 to-blue-700',
  },
]

export default function SubscriptionSettings() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSubscription()
  }, [])

  async function fetchSubscription() {
    try {
      const response = await fetch('/api/fleet/subscriptions/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await response.json()
      setSubscription(data)
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSubscription() {
    if (!subscription) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/fleet/subscriptions/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(subscription),
      })
      const data = await response.json()
      setSubscription(data)
      
      const banner = document.createElement('div')
      banner.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl font-bold animate-bounce z-50'
      banner.textContent = '✅ Settings Saved Successfully'
      document.body.appendChild(banner)
      setTimeout(() => banner.remove(), 3000)
    } catch (error) {
      console.error('Failed to save subscription:', error)
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: keyof Subscription, value: any) {
    if (!subscription) return
    setSubscription({ ...subscription, [field]: value })
  }

  const enabledCount = subscription ? ALERT_CONFIGS.filter(c => subscription[c.id]).length : 0
  const channelCount = subscription ? [subscription.push_enabled, subscription.email_enabled, subscription.sms_enabled].filter(Boolean).length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-2xl font-bold text-blue-400 animate-pulse">Loading Notification Center...</div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-xl text-red-400">Failed to load notification settings</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-12">
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-6 shadow-2xl sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white transition-colors text-2xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Notification Command Center
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                {enabledCount} alert types active • {channelCount} channels enabled
              </p>
            </div>
          </div>
          <button
            onClick={saveSubscription}
            disabled={saving}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {saving ? '⏳ Saving...' : '💾 Save Configuration'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-3 gap-6">
          <ChannelCard
            icon="📱"
            title="Push Notifications"
            description="Instant browser alerts"
            enabled={subscription.push_enabled}
            onChange={(v) => updateField('push_enabled', v)}
            color="from-blue-600 to-blue-700"
          />
          <ChannelCard
            icon="📧"
            title="Email Notifications"
            description="Detailed email reports"
            enabled={subscription.email_enabled}
            onChange={(v) => updateField('email_enabled', v)}
            color="from-purple-600 to-purple-700"
          />
          <ChannelCard
            icon="💬"
            title="SMS Notifications"
            description="Critical alerts only"
            enabled={subscription.sms_enabled}
            onChange={(v) => updateField('sms_enabled', v)}
            color="from-pink-600 to-pink-700"
          />
        </div>

        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl border-2 border-slate-600 p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-6">
            🔔 Alert Configuration
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {ALERT_CONFIGS.map((config) => (
              <AlertCard
                key={config.id}
                config={config}
                enabled={subscription[config.id] as boolean}
                onChange={(v) => updateField(config.id, v)}
                onPreview={() => setShowPreview(config.id)}
                isPreview={showPreview === config.id}
              />
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl border-2 border-slate-600 p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-6">
            📊 Report Schedule
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <ReportCard
              icon="🌅"
              title="Daily Summary"
              description="Every day at 7:00 AM"
              enabled={subscription.daily_summary}
              onChange={(v) => updateField('daily_summary', v)}
              preview="Fleet status: 12/15 in service, 3 maintenance alerts, 1 critical"
            />
            <ReportCard
              icon="📈"
              title="Weekly Summary"
              description="Every Monday at 8:00 AM"
              enabled={subscription.weekly_summary}
              onChange={(v) => updateField('weekly_summary', v)}
              preview="Weekly analytics: 2,450 km driven, $1,200 fuel cost, 95% DVIR compliance"
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl border-2 border-slate-600 p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-6">
            🌙 Quiet Hours
          </h2>
          <p className="text-slate-300 mb-6">
            Non-critical notifications will be silenced during these hours. Critical alerts (check engine, safety) will always come through.
          </p>
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <div className="text-sm text-slate-400 mb-2">Start Time</div>
                <select
                  value={subscription.quiet_hours_start}
                  onChange={(e) => updateField('quiet_hours_start', parseInt(e.target.value))}
                  className="px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-4xl mx-8 text-slate-600">→</div>
              <div className="text-center flex-1">
                <div className="text-sm text-slate-400 mb-2">End Time</div>
                <select
                  value={subscription.quiet_hours_end}
                  onChange={(e) => updateField('quiet_hours_end', parseInt(e.target.value))}
                  className="px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="relative h-16 bg-gradient-to-r from-slate-800 via-yellow-900/20 to-slate-800 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex">
                {Array.from({ length: 24 }, (_, i) => (
                  <div
                    key={i}
                    className={`flex-1 border-r border-slate-700 ${
                      (subscription.quiet_hours_start < subscription.quiet_hours_end &&
                        i >= subscription.quiet_hours_start &&
                        i < subscription.quiet_hours_end) ||
                      (subscription.quiet_hours_start > subscription.quiet_hours_end &&
                        (i >= subscription.quiet_hours_start || i < subscription.quiet_hours_end))
                        ? 'bg-yellow-600/40'
                        : ''
                    }`}
                  >
                    {i % 3 === 0 && (
                      <div className="text-xs text-slate-500 mt-1 ml-1">{i}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ChannelCardProps {
  icon: string
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  color: string
}

function ChannelCard({ icon, title, description, enabled, onChange, color }: ChannelCardProps) {
  return (
    <div
      className={`relative bg-gradient-to-br ${color} rounded-2xl p-6 shadow-2xl border-4 transition-all cursor-pointer transform hover:scale-105 ${
        enabled ? 'border-white' : 'border-slate-700 opacity-60'
      }`}
      onClick={() => onChange(!enabled)}
    >
      <div className="text-6xl mb-4">{icon}</div>
      <div className="text-2xl font-bold mb-2">{title}</div>
      <div className="text-sm text-white/80 mb-4">{description}</div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{enabled ? 'ACTIVE' : 'DISABLED'}</span>
        <div
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
    </div>
  )
}

interface AlertCardProps {
  config: AlertConfig
  enabled: boolean
  onChange: (enabled: boolean) => void
  onPreview: () => void
  isPreview: boolean
}

function AlertCard({ config, enabled, onChange, onPreview, isPreview }: AlertCardProps) {
  return (
    <div
      className={`bg-gradient-to-br ${config.color} rounded-xl p-6 shadow-xl border-2 transition-all ${
        enabled ? 'border-white shadow-2xl' : 'border-slate-700 opacity-50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <div className="text-xl font-bold flex items-center gap-2">
              {config.label}
              {config.badge && (
                <span className="px-2 py-0.5 bg-white text-red-600 text-xs font-bold rounded">
                  {config.badge}
                </span>
              )}
            </div>
            <div className="text-sm text-white/80">{config.description}</div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onChange(!enabled)
          }}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${
            enabled ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      {isPreview && (
        <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/20 animate-pulse">
          <div className="text-xs text-white/60 mb-1">PREVIEW</div>
          <div className="text-sm font-mono">{config.example}</div>
        </div>
      )}
      
      <button
        onClick={onPreview}
        className="mt-3 text-xs text-white/60 hover:text-white transition-colors"
      >
        {isPreview ? '◀ Hide Preview' : '▶ Show Preview'}
      </button>
    </div>
  )
}

interface ReportCardProps {
  icon: string
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  preview: string
}

function ReportCard({ icon, title, description, enabled, onChange, preview }: ReportCardProps) {
  return (
    <div
      className={`bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 shadow-xl border-2 transition-all cursor-pointer ${
        enabled ? 'border-cyan-400 shadow-2xl shadow-cyan-500/20' : 'border-slate-600 opacity-60'
      }`}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{icon}</span>
          <div>
            <div className="text-xl font-bold">{title}</div>
            <div className="text-sm text-slate-400">{description}</div>
          </div>
        </div>
        <div
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            enabled ? 'bg-cyan-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
      {enabled && (
        <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-500/30">
          <div className="text-xs text-cyan-400 mb-1">SAMPLE REPORT</div>
          <div className="text-sm text-slate-300">{preview}</div>
        </div>
      )}
    </div>
  )
}
