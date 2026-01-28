"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  Brain, TrendingUp, MapPin, AlertTriangle, Flame, Home,
  Activity, BarChart3, Calendar, Target, Zap, Shield
} from "lucide-react";

type RiskArea = {
  id: number;
  area_name: string;
  risk_score: number;
  population_density: number;
  high_risk_properties: number;
  recent_incidents: number;
  vulnerability_factors: string[];
  recommended_actions: string[];
};

type SeasonalTrend = {
  month: string;
  incidents: number;
  risk_level: number;
};

export default function AIRiskAssessment() {
  const [riskAreas, setRiskAreas] = useState<RiskArea[]>([]);
  const [trends, setTrends] = useState<SeasonalTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRiskData();
  }, []);

  const loadRiskData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ risk_areas: RiskArea[]; seasonal_trends: SeasonalTrend[] }>("/fire/rms/ai-risk");
      setRiskAreas(data.risk_areas || []);
      setTrends(data.seasonal_trends || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskConfig = (score: number) => {
    if (score >= 8) return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "Critical", gradient: "from-red-600 to-rose-600" };
    if (score >= 6) return { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "High", gradient: "from-orange-600 to-red-600" };
    if (score >= 4) return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Moderate", gradient: "from-amber-600 to-orange-600" };
    return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", label: "Low", gradient: "from-green-600 to-emerald-600" };
  };

  const avgRiskScore = riskAreas.length > 0 ? (riskAreas.reduce((sum, r) => sum + r.risk_score, 0) / riskAreas.length).toFixed(1) : 0;
  const totalHighRisk = riskAreas.reduce((sum, r) => sum + r.high_risk_properties, 0);
  const criticalAreas = riskAreas.filter(r => r.risk_score >= 8).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="relative px-6 py-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Risk Assessment</h1>
                <p className="text-gray-400 text-sm">Predictive fire risk analysis & resource optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-xl">
              <Zap className="w-5 h-5 text-pink-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">AI Powered</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Avg Risk Score", value: avgRiskScore, icon: Brain, gradient: "from-pink-600 to-purple-600" },
            { label: "Critical Areas", value: criticalAreas, icon: AlertTriangle, gradient: "from-red-600 to-rose-600" },
            { label: "High-Risk Properties", value: totalHighRisk, icon: Home, gradient: "from-orange-600 to-red-600" },
            { label: "Risk Areas", value: riskAreas.length, icon: MapPin, gradient: "from-blue-600 to-cyan-600" },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}>
              <div className={`bg-gradient-to-br ${stat.gradient} p-[1px] rounded-2xl`}>
                <div className="bg-gray-900 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <stat.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Seasonal Trends */}
        {trends.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-pink-400" />
              <h2 className="text-xl font-bold text-white">Seasonal Risk Trends</h2>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {trends.map((trend, idx) => {
                const riskConfig = getRiskConfig(trend.risk_level);
                return (
                  <motion.div key={trend.month} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="p-4 bg-gray-800/50 rounded-xl text-center hover:bg-gray-800 transition-colors">
                    <div className="text-sm font-semibold text-gray-400 mb-2">{trend.month}</div>
                    <div className="text-2xl font-bold text-white mb-1">{trend.incidents}</div>
                    <div className={`text-xs ${riskConfig.color} font-medium`}>{riskConfig.label} Risk</div>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div className={`h-2 rounded-full bg-gradient-to-r ${riskConfig.gradient}`} style={{ width: `${(trend.risk_level / 10) * 100}%` }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Risk Areas */}
        <div className="grid lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 col-span-2">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading risk assessment...
            </div>
          ) : riskAreas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 col-span-2">
              <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No risk data available
            </div>
          ) : (
            riskAreas.map((area, idx) => {
              const riskConfig = getRiskConfig(area.risk_score);

              return (
                <motion.div key={area.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-pink-500/10 rounded-xl">
                        <MapPin className="w-6 h-6 text-pink-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{area.area_name}</div>
                        <div className="text-sm text-gray-400">Population: {area.population_density.toLocaleString()}/sq mi</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 ${riskConfig.bg} ${riskConfig.border} border rounded-full`}>
                      <Flame className={`w-4 h-4 ${riskConfig.color}`} />
                      <span className={`text-sm font-medium ${riskConfig.color}`}>{riskConfig.label}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Risk Score</span>
                      <span className={`font-bold ${riskConfig.color}`}>{area.risk_score}/10</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div className={`h-3 rounded-full bg-gradient-to-r ${riskConfig.gradient} transition-all duration-500`}
                        style={{ width: `${(area.risk_score / 10) * 100}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-800/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-gray-400">High-Risk Properties</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-400">{area.high_risk_properties}</div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-gray-400">Recent Incidents</span>
                      </div>
                      <div className="text-2xl font-bold text-red-400">{area.recent_incidents}</div>
                    </div>
                  </div>

                  {area.vulnerability_factors.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-semibold text-white">Vulnerability Factors</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {area.vulnerability_factors.map((factor, i) => (
                          <span key={i} className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-full">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {area.recommended_actions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-white">Recommended Actions</span>
                      </div>
                      <div className="space-y-2">
                        {area.recommended_actions.map((action, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <Shield className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-green-400">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* AI Insights */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-pink-500/20 rounded-xl">
              <Brain className="w-6 h-6 text-pink-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">AI-Powered Insights</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                  <span>Fire risk is projected to increase 15% during winter months based on historical patterns</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Recommend increasing hydrant inspections in high-risk areas by 20%</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Community outreach programs in critical areas could reduce risk by an estimated 25%</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
