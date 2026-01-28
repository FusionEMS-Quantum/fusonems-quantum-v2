import { useEffect, useState } from 'react'
import { X, TrendingUp, Clock, Battery, AlertCircle, Users, DollarSign, ChevronDown, RefreshCw } from 'lucide-react'

interface UnitScore {
  unit_id: string
  unit_name: string
  unit_type: string
  eta_minutes: number
  eta_score: number
  availability_score: number
  capability_score: number
  fatigue_score: number
  coverage_score: number
  cost_score: number
  total_score: number
  explanation: string
}

interface RecommendationResponse {
  run_id: string
  recommendations: UnitScore[]
  all_candidates: UnitScore[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  weights_used: {
    eta: number
    availability: number
    capability: number
    fatigue: number
    coverage: number
    cost: number
  }
}

interface UnitRecommendationsProps {
  callId: string
  callType: '911' | 'IFT' | 'HEMS'
  sceneLat: number
  sceneLon: number
  requiredCapabilities: string[]
  patientAcuity?: string
  destinationLat?: number
  destinationLon?: number
  organizationId?: string
  onDispatch: (unitId: string) => void
  onAddBackup: (unitId: string) => void
}

export default function UnitRecommendations({
  callId,
  callType,
  sceneLat,
  sceneLon,
  requiredCapabilities,
  patientAcuity,
  destinationLat,
  destinationLon,
  organizationId,
  onDispatch,
  onAddBackup
}: UnitRecommendationsProps) {
  const [data, setData] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [explainDrawerOpen, setExplainDrawerOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<UnitScore | null>(null)
  const [showAllCandidates, setShowAllCandidates] = useState(false)

  const fetchRecommendations = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/recommendations/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: callId,
          call_type: callType === '911' ? 'EMERGENCY_911' : callType,
          scene_lat: sceneLat,
          scene_lon: sceneLon,
          required_capabilities: requiredCapabilities,
          patient_acuity: patientAcuity,
          transport_destination_lat: destinationLat,
          transport_destination_lon: destinationLon,
          organization_id: organizationId,
          top_n: 3
        })
      })

      if (!response.ok) throw new Error('Failed to fetch recommendations')
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
    const interval = setInterval(fetchRecommendations, 30000)
    return () => clearInterval(interval)
  }, [callId, sceneLat, sceneLon])

  const handleExplain = (unit: UnitScore) => {
    setSelectedUnit(unit)
    setExplainDrawerOpen(true)
  }

  const handleDispatch = async (unitId: string) => {
    if (!data) return
    
    await fetch('/api/recommendations/log-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_id: data.run_id,
        action: 'ACCEPTED',
        selected_unit_id: unitId,
        dispatcher_user_id: 'current-user-id'
      })
    })
    
    onDispatch(unitId)
  }

  if (loading && !data) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 text-orange-500 animate-spin" />
          <span className="text-gray-400">Calculating recommendations...</span>
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

  if (!data || data.recommendations.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <p className="text-gray-400">No eligible units available</p>
      </div>
    )
  }

  const confidenceColor = {
    HIGH: 'text-green-500',
    MEDIUM: 'text-yellow-500',
    LOW: 'text-red-500'
  }[data.confidence]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">Recommended Units</h3>
          <span className={`text-sm ${confidenceColor}`}>
            {data.confidence} confidence
          </span>
        </div>
        <button
          onClick={fetchRecommendations}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {data.recommendations.map((unit, idx) => (
          <div
            key={unit.unit_id}
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 hover:border-orange-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-gray-400'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{unit.unit_name}</h4>
                  <p className="text-sm text-gray-400">{unit.unit_type}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-500">{unit.eta_minutes.toFixed(0)}</div>
                <div className="text-xs text-gray-400">min ETA</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">ETA</div>
                  <div className="text-sm text-white">{(unit.eta_score * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Battery className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Fatigue</div>
                  <div className="text-sm text-white">{(unit.fatigue_score * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Capability</div>
                  <div className="text-sm text-white">{(unit.capability_score * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-3">
              <div className="flex-1 bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                  style={{ width: `${unit.total_score * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-white">{(unit.total_score * 100).toFixed(0)}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDispatch(unit.unit_id)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Dispatch
              </button>
              <button
                onClick={() => onAddBackup(unit.unit_id)}
                className="px-4 py-2 border border-zinc-700 text-gray-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Add Backup
              </button>
              <button
                onClick={() => handleExplain(unit)}
                className="px-4 py-2 border border-zinc-700 text-gray-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Explain
              </button>
            </div>
          </div>
        ))}
      </div>

      {data.all_candidates.length > 3 && (
        <button
          onClick={() => setShowAllCandidates(!showAllCandidates)}
          className="w-full py-2 border border-zinc-700 text-gray-300 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center space-x-2"
        >
          <span>{showAllCandidates ? 'Hide' : 'Show'} {data.all_candidates.length - 3} more candidates</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showAllCandidates ? 'rotate-180' : ''}`} />
        </button>
      )}

      {showAllCandidates && (
        <div className="space-y-2">
          {data.all_candidates.slice(3).map((unit) => (
            <div
              key={unit.unit_id}
              className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">{unit.unit_name}</span>
                  <span className="text-gray-400 ml-2">{unit.unit_type}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">ETA: {unit.eta_minutes.toFixed(0)}m</span>
                  <span className="text-white font-semibold">{(unit.total_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {explainDrawerOpen && selectedUnit && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Score Breakdown: {selectedUnit.unit_name}</h3>
              <button onClick={() => setExplainDrawerOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ScoreItem label="ETA Score" value={selectedUnit.eta_score} weight={data.weights_used.eta} />
                <ScoreItem label="Availability" value={selectedUnit.availability_score} weight={data.weights_used.availability} />
                <ScoreItem label="Capability" value={selectedUnit.capability_score} weight={data.weights_used.capability} />
                <ScoreItem label="Fatigue" value={selectedUnit.fatigue_score} weight={data.weights_used.fatigue} />
                <ScoreItem label="Coverage" value={selectedUnit.coverage_score} weight={data.weights_used.coverage} />
                <ScoreItem label="Cost" value={selectedUnit.cost_score} weight={data.weights_used.cost} />
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-white font-semibold">Total Score</span>
                  <span className="text-orange-500 font-bold">{(selectedUnit.total_score * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-sm text-gray-300">{selectedUnit.explanation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreItem({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-baseline space-x-2">
        <span className="text-xl font-bold text-white">{(value * 100).toFixed(0)}%</span>
        <span className="text-xs text-gray-500">× {(weight * 100).toFixed(0)}%</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        = {(value * weight * 100).toFixed(1)} points
      </div>
    </div>
  )
}
