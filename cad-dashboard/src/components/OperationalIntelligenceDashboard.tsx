import { useEffect, useState } from 'react'
import { TrendingUp, AlertTriangle, Users, Activity, RefreshCw, Clock, AlertCircle } from 'lucide-react'

interface ForecastData {
  forecast_for: string
  predicted_volume: number
  baseline_volume: number
  surge_probability: number
  confidence: string
  confidence_band: {
    lower: number
    upper: number
  }
  explanation: string
}

interface CoverageRisk {
  risk_level: string
  available_units: number
  required_minimum: number
  last_available_unit: string | null
  units_returning_soon: number
  estimated_gap_minutes: number | null
  active_incidents: number
  confidence: string
  explanation: string
}

interface OperationalIntelligence {
  forecasts: {
    next_hour: ForecastData
    next_4_hours: ForecastData
  }
  coverage_risk: CoverageRisk
  timestamp: string
}

interface OperationalIntelligenceDashboardProps {
  organizationId: string
  zoneId?: string
  refreshInterval?: number
}

export default function OperationalIntelligenceDashboard({
  organizationId,
  zoneId,
  refreshInterval = 60000
}: OperationalIntelligenceDashboardProps) {
  const [data, setData] = useState<OperationalIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIntelligence = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/intelligence/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          zone_id: zoneId
        })
      })

      if (!response.ok) throw new Error('Failed to fetch intelligence')
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntelligence()
    const interval = setInterval(fetchIntelligence, refreshInterval)
    return () => clearInterval(interval)
  }, [organizationId, zoneId, refreshInterval])

  if (loading && !data) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 text-orange-500 animate-spin" />
          <span className="text-gray-400">Loading operational intelligence...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-red-900/50 p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-400">{error}</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const riskColor = {
    SAFE: 'text-green-500',
    MODERATE: 'text-yellow-500',
    CRITICAL: 'text-red-500',
    LAST_UNIT: 'text-red-600'
  }[data.coverage_risk.risk_level] || 'text-gray-400'

  const riskBg = {
    SAFE: 'bg-green-500/10 border-green-500/30',
    MODERATE: 'bg-yellow-500/10 border-yellow-500/30',
    CRITICAL: 'bg-red-500/10 border-red-500/30',
    LAST_UNIT: 'bg-red-600/10 border-red-600/30'
  }[data.coverage_risk.risk_level] || 'bg-zinc-800 border-zinc-700'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Operational Intelligence</h2>
        <button
          onClick={fetchIntelligence}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className={`rounded-lg border p-4 ${riskBg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <AlertTriangle className={`h-6 w-6 ${riskColor}`} />
            <div>
              <h3 className="text-lg font-semibold text-white">Coverage Risk</h3>
              <p className={`text-sm font-medium ${riskColor}`}>{data.coverage_risk.risk_level}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{data.coverage_risk.available_units}</div>
            <div className="text-xs text-gray-400">available units</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-black/30 rounded p-2">
            <div className="text-xs text-gray-400">Required Min</div>
            <div className="text-lg font-semibold text-white">{data.coverage_risk.required_minimum}</div>
          </div>
          <div className="bg-black/30 rounded p-2">
            <div className="text-xs text-gray-400">Active Calls</div>
            <div className="text-lg font-semibold text-white">{data.coverage_risk.active_incidents}</div>
          </div>
          <div className="bg-black/30 rounded p-2">
            <div className="text-xs text-gray-400">Returning Soon</div>
            <div className="text-lg font-semibold text-white">{data.coverage_risk.units_returning_soon}</div>
          </div>
        </div>

        <div className="bg-black/30 rounded p-3">
          <p className="text-sm text-gray-300">{data.coverage_risk.explanation}</p>
          {data.coverage_risk.last_available_unit && (
            <p className="text-xs text-red-400 mt-2">⚠️ Last available unit: {data.coverage_risk.last_available_unit}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ForecastCard
          title="Next Hour"
          forecast={data.forecasts.next_hour}
        />
        <ForecastCard
          title="Next 4 Hours"
          forecast={data.forecasts.next_4_hours}
        />
      </div>

      <div className="text-xs text-gray-500 text-center">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        <span className="mx-2">•</span>
        <span className="text-gray-400">Advisory only — never alters dispatch</span>
      </div>
    </div>
  )
}

function ForecastCard({ title, forecast }: { title: string; forecast: ForecastData }) {
  const surgeColor = forecast.surge_probability >= 0.7 ? 'text-red-500' : 
                     forecast.surge_probability >= 0.4 ? 'text-yellow-500' : 
                     'text-green-500'

  const confidenceColor = {
    HIGH: 'text-green-500',
    MEDIUM: 'text-yellow-500',
    LOW: 'text-orange-500',
    VERY_LOW: 'text-red-500'
  }[forecast.confidence] || 'text-gray-400'

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          <h4 className="font-semibold text-white">{title}</h4>
        </div>
        <span className={`text-xs font-medium ${confidenceColor}`}>
          {forecast.confidence}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-white">{forecast.predicted_volume.toFixed(1)}</span>
          <span className="text-sm text-gray-400">calls predicted</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Baseline: {forecast.baseline_volume.toFixed(1)} calls
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">Confidence Band</span>
          <span className="text-gray-500">
            {forecast.confidence_band.lower.toFixed(1)} - {forecast.confidence_band.upper.toFixed(1)}
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2 relative">
          <div
            className="absolute bg-orange-500/30 h-2 rounded-full"
            style={{
              left: `${(forecast.confidence_band.lower / forecast.confidence_band.upper) * 100}%`,
              width: `${((forecast.confidence_band.upper - forecast.confidence_band.lower) / forecast.confidence_band.upper) * 100}%`
            }}
          />
          <div
            className="absolute bg-orange-500 h-2 w-1 rounded-full"
            style={{
              left: `${(forecast.predicted_volume / forecast.confidence_band.upper) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="bg-zinc-800 rounded p-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Surge Probability</span>
          <span className={`text-sm font-semibold ${surgeColor}`}>
            {(forecast.surge_probability * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="bg-zinc-800 rounded p-2">
        <p className="text-xs text-gray-300">{forecast.explanation}</p>
      </div>
    </div>
  )
}
