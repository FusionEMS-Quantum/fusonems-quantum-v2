'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  RefreshCw,
  Search,
  Award,
  AlertTriangle,
  CheckCircle,
  User,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Star,
} from 'lucide-react';

interface CompetencyPair {
  senior_id: number;
  senior_name: string | null;
  junior_id: number;
  junior_name: string | null;
  compatibility_score: number;
  mentorship_areas: string[];
  risk_factors: string[];
}

export default function CrewPairing() {
  const [pairs, setPairs] = useState<CompetencyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftId, setShiftId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPair, setExpandedPair] = useState<string | null>(null);

  useEffect(() => {
    if (shiftId) {
      fetchPairs();
    } else {
      setLoading(false);
    }
  }, [shiftId]);

  const fetchPairs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/scheduling/predictive/pairing/optimal/${shiftId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPairs(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-orange-400 bg-orange-500/20';
  };

  const filteredPairs = pairs.filter(pair =>
    searchTerm === '' ||
    pair.senior_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.junior_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/scheduling/predictive" className="text-zinc-400 hover:text-white flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Users className="w-8 h-8 text-purple-500" />
              <span>Crew Pairing</span>
            </h1>
            <p className="text-zinc-400 mt-1">AI-Powered Mentorship Matching</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Find Optimal Pairs for a Shift</h2>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              placeholder="Enter Shift ID"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2 flex-1"
            />
            <button
              onClick={fetchPairs}
              disabled={!shiftId || loading}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Find Pairs</span>
            </button>
          </div>
        </div>

        {shiftId && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 flex-1 text-sm"
              />
            </div>
          </div>
        )}

        {!shiftId ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enter a Shift ID</h2>
            <p className="text-zinc-400">
              Enter a shift ID above to find optimal crew pairings based on experience levels,
              skill complementarity, and mentorship opportunities.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Finding optimal pairs...</p>
          </div>
        ) : filteredPairs.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Pairs Found</h2>
            <p className="text-zinc-400">No matching pairs available for this shift.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPairs.map((pair, index) => {
              const pairKey = `${pair.senior_id}-${pair.junior_id}`;
              const isExpanded = expandedPair === pairKey;
              const scoreColor = getScoreColor(pair.compatibility_score);

              return (
                <div
                  key={pairKey}
                  className="bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-zinc-800/50"
                    onClick={() => setExpandedPair(isExpanded ? null : pairKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-zinc-500">#{index + 1}</span>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-1">
                              <Star className="w-5 h-5 text-purple-400" />
                            </div>
                            <p className="font-medium text-sm">{pair.senior_name || `User ${pair.senior_id}`}</p>
                            <p className="text-xs text-zinc-500">Senior</p>
                          </div>

                          <div className="text-2xl text-zinc-600">+</div>

                          <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-1">
                              <User className="w-5 h-5 text-blue-400" />
                            </div>
                            <p className="font-medium text-sm">{pair.junior_name || `User ${pair.junior_id}`}</p>
                            <p className="text-xs text-zinc-500">Junior</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className={`px-4 py-2 rounded-lg ${scoreColor}`}>
                          <span className="text-2xl font-bold">{Math.round(pair.compatibility_score)}</span>
                          <span className="text-sm ml-1">%</span>
                        </div>
                        
                        {pair.risk_factors.length > 0 && (
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        )}
                        
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-700 p-4 bg-zinc-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                            <span>Mentorship Areas</span>
                          </h4>
                          {pair.mentorship_areas.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {pair.mentorship_areas.map((area, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-zinc-500 text-sm">No specific areas identified</p>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3 flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span>Risk Factors</span>
                          </h4>
                          {pair.risk_factors.length > 0 ? (
                            <ul className="space-y-2">
                              {pair.risk_factors.map((risk, i) => (
                                <li key={i} className="flex items-start space-x-2 text-sm">
                                  <span className="text-yellow-400 mt-1">•</span>
                                  <span className="text-zinc-300">{risk}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-green-400 text-sm flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>No risk factors identified</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-zinc-700 flex space-x-2">
                        <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium">
                          Assign This Pair
                        </button>
                        <button className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium">
                          View Profiles
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-3">How Pairing Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-400">
            <div className="flex items-start space-x-3">
              <Award className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Experience Matching</p>
                <p>Pairs crew with 2-5 year experience differential for optimal mentorship</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Skill Complementarity</p>
                <p>Senior strong in areas where junior needs development</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Risk Assessment</p>
                <p>Flags fatigue or scheduling conflicts that could impact performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
