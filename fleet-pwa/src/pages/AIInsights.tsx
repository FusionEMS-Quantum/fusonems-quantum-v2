import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface AIInsight {
  id: number
  vehicle_id: number | null
  insight_type: string
  priority: string
  title: string
  description: string
  estimated_savings: number | null
  confidence: number
  action_required: string
  action_deadline: string | null
  status: string
  created_at: string
  payload: any
}

const priorityColors = {
  critical: { bg: 'bg-red-900/30', border: 'border-red-500', text: 'text-red-400', icon: '🚨' },
  high: { bg: 'bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-400', icon: '⚠️' },
  medium: { bg: 'bg-yellow-900/30', border: 'border-yellow-500', text: 'text-yellow-400', icon: '💡' },
  low: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-400', icon: 'ℹ️' },
}

const typeIcons = {
  predictive: '🔮',
  optimization: '🎯',
  cost_saving: '💰',
  safety: '🛡️',
  fuel: '⛽',
}

export default function AIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [filter, setFilter] = useState<string>('all')
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [insightsData, statsData] = await Promise.all([
        fetch('/api/fleet/ai/insights').then(r => r.json()),
        fetch('/api/fleet/ai/insights/stats').then(r => r.json()),
      ])
      setInsights(insightsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
    } finally {
      setLoading(false)
    }
  }

  async function dismissInsight(insightId: number) {
    try {
      await fetch(`/api/fleet/ai/insights/${insightId}/dismiss`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      setInsights(insights.filter(i => i.id !== insightId))
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
    }
  }

  async function generateInsights() {
    setLoading(true)
    try {
      await fetch('/api/fleet/ai/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to generate insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInsights = insights.filter(i => {
    if (filter === 'all') return true
    if (filter === 'critical_high') return i.priority === 'critical' || i.priority === 'high'
    return i.priority === filter
  })

  const groupedInsights = {
    critical: filteredInsights.filter(i => i.priority === 'critical'),
    high: filteredInsights.filter(i => i.priority === 'high'),
    medium: filteredInsights.filter(i => i.priority === 'medium'),
    low: filteredInsights.filter(i => i.priority === 'low'),
  }

  if (loading && !insights.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-2xl font-bold text-blue-400 animate-pulse">Loading AI Insights...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-colors">
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🤖 AI Fleet Insights
            </h1>
            <p className="text-slate-400 text-sm mt-1">Predictive analytics & optimization recommendations</p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : '🔄 Refresh Analysis'}
        </button>
      </header>

      {stats && (
        <div className="grid grid-cols-4 gap-4 px-6 py-4">
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg border-2 border-purple-500 p-4 shadow-xl">
            <div className="text-4xl mb-2">🤖</div>
            <div className="text-3xl font-bold">{stats.total_active_insights}</div>
            <div className="text-sm text-white/80">Active Insights</div>
          </div>
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg border-2 border-red-500 p-4 shadow-xl">
            <div className="text-4xl mb-2">🚨</div>
            <div className="text-3xl font-bold">{stats.critical_priority}</div>
            <div className="text-sm text-white/80">Critical Priority</div>
          </div>
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg border-2 border-orange-500 p-4 shadow-xl">
            <div className="text-4xl mb-2">⚠️</div>
            <div className="text-3xl font-bold">{stats.high_priority}</div>
            <div className="text-sm text-white/80">High Priority</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg border-2 border-green-500 p-4 shadow-xl">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-3xl font-bold">${stats.potential_annual_savings.toLocaleString()}</div>
            <div className="text-sm text-white/80">Potential Savings/Year</div>
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        <div className="flex gap-2 mb-4">
          {['all', 'critical_high', 'critical', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'All' : f === 'critical_high' ? 'Critical + High' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {['critical', 'high', 'medium', 'low'].map(priority => {
          const group = groupedInsights[priority as keyof typeof groupedInsights]
          if (group.length === 0) return null

          const colors = priorityColors[priority as keyof typeof priorityColors]

          return (
            <div key={priority} className="mb-6">
              <h2 className={`text-2xl font-bold ${colors.text} mb-3 flex items-center gap-2`}>
                {colors.icon} {priority.toUpperCase()} PRIORITY ({group.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {group.map(insight => (
                  <div
                    key={insight.id}
                    className={`${colors.bg} border-l-4 ${colors.border} rounded-lg p-4 shadow-lg`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{typeIcons[insight.insight_type as keyof typeof typeIcons] || '📊'}</span>
                        <div>
                          <div className={`font-bold text-lg ${colors.text}`}>{insight.title}</div>
                          <div className="text-sm text-slate-300 mt-1">{insight.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => dismissInsight(insight.id)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                      {insight.confidence > 0 && (
                        <div>
                          <span className="text-slate-400">Confidence:</span>{' '}
                          <span className="text-white font-bold">{insight.confidence}%</span>
                        </div>
                      )}
                      {insight.estimated_savings && (
                        <div>
                          <span className="text-slate-400">Est. Savings:</span>{' '}
                          <span className="text-green-400 font-bold">${insight.estimated_savings.toLocaleString()}/year</span>
                        </div>
                      )}
                      {insight.action_deadline && (
                        <div>
                          <span className="text-slate-400">Deadline:</span>{' '}
                          <span className="text-white font-bold">
                            {new Date(insight.action_deadline).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400">Created:</span>{' '}
                        <span className="text-white font-mono text-xs">
                          {new Date(insight.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {insight.action_required && (
                      <div className="mt-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                        <div className="text-xs text-slate-400 mb-1">ACTION REQUIRED:</div>
                        <div className="text-white font-medium">{insight.action_required}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredInsights.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <div className="text-2xl font-bold text-slate-400">No insights found</div>
            <div className="text-slate-500 mt-2">All systems operating optimally</div>
          </div>
        )}
      </div>
    </div>
  )
}
