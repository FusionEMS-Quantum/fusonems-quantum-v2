import type { Recommendation } from '../types'

interface AIRecommendationsProps {
  recommendations: Recommendation[]
  onAssign: (unitId: string) => void
}

export default function AIRecommendations({ recommendations, onAssign }: AIRecommendationsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400'
    if (score >= 0.6) return 'text-yellow-400'
    return 'text-orange-400'
  }

  return (
    <div className="bg-dark-lighter rounded-lg shadow-xl p-8">
      <h1 className="text-3xl font-bold text-primary mb-6">AI Unit Recommendations</h1>
      
      {recommendations.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No available units found</p>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div 
              key={rec.unit.id} 
              className={`bg-dark p-6 rounded-lg ${idx === 0 ? 'border-2 border-green-500' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-white">{rec.unit.name}</h3>
                    {idx === 0 && (
                      <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                        BEST MATCH
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400">{rec.unit.type}</p>
                </div>
                <div className="text-right">
                  <p className={`text-4xl font-bold ${getScoreColor(rec.score)}`}>
                    {(rec.score * 100).toFixed(0)}%
                  </p>
                  <p className="text-gray-400 text-sm">Match Score</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-dark-lighter p-3 rounded">
                  <p className="text-gray-400 text-sm">Distance</p>
                  <p className="text-white font-bold">{rec.distance_miles.toFixed(1)} mi</p>
                  <p className="text-primary text-xs">{(rec.score_breakdown.distance_score * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-dark-lighter p-3 rounded">
                  <p className="text-gray-400 text-sm">ETA</p>
                  <p className="text-white font-bold">{rec.eta_minutes} min</p>
                </div>
                <div className="bg-dark-lighter p-3 rounded">
                  <p className="text-gray-400 text-sm">Qualifications</p>
                  <p className="text-primary text-xs font-bold">{(rec.score_breakdown.qualification_score * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-dark-lighter p-3 rounded">
                  <p className="text-gray-400 text-sm">Performance</p>
                  <p className="text-primary text-xs font-bold">{(rec.score_breakdown.performance_score * 100).toFixed(0)}%</p>
                </div>
              </div>

              {rec.unit.capabilities.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">Capabilities:</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.unit.capabilities.map((cap, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/20 text-primary rounded text-sm">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => onAssign(rec.unit.id)}
                className={`w-full py-3 px-6 rounded-lg font-bold transition-colors ${
                  idx === 0 
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-primary hover:bg-orange-600 text-white'
                }`}
              >
                Assign {rec.unit.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
