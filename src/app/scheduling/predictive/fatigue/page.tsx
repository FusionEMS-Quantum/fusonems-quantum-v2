'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Moon,
  Sun,
  TrendingUp,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  Search,
} from 'lucide-react';

interface FatigueScore {
  user_id: number;
  user_name?: string;
  overall_score: number;
  risk_level: string;
  factors: {
    consecutive_hours: number;
    night_shift_ratio: number;
    days_without_rest: number;
    overtime_ratio: number;
    circadian_disruption: number;
    shift_intensity: number;
  };
  recommendations: string[];
  next_safe_shift: string | null;
}

export default function FatigueMonitor() {
  const [fatigueData, setFatigueData] = useState<FatigueScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');

  useEffect(() => {
    fetchFatigueData();
  }, []);

  const fetchFatigueData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/scheduling/predictive/fatigue/high-risk?threshold=moderate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFatigueData(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch fatigue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' };
      case 'high': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' };
      case 'moderate': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' };
      default: return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' };
    }
  };

  const getFactorIcon = (factor: string) => {
    switch (factor) {
      case 'consecutive_hours': return <Clock className="w-4 h-4" />;
      case 'night_shift_ratio': return <Moon className="w-4 h-4" />;
      case 'days_without_rest': return <Sun className="w-4 h-4" />;
      case 'overtime_ratio': return <TrendingUp className="w-4 h-4" />;
      case 'circadian_disruption': return <Activity className="w-4 h-4" />;
      case 'shift_intensity': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getFactorLabel = (factor: string) => {
    const labels: Record<string, string> = {
      consecutive_hours: 'Consecutive Hours',
      night_shift_ratio: 'Night Shift Ratio',
      days_without_rest: 'Days Without Rest',
      overtime_ratio: 'Overtime Load',
      circadian_disruption: 'Circadian Disruption',
      shift_intensity: 'Shift Intensity',
    };
    return labels[factor] || factor;
  };

  const filteredData = fatigueData
    .filter((item) => filterLevel === 'all' || item.risk_level === filterLevel)
    .filter((item) => 
      searchTerm === '' || 
      (item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'score') return b.overall_score - a.overall_score;
      return (a.user_name || '').localeCompare(b.user_name || '');
    });

  const stats = {
    critical: fatigueData.filter(f => f.risk_level === 'critical').length,
    high: fatigueData.filter(f => f.risk_level === 'high').length,
    moderate: fatigueData.filter(f => f.risk_level === 'moderate').length,
    low: fatigueData.filter(f => f.risk_level === 'low').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Activity className="w-8 h-8 text-orange-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/scheduling/predictive" className="text-zinc-400 hover:text-white flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Activity className="w-8 h-8 text-orange-500" />
              <span>Fatigue Monitor</span>
            </h1>
            <p className="text-zinc-400 mt-1">Predictive Fatigue Index (PFI) Analysis</p>
          </div>
          <button
            onClick={fetchFatigueData}
            className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-red-400">{stats.critical}</p>
            <p className="text-sm text-zinc-400">Critical</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-orange-400">{stats.high}</p>
            <p className="text-sm text-zinc-400">High</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-yellow-400">{stats.moderate}</p>
            <p className="text-sm text-zinc-400">Moderate</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-green-400">{stats.low}</p>
            <p className="text-sm text-zinc-400">Low</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 flex-1 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Only</option>
                <option value="moderate">Moderate Only</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400 text-sm">Sort:</span>
              <button
                onClick={() => setSortBy('score')}
                className={`px-3 py-1 rounded text-sm ${sortBy === 'score' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
              >
                Score
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1 rounded text-sm ${sortBy === 'name' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
              >
                Name
              </button>
            </div>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">All Clear</h2>
            <p className="text-zinc-400">No crew members with elevated fatigue risk detected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item) => {
              const colors = getRiskColor(item.risk_level);
              const isExpanded = expandedUser === item.user_id;

              return (
                <div
                  key={item.user_id}
                  className={`bg-zinc-900 rounded-xl border ${colors.border} overflow-hidden`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-zinc-800/50"
                    onClick={() => setExpandedUser(isExpanded ? null : item.user_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-full ${colors.bg} flex items-center justify-center`}>
                          <span className={`text-xl font-bold ${colors.text}`}>
                            {Math.round(item.overall_score)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold flex items-center space-x-2">
                            <User className="w-4 h-4 text-zinc-400" />
                            <span>{item.user_name || `User ${item.user_id}`}</span>
                          </h3>
                          <p className={`text-sm capitalize ${colors.text}`}>
                            {item.risk_level} Risk
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {item.next_safe_shift && (
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">Next Safe Shift</p>
                            <p className="text-sm">{new Date(item.next_safe_shift).toLocaleString()}</p>
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm ${colors.bg} ${colors.text}`}>
                          {item.risk_level}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-700 p-4 bg-zinc-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-orange-400" />
                            <span>Fatigue Factors</span>
                          </h4>
                          <div className="space-y-3">
                            {Object.entries(item.factors).map(([key, value]) => (
                              <div key={key}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-zinc-400 flex items-center space-x-2">
                                    {getFactorIcon(key)}
                                    <span>{getFactorLabel(key)}</span>
                                  </span>
                                  <span className={`text-sm font-medium ${
                                    value >= 70 ? 'text-red-400' :
                                    value >= 50 ? 'text-orange-400' :
                                    value >= 30 ? 'text-yellow-400' :
                                    'text-green-400'
                                  }`}>
                                    {Math.round(value)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      value >= 70 ? 'bg-red-500' :
                                      value >= 50 ? 'bg-orange-500' :
                                      value >= 30 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${value}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3 flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span>Recommendations</span>
                          </h4>
                          <ul className="space-y-2">
                            {item.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start space-x-2 text-sm">
                                <span className="text-orange-400 mt-1">•</span>
                                <span className="text-zinc-300">{rec}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <div className="mt-4 pt-4 border-t border-zinc-700">
                            <button className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium">
                              Take Action
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
