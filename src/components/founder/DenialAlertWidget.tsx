import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, FileText, ThumbsUp, ThumbsDown, DollarSign } from 'lucide-react'

interface DenialItem {
  id: number
  claim_id: number
  reason: string
  appeal_deadline?: string
  is_high_impact: boolean
  severity?: string
  priority?: string
  requires_founder_review: boolean
}

const DenialAlertWidget: React.FC = () => {
  const [highImpactDenials, setHighImpactDenials] = useState<DenialItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDenial, setSelectedDenial] = useState<DenialItem | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchHighImpactDenials()
  }, [])

  const fetchHighImpactDenials = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/founder/denials/high-impact')
      if (response.ok) {
        const data = await response.json()
        setHighImpactDenials(data.high_impact_denials || [])
      }
    } catch (error) {
      console.error('Failed to fetch denials:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveDenial = async (denialId: number) => {
    if (!confirm('Approve appeal for this denial?')) return

    try {
      const response = await fetch(`/api/founder/denials/${denialId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })

      if (response.ok) {
        alert('✅ Appeal approved - will proceed to submission')
        fetchHighImpactDenials()
        setSelectedDenial(null)
        setNotes('')
      }
    } catch (error) {
      console.error('Failed to approve:', error)
      alert('Failed to approve appeal')
    }
  }

  const rejectDenial = async (denialId: number) => {
    const reason = prompt('Reason for rejecting appeal:')
    if (!reason) return

    try {
      const response = await fetch(`/api/founder/denials/${denialId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        alert('✅ Appeal rejected - marked for alternative action')
        fetchHighImpactDenials()
        setSelectedDenial(null)
      }
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('Failed to reject appeal')
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800'
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800'
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      default: return 'bg-gray-100 border-gray-500 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-red-600" />
          <h2 className="text-lg font-semibold">High-Impact Denials</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" />
            <h2 className="text-lg font-semibold">High-Impact Denials</h2>
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              {highImpactDenials.length}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          🔒 Denials &gt;$1,000 require founder approval
        </p>
      </div>

      <div className="p-6">
        {highImpactDenials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
            <p className="font-medium">No high-impact denials pending review</p>
            <p className="text-sm mt-1">All clear! 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {highImpactDenials.map((denial) => (
              <div
                key={denial.id}
                className={`border-2 rounded-lg p-4 ${
                  selectedDenial?.id === denial.id ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(denial.severity)}`}>
                        {denial.severity?.toUpperCase() || 'HIGH-IMPACT'}
                      </span>
                      {denial.requires_founder_review && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          FOUNDER REVIEW REQUIRED
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Claim:</span> #{denial.claim_id}
                    </div>
                    <div className="text-sm mb-1">
                      <span className="font-medium">Reason:</span> {denial.reason}
                    </div>
                    {denial.appeal_deadline && (
                      <div className="flex items-center gap-1 text-sm text-orange-600">
                        <Clock size={14} />
                        <span>Appeal deadline: {new Date(denial.appeal_deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <DollarSign size={24} className="text-red-600" />
                </div>

                {selectedDenial?.id === denial.id ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Founder Notes:</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes for this decision..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => approveDenial(denial.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <ThumbsUp size={16} />
                        Approve Appeal
                      </button>
                      <button
                        onClick={() => rejectDenial(denial.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <ThumbsDown size={16} />
                        Reject (Write-off)
                      </button>
                      <button
                        onClick={() => setSelectedDenial(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 text-sm">
                      <div className="font-medium text-yellow-900 mb-1">Policy Reminder:</div>
                      <ul className="text-yellow-800 space-y-1 ml-4 list-disc text-xs">
                        <li>All denials &gt;$1,000 require founder approval</li>
                        <li>Approval = proceed with appeal preparation and submission</li>
                        <li>Rejection = consider write-off or alternative resolution</li>
                        <li>All decisions are audit-logged with timestamp and rationale</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedDenial(denial)}
                    className="w-full mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <FileText size={16} />
                    Review & Decide
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DenialAlertWidget
