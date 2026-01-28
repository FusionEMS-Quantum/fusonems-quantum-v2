import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

interface CannedMessage {
  id: string
  category: 'status' | 'scene' | 'patient' | 'equipment'
  text: string
  icon: string
  priority: 'normal' | 'urgent' | 'critical'
}

const CANNED_MESSAGES: CannedMessage[] = [
  // Status
  { id: 'eta_delayed', category: 'status', text: 'ETA delayed - traffic', icon: '⏱️', priority: 'normal' },
  { id: 'returning', category: 'status', text: 'Returning to service', icon: '✓', priority: 'normal' },
  { id: 'need_directions', category: 'status', text: 'Need directions to location', icon: '❓', priority: 'normal' },
  
  // Scene Safety
  { id: 'scene_unsafe', category: 'scene', text: 'Scene not safe - requesting PD', icon: '⚠️', priority: 'critical' },
  { id: 'scene_secure', category: 'scene', text: 'Scene secure - proceeding', icon: '✓', priority: 'normal' },
  { id: 'additional_resources', category: 'scene', text: 'Need additional resources', icon: '🚨', priority: 'urgent' },
  { id: 'mva_extrication', category: 'scene', text: 'MVA - extrication required', icon: '🚒', priority: 'urgent' },
  
  // Patient Status
  { id: 'patient_refusal', category: 'patient', text: 'Patient refusal - RMA', icon: '❌', priority: 'normal' },
  { id: 'patient_critical', category: 'patient', text: 'Critical patient - expedite', icon: '🚨', priority: 'critical' },
  { id: 'no_patient_found', category: 'patient', text: 'No patient found on scene', icon: '❓', priority: 'normal' },
  { id: 'multiple_patients', category: 'patient', text: 'Multiple patients - need backup', icon: '👥', priority: 'urgent' },
  
  // Equipment
  { id: 'equipment_issue', category: 'equipment', text: 'Equipment malfunction', icon: '🔧', priority: 'urgent' },
  { id: 'low_fuel', category: 'equipment', text: 'Low fuel - need to refuel', icon: '⛽', priority: 'normal' },
  { id: 'vehicle_issue', category: 'equipment', text: 'Vehicle issue - need swap', icon: '🚑', priority: 'urgent' },
]

export default function DispatchMessages() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [sending, setSending] = useState(false)
  const unitId = localStorage.getItem('unit_id')

  const categories = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'status', label: 'Status', icon: '⏱️' },
    { key: 'scene', label: 'Scene', icon: '⚠️' },
    { key: 'patient', label: 'Patient', icon: '👤' },
    { key: 'equipment', label: 'Equipment', icon: '🔧' },
  ]

  const filteredMessages = selectedCategory === 'all'
    ? CANNED_MESSAGES
    : CANNED_MESSAGES.filter(m => m.category === selectedCategory)

  const sendMessage = async (message: CannedMessage) => {
    if (sending) return
    
    setSending(true)
    try {
      await api.post('/cad/dispatch-message', {
        unit_id: unitId,
        message_id: message.id,
        message_text: message.text,
        priority: message.priority,
        notes: additionalNotes || null,
      })
      
      // Clear notes after sending
      setAdditionalNotes('')
      
      // Show confirmation
      alert(`✓ Message sent to dispatch:\n"${message.text}"`)
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again or use radio.')
    } finally {
      setSending(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-900/20'
      case 'urgent': return 'border-orange-500 bg-orange-900/20'
      default: return 'border-gray-700 bg-gray-800/50'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-xl border-b border-gray-800 shadow-2xl sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/queue')} 
                className="text-3xl hover:text-blue-400 transition-colors p-2"
              >
                ⬅
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  DISPATCH MESSAGES
                </h1>
                <p className="text-sm text-gray-500 font-mono">QUICK STATUS UPDATES</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400 font-mono">{unitId || 'NO UNIT'}</div>
              <div className="text-xs text-gray-500">Operational Only</div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="grid grid-cols-5 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50 scale-105'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="bg-blue-900/30 border-t border-blue-700/50 px-6 py-3 text-sm flex items-center gap-3">
          <span className="text-blue-400 text-lg">ℹ️</span>
          <span className="text-blue-200">
            <span className="font-bold">CANNED MESSAGES:</span> Pre-defined operational updates to dispatch. 
            For urgent communication, use <span className="font-bold underline">radio</span>.
          </span>
        </div>
      </header>

      {/* Additional Notes */}
      <div className="sticky top-[180px] z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4">
        <label className="block text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">
          Optional Notes (sent with message)
        </label>
        <input
          type="text"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Add context (optional)..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          maxLength={200}
        />
        <p className="text-xs text-gray-500 mt-2">
          {additionalNotes.length}/200 characters
        </p>
      </div>

      {/* Message Grid */}
      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto">
          {filteredMessages.map((message) => (
            <button
              key={message.id}
              onClick={() => sendMessage(message)}
              disabled={sending}
              className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 transition-all hover:scale-[1.02] text-left disabled:opacity-50 disabled:cursor-not-allowed ${getPriorityColor(message.priority)}`}
            >
              {/* Priority Indicator */}
              {message.priority !== 'normal' && (
                <div className="absolute -top-3 right-6">
                  <span className={`${
                    message.priority === 'critical' ? 'bg-red-600 animate-pulse' : 'bg-orange-600'
                  } text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg`}>
                    {message.priority}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="text-6xl">
                  {message.icon}
                </div>

                {/* Message Text */}
                <div className="flex-1">
                  <div className="text-2xl font-bold text-white mb-1">
                    {message.text}
                  </div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">
                    {message.category}
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-3xl text-gray-600">
                  →
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-2xl">No messages in this category</div>
          </div>
        )}
      </main>
    </div>
  )
}
