'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ArrowLeft,
  Search,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface SwapMatch {
  requester_id: number;
  target_id: number;
  target_name: string | null;
  compatibility_score: number;
  fairness_impact: number;
  factors: {
    fatigue_risk: number;
    availability: number;
    certification_match: number;
    fairness_impact: number;
    preference_match: number;
  };
  warnings: string[];
}

export default function SmartSwaps() {
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignmentId, setAssignmentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMatches = async () => {
    if (!assignmentId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/scheduling/predictive/swap-matches/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMatches(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch swap matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' };
    if (score >= 60) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' };
    return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' };
  };

  const getFairnessColor = (impact: number) => {
    if (impact > 10) return 'text-green-400';
    if (impact < -10) return 'text-red-400';
    return 'text-zinc-400';
  };

  const filteredMatches = matches.filter(match =>
    searchTerm === '' ||
    match.target_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <RefreshCw className="w-8 h-8 text-blue-500" />
              <span>Smart Swaps</span>
            </h1>
            <p className="text-zinc-400 mt-1">AI-Powered Shift Exchange Matching</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Find Swap Matches</h2>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              placeholder="Enter Assignment ID to swap"
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2 flex-1"
            />
            <button
              onClick={fetchMatches}
              disabled={!assignmentId || loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Find Matches</span>
            </button>
          </div>
        </div>

        {assignmentId && matches.length > 0 && (
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

        {!assignmentId ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <RefreshCw className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enter an Assignment ID</h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Enter the assignment ID you want to swap. The AI will find the best matching
              candidates based on certifications, availability, fairness, and preferences.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Finding optimal swap matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Matches Found</h2>
            <p className="text-zinc-400">No suitable swap candidates available for this assignment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match, index) => {
              const scoreColor = getScoreColor(match.compatibility_score);

              return (
                <div
                  key={match.target_id}
                  className={`bg-zinc-900 rounded-xl border ${scoreColor.border} overflow-hidden`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl font-bold text-zinc-500">#{index + 1}</span>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User className="w-6 h-6 text-zinc-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{match.target_name || `User ${match.target_id}`}</p>
                            <p className="text-sm text-zinc-400">Available for swap</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-xs text-zinc-400">Fairness Impact</p>
                          <p className={`text-lg font-bold ${getFairnessColor(match.fairness_impact)}`}>
                            {match.fairness_impact > 0 ? '+' : ''}{Math.round(match.fairness_impact)}
                          </p>
                        </div>
                        <div className={`px-4 py-3 rounded-lg ${scoreColor.bg}`}>
                          <span className={`text-3xl font-bold ${scoreColor.text}`}>
                            {Math.round(match.compatibility_score)}
                          </span>
                          <span className={`text-sm ${scoreColor.text}`}>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 mb-4">
                      {Object.entries(match.factors).map(([key, value]) => {
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const isGood = value >= 70;
                        
                        return (
                          <div key={key} className="text-center">
                            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-1">
                              <div
                                className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-orange-500'}`}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                            <p className="text-xs text-zinc-400">{label}</p>
                            <p className={`text-sm font-medium ${isGood ? 'text-green-400' : 'text-orange-400'}`}>
                              {Math.round(value)}%
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {match.warnings.length > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-400">Warnings</p>
                            <ul className="text-sm text-zinc-300 space-y-1 mt-1">
                              {match.warnings.map((w, i) => (
                                <li key={i}>• {w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium flex items-center justify-center space-x-2">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Request Swap</span>
                      </button>
                      <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm">
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-3">How Smart Matching Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-400">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Certification Check</p>
                <p>Ensures target has required certifications for the shift</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Fatigue Analysis</p>
                <p>Evaluates target's current fatigue level before recommending</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <ArrowRight className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Fairness Balance</p>
                <p>Considers hours worked to maintain equitable distribution</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
