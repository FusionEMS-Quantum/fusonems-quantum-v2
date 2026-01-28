import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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
    if (saved) {
      setSettings(JSON.parse(saved))
    }
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-2xl">←</button>
        <h1 className="font-semibold">Settings</h1>
        <div className="w-8" />
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Notifications</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Alert Sound</label>
              <div className="flex gap-2">
                <select
                  value={settings.notificationSound}
                  onChange={(e) => updateSetting('notificationSound', e.target.value)}
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2"
                >
                  {SOUND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={testSound}
                  className="px-4 py-2 bg-blue-600 rounded-lg"
                >
                  Test
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Vibration</div>
                <div className="text-sm text-gray-400">Vibrate on new dispatch</div>
              </div>
              <button
                onClick={() => updateSetting('vibration', !settings.vibration)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.vibration ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.vibration ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Location</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Share Location</div>
              <div className="text-sm text-gray-400">Allow dispatch to see your location</div>
            </div>
            <button
              onClick={() => updateSetting('locationSharing', !settings.locationSharing)}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.locationSharing ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.locationSharing ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Account</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Unit</span>
              <span>{localStorage.getItem('unit_id') || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Version</span>
              <span>1.0.0</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-600 rounded-xl font-medium"
        >
          Log Out
        </button>
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
        <button onClick={() => navigate('/history')} className="flex flex-col items-center text-gray-400">
          <span className="text-xl">📋</span>
          <span className="text-xs">History</span>
        </button>
        <button className="flex flex-col items-center text-blue-400">
          <span className="text-xl">⚙️</span>
          <span className="text-xs">Settings</span>
        </button>
      </nav>
    </div>
  )
}
