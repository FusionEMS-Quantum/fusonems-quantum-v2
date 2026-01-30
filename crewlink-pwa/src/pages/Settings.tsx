import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

interface Settings {
  notificationSound: string
  pttDefaultChannel: string
  darkMode: boolean
  locationSharing: boolean
  autoAcknowledge: boolean
  vibration: boolean
}

const SOUND_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'tone1', label: 'Tone 1' },
  { value: 'tone2', label: 'Tone 2' },
  { value: 'alert', label: 'Alert' },
  { value: 'chime', label: 'Chime' },
]

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-12 h-6 rounded-pill transition-colors flex-shrink-0 ${
        on ? 'bg-primary' : 'bg-surface-elevated border border-border'
      }`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>({
    notificationSound: 'default',
    pttDefaultChannel: '',
    darkMode: true,
    locationSharing: true,
    autoAcknowledge: false,
    vibration: true,
  })

  useEffect(() => {
    const saved = localStorage.getItem('crewlink_settings')
    if (saved) setSettings(JSON.parse(saved))
  }, [])

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    localStorage.setItem('crewlink_settings', JSON.stringify(updated))
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('unit_id')
    localStorage.removeItem('crewlink_settings')
    navigate('/login')
  }

  const testSound = () => {
    const audio = new Audio(`/sounds/${settings.notificationSound}.mp3`)
    audio.play().catch(() => {})
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <PageHeader variant="subpage" showBack title="Settings" />
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="crewlink-card p-4 animate-slide-up">
          <h2 className="font-semibold text-white mb-4">Notifications</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted block mb-1">Alert Sound</label>
              <div className="flex gap-2">
                <select
                  value={settings.notificationSound}
                  onChange={(e) => updateSetting('notificationSound', e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-button px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {SOUND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button onClick={testSound} className="px-4 py-2 crewlink-btn-primary rounded-button">
                  Test
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Vibration</div>
                <div className="text-sm text-muted">Vibrate on new dispatch</div>
              </div>
              <Toggle on={settings.vibration} onClick={() => updateSetting('vibration', !settings.vibration)} />
            </div>
          </div>
        </div>
        <div className="crewlink-card p-4 animate-slide-up">
          <h2 className="font-semibold text-white mb-4">Location</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Share Location</div>
              <div className="text-sm text-muted">Allow dispatch to see your location</div>
            </div>
            <Toggle on={settings.locationSharing} onClick={() => updateSetting('locationSharing', !settings.locationSharing)} />
          </div>
        </div>
        <div className="crewlink-card p-4 animate-slide-up">
          <h2 className="font-semibold text-white mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Unit</span>
              <span className="text-muted-light">{localStorage.getItem('unit_id') || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Version</span>
              <span className="text-muted-light">1.0.0</span>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-card font-medium transition-colors active:scale-[0.98]">
          Log Out
        </button>
      </main>
      <BottomNav />
    </div>
  )
}
