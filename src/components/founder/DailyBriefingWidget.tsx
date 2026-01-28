import React, { useEffect, useState } from 'react'
import { Calendar, TrendingUp, AlertCircle, MessageSquare, CheckCircle, Clock } from 'lucide-react'

interface ActionItem {
  priority: 'high' | 'medium' | 'low'
  action: string
  reason: string
  estimated_time: string
}

interface BriefingData {
  date: string
  summary: string
  sections: {
    revenue: {
      metrics: {
        payments_yesterday: number
        payments_7d: number
        active_payment_plans: number
        total_ar: number
        ar_60_plus_days: number
        ar_60_plus_percentage: number
      }
      narrative: string
    }
    denials: {
      metrics: {
        new_yesterday: number
        high_impact_pending: number
        aging_30_plus: number
      }
      narrative: string
      urgent_items: Array<{
        denial_id: number
        claim_id: number
        reason: string
        appeal_deadline?: string
      }>
    }
    agency: {
      metrics: {
        unread_messages: number
        high_priority: number
      }
      narrative: string
    }
    operations: {
      metrics: {
        sms_sent_yesterday: number
        incidents_yesterday: number
      }
      narrative: string
    }
    action_items: ActionItem[]
  }
}

const DailyBriefingWidget: React.FC = () => {
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'summary' | 'full'>('summary')

  useEffect(() => {
    fetchBriefing()
  }, [])

  const fetchBriefing = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/founder/briefing/today')
      if (response.ok) {
        const data = await response.json()
        setBriefing(data)
      }
    } catch (error) {
      console.error('Failed to fetch briefing:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-blue-500 bg-blue-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="text-red-500" size={16} />
      case 'medium': return <Clock className="text-yellow-500" size={16} />
      case 'low': return <CheckCircle className="text-blue-500" size={16} />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} />
          <h2 className="text-lg font-semibold">Daily Briefing</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!briefing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} />
          <h2 className="text-lg font-semibold">Daily Briefing</h2>
        </div>
        <p className="text-gray-500">No briefing available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">Daily Briefing</h2>
            <span className="text-sm text-gray-500">
              {new Date(briefing.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'summary' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'full' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Full Report
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'summary' && (
        <div className="p-6 space-y-6">
          {/* Executive Summary */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-gray-800 leading-relaxed">{briefing.summary}</p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-gray-600">Yesterday</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                ${briefing.sections.revenue.metrics.payments_yesterday.toLocaleString()}
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={16} className="text-purple-600" />
                <span className="text-sm text-gray-600">High-Impact</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {briefing.sections.denials.metrics.high_impact_pending}
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={16} className="text-yellow-600" />
                <span className="text-sm text-gray-600">Agency Msgs</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">
                {briefing.sections.agency.metrics.unread_messages}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-blue-600" />
                <span className="text-sm text-gray-600">Plans Active</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {briefing.sections.revenue.metrics.active_payment_plans}
              </div>
            </div>
          </div>

          {/* Action Items */}
          {briefing.sections.action_items.length > 0 && (
            <div>
              <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                <Clock size={18} />
                Today's Actions ({briefing.sections.action_items.length})
              </h3>
              <div className="space-y-2">
                {briefing.sections.action_items.map((item, index) => (
                  <div
                    key={index}
                    className={`border-l-4 p-3 rounded ${getPriorityColor(item.priority)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getPriorityIcon(item.priority)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.action}</div>
                        <div className="text-sm text-gray-600 mt-1">{item.reason}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          ⏱️ {item.estimated_time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'full' && (
        <div className="p-6 space-y-6">
          {/* Revenue Section */}
          <div>
            <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-600" />
              Revenue & Collections
            </h3>
            <p className="text-gray-700 mb-3">{briefing.sections.revenue.narrative}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">7-Day Total:</span>
                <div className="font-semibold">
                  ${briefing.sections.revenue.metrics.payments_7d.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Total A/R:</span>
                <div className="font-semibold">
                  ${briefing.sections.revenue.metrics.total_ar.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-600">60+ Days:</span>
                <div className="font-semibold">
                  {briefing.sections.revenue.metrics.ar_60_plus_percentage.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600" />
              Denials Requiring Attention
            </h3>
            <p className="text-gray-700">{briefing.sections.denials.narrative}</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600" />
              Agency Communications
            </h3>
            <p className="text-gray-700">{briefing.sections.agency.narrative}</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-semibold mb-2">Operations Snapshot</h3>
            <p className="text-gray-700">{briefing.sections.operations.narrative}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyBriefingWidget
