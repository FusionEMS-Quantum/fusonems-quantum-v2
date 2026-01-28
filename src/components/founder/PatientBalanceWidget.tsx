import React, { useState } from 'react'
import { Calendar, Send, Eye, Play, AlertCircle, CheckCircle, Mail, MessageSquare } from 'lucide-react'

interface PreviewData {
  day: number
  template: {
    sms: string
    email_subject: string
    email_body: string
  }
  balances_count: number
  balances_preview: Array<{
    patient_id: number
    first_name: string
    balance: string
    days_outstanding: number
  }>
}

interface RunResult {
  day_15: { total_balances: number; sms_sent: number; email_sent: number }
  day_30: { total_balances: number; sms_sent: number; email_sent: number }
  day_45: { total_balances: number; sms_sent: number; email_sent: number }
  day_60: { total_balances: number; sms_sent: number; email_sent: number }
}

const PatientBalanceWidget: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<15 | 30 | 45 | 60>(15)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const fetchPreview = async (day: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/founder/patient-balance/preview-messages/${day}`)
      if (response.ok) {
        const data = await response.json()
        setPreview(data)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Failed to fetch preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessages = async (day: number, dryRun: boolean = false) => {
    if (!confirm(`${dryRun ? 'Preview' : 'Send'} messages for Day ${day}?`)) return

    try {
      setLoading(true)
      const response = await fetch(`/api/founder/patient-balance/send-day-messages/${day}?dry_run=${dryRun}`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${dryRun ? 'Preview' : 'Sent'}: ${data.sms_sent} SMS, ${data.email_sent} emails`)
      }
    } catch (error) {
      console.error('Failed to send messages:', error)
      alert('Failed to send messages')
    } finally {
      setLoading(false)
    }
  }

  const runDailyAutomation = async (dryRun: boolean = false) => {
    if (!confirm(`${dryRun ? 'Preview' : 'Run'} daily automation for ALL thresholds?`)) return

    try {
      setLoading(true)
      const response = await fetch(`/api/founder/patient-balance/run-daily-automation?dry_run=${dryRun}`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setRunResult(data)
        const total = 
          data.day_15.sms_sent + data.day_15.email_sent +
          data.day_30.sms_sent + data.day_30.email_sent +
          data.day_45.sms_sent + data.day_45.email_sent +
          data.day_60.sms_sent + data.day_60.email_sent
        alert(`✅ Daily automation ${dryRun ? 'preview' : 'complete'}: ${total} total messages`)
      }
    } catch (error) {
      console.error('Failed to run automation:', error)
      alert('Failed to run automation')
    } finally {
      setLoading(false)
    }
  }

  const getDayColor = (day: number) => {
    switch (day) {
      case 15: return 'border-blue-500 bg-blue-50'
      case 30: return 'border-yellow-500 bg-yellow-50'
      case 45: return 'border-orange-500 bg-orange-50'
      case 60: return 'border-red-500 bg-red-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const getDayTone = (day: number) => {
    switch (day) {
      case 15: return '🟦 Gentle reminder'
      case 30: return '🟨 Follow-up'
      case 45: return '🟧 Urgent'
      case 60: return '🟥 Final notice'
      default: return ''
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-green-600" />
            <h2 className="text-lg font-semibold">Patient Balance Automation</h2>
          </div>
          <button
            onClick={() => runDailyAutomation(false)}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Play size={16} />
            Run Daily Automation
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          ⚠️ LOCKED templates - Days 15/30/45/60 messaging (Founder approval required to modify)
        </p>
      </div>

      <div className="p-6">
        {/* Day Selector */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[15, 30, 45, 60].map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day as 15 | 30 | 45 | 60)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedDay === day 
                  ? getDayColor(day) + ' border-opacity-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl font-bold">Day {day}</div>
              <div className="text-sm mt-1">{getDayTone(day)}</div>
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => fetchPreview(selectedDay)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            Preview Messages
          </button>
          <button
            onClick={() => sendMessages(selectedDay, true)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <AlertCircle size={16} />
            Dry Run
          </button>
          <button
            onClick={() => sendMessages(selectedDay, false)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <Send size={16} />
            Send Now
          </button>
        </div>

        {/* Preview Section */}
        {showPreview && preview && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Day {preview.day} Preview</h3>
                <span className="text-sm text-gray-600">
                  {preview.balances_count} patient{preview.balances_count !== 1 ? 's' : ''} will receive this
                </span>
              </div>

              {/* SMS Template */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-blue-600" />
                  <span className="font-medium text-sm">SMS Message:</span>
                </div>
                <div className="bg-white p-3 rounded border text-sm">
                  {preview.template.sms}
                </div>
              </div>

              {/* Email Template */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={16} className="text-green-600" />
                  <span className="font-medium text-sm">Email:</span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="font-semibold text-sm mb-2">{preview.template.email_subject}</div>
                  <div className="text-xs text-gray-600 whitespace-pre-line">
                    {preview.template.email_body.substring(0, 300)}...
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Recipients */}
            {preview.balances_preview.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Sample Recipients (first 5):</h4>
                <div className="space-y-2">
                  {preview.balances_preview.map((patient, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{patient.first_name}</span>
                        <span className="text-gray-600 ml-2">
                          ({patient.days_outstanding} days overdue)
                        </span>
                      </div>
                      <div className="font-semibold">${patient.balance}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium">LOCKED Messaging Template</div>
                  <div className="text-gray-700 mt-1">
                    These messages are locked per AI Build Specification. Supportive tone required - no threatening language. Founder approval required to modify.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Run Result */}
        {runResult && (
          <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={20} className="text-green-600" />
              <h3 className="font-semibold">Automation Complete</h3>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              {[15, 30, 45, 60].map((day) => {
                const dayKey = `day_${day}` as keyof RunResult
                const data = runResult[dayKey]
                return (
                  <div key={day} className="bg-white p-3 rounded">
                    <div className="font-medium mb-1">Day {day}</div>
                    <div className="text-gray-600">
                      {data.sms_sent} SMS, {data.email_sent} emails
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientBalanceWidget
