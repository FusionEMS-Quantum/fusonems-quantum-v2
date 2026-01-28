'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  RefreshCw,
  ChevronRight,
  Brain,
  Lightbulb,
} from 'lucide-react';

interface AIRecommendation {
  id: number;
  type: string;
  title: string;
  description: string;
  explanation: string;
  confidence_score: number;
  impact_score: number;
  shift_id: number | null;
  user_id: number | null;
  suggested_action: Record<string, unknown> | null;
  alternatives: Array<Record<string, unknown>>;
  status: string;
  created_at: string;
}

interface AIRecommendationsResponse {
  enabled: boolean;
  message?: string;
  recommendations: AIRecommendation[];
}

export default function AIAdvisoryPanel() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/v1/scheduling/ai/recommendations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data: AIRecommendationsResponse = await res.json();
        setEnabled(data.enabled);
        setMessage(data.message || '');
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const acceptRecommendation = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/v1/scheduling/ai/recommendations/${id}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        await fetchRecommendations();
      }
    } catch (err) {
      console.error('Failed to accept recommendation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRecommendation = async (id: number, reason: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/v1/scheduling/ai/recommendations/${id}/reject?reason=${encodeURIComponent(reason)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        await fetchRecommendations();
      }
    } catch (err) {
      console.error('Failed to reject recommendation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'coverage_gap': return AlertTriangle;
      case 'overtime_warning': return Clock;
      case 'staffing_optimization': return Users;
      case 'fatigue_risk': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'coverage_gap': return 'text-red-500 bg-red-500/10';
      case 'overtime_warning': return 'text-yellow-500 bg-yellow-500/10';
      case 'staffing_optimization': return 'text-blue-500 bg-blue-500/10';
      case 'fatigue_risk': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-purple-500 bg-purple-500/10';
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.9) return { label: 'Very High', color: 'bg-green-600' };
    if (score >= 0.7) return { label: 'High', color: 'bg-blue-600' };
    if (score >= 0.5) return { label: 'Medium', color: 'bg-yellow-600' };
    return { label: 'Low', color: 'bg-zinc-600' };
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">AI Advisory</h3>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
          <p className="mt-2 text-zinc-400 text-sm">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-zinc-500" />
          <h3 className="text-lg font-semibold text-zinc-400">AI Advisory</h3>
        </div>
        <div className="text-center py-8">
          <Zap className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 mb-2">AI Recommendations Unavailable</p>
          <p className="text-zinc-500 text-sm">{message || 'Upgrade to premium to unlock AI-powered scheduling insights'}</p>
          <button className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium transition-colors">
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600/20 rounded-lg">
            <Brain className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI Advisory</h3>
            <p className="text-xs text-zinc-500">Intelligent scheduling recommendations</p>
          </div>
        </div>
        <button
          onClick={fetchRecommendations}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
          <p className="text-zinc-400">No pending recommendations</p>
          <p className="text-zinc-500 text-sm mt-1">Your schedule is optimized</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const TypeIcon = getTypeIcon(rec.type);
            const typeColor = getTypeColor(rec.type);
            const confidence = getConfidenceBadge(rec.confidence_score);
            const isProcessing = processingId === rec.id;

            return (
              <div
                key={rec.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-orange-600/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${typeColor}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-zinc-400 mt-1">{rec.description}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full text-white ${confidence.color}`}>
                        {confidence.label}
                      </span>
                    </div>
                    
                    {rec.explanation && (
                      <div className="mt-2 p-2 bg-zinc-900/50 rounded text-xs text-zinc-400 border-l-2 border-orange-500/50">
                        <strong className="text-orange-500">Why:</strong> {rec.explanation}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => acceptRecommendation(rec.id)}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Accept
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => rejectRecommendation(rec.id, 'User rejected')}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          AI suggestions are advisory only. All decisions require human approval.
        </p>
      </div>
    </div>
  );
}
