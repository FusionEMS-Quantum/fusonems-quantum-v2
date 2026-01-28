'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  User,
  Phone,
  Calendar,
  Shield,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WellnessAlert {
  user_id: number;
  user_name?: string;
  alert_type: string;
  severity: string;
  incident_count: number;
  days_tracked: number;
  recommendation: string;
  auto_action_suggested: string | null;
}

interface WellnessDetail {
  wellness_score: {
    user_id: number;
    exposure_score: number;
    severity: string;
    recommendation: string;
    incident_counts: Record<string, number>;
    days_tracked: number;
  };
  recovery_plan: {
    current_severity: string;
    recommended_days_off: number;
    shift_type_restrictions: string[];
    schedule_modifications: string[];
  };
}

export default function WellnessCenter() {
  const [alerts, setAlerts] = useState<WellnessAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [userDetails, setUserDetails] = useState<Record<number, WellnessDetail>>({});

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/scheduling/predictive/wellness/alerts?threshold=watch', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch wellness alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    if (userDetails[userId]) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/scheduling/predictive/wellness/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserDetails(prev => ({ ...prev, [userId]: data }));
      }
    } catch (error) {
      console.error('Failed to fetch user wellness details:', error);
    }
  };

  const handleExpand = (userId: number) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      fetchUserDetails(userId);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500', badge: 'bg-red-500' };
      case 'intervention': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500', badge: 'bg-orange-500' };
      case 'concern': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500', badge: 'bg-yellow-500 text-black' };
      case 'watch': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500', badge: 'bg-blue-500' };
      default: return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500', badge: 'bg-green-500' };
    }
  };

  const filteredAlerts = alerts.filter(
    alert => filterSeverity === 'all' || alert.severity === filterSeverity
  );

  const stats = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    intervention: alerts.filter(a => a.severity === 'intervention').length,
    concern: alerts.filter(a => a.severity === 'concern').length,
    watch: alerts.filter(a => a.severity === 'watch').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Heart className="w-8 h-8 text-pink-500 animate-pulse" />
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
              <Heart className="w-8 h-8 text-pink-500" />
              <span>Wellness Center</span>
            </h1>
            <p className="text-zinc-400 mt-1">Critical Incident Exposure Tracking</p>
          </div>
          <button
            onClick={fetchAlerts}
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
            <p className="text-4xl font-bold text-orange-400">{stats.intervention}</p>
            <p className="text-sm text-zinc-400">Intervention</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-yellow-400">{stats.concern}</p>
            <p className="text-sm text-zinc-400">Concern</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-blue-400">{stats.watch}</p>
            <p className="text-sm text-zinc-400">Watch</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="intervention">Intervention Required</option>
              <option value="concern">Concern</option>
              <option value="watch">Watch</option>
            </select>
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-12 text-center">
            <Heart className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Team Wellness Good</h2>
            <p className="text-zinc-400">No wellness concerns requiring attention</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const colors = getSeverityColor(alert.severity);
              const isExpanded = expandedUser === alert.user_id;
              const details = userDetails[alert.user_id];

              return (
                <div
                  key={alert.user_id}
                  className={`bg-zinc-900 rounded-xl border ${colors.border} overflow-hidden`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-zinc-800/50"
                    onClick={() => handleExpand(alert.user_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center`}>
                          <Heart className={`w-6 h-6 ${colors.text}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold flex items-center space-x-2">
                            <User className="w-4 h-4 text-zinc-400" />
                            <span>{alert.user_name || `User ${alert.user_id}`}</span>
                          </h3>
                          <p className="text-sm text-zinc-400">
                            {alert.incident_count} incidents in {alert.days_tracked} days
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-sm text-white ${colors.badge}`}>
                          {alert.severity}
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
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span>Recommendation</span>
                          </h4>
                          <p className="text-zinc-300 mb-4">{alert.recommendation}</p>

                          {alert.auto_action_suggested && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                              <p className="text-sm text-orange-400 font-medium">Suggested Action:</p>
                              <p className="text-sm text-zinc-300">{alert.auto_action_suggested.replace(/_/g, ' ')}</p>
                            </div>
                          )}
                        </div>

                        <div>
                          {details?.recovery_plan && (
                            <>
                              <h4 className="font-semibold mb-3 flex items-center space-x-2">
                                <Shield className="w-4 h-4 text-green-400" />
                                <span>Recovery Plan</span>
                              </h4>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-zinc-400" />
                                  <span className="text-sm">
                                    Recommended: {details.recovery_plan.recommended_days_off} days off
                                  </span>
                                </div>

                                {details.recovery_plan.shift_type_restrictions.length > 0 && (
                                  <div>
                                    <p className="text-xs text-zinc-400 mb-1">Shift Restrictions:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {details.recovery_plan.shift_type_restrictions.map((r, i) => (
                                        <span key={i} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                                          {r.replace(/_/g, ' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {details.recovery_plan.schedule_modifications.length > 0 && (
                                  <div>
                                    <p className="text-xs text-zinc-400 mb-1">Modifications:</p>
                                    <ul className="space-y-1">
                                      {details.recovery_plan.schedule_modifications.map((m, i) => (
                                        <li key={i} className="text-sm text-zinc-300 flex items-start space-x-2">
                                          <span className="text-orange-400">•</span>
                                          <span>{m}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          <div className="mt-4 pt-4 border-t border-zinc-700 flex space-x-2">
                            <button className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium flex items-center justify-center space-x-2">
                              <Phone className="w-4 h-4" />
                              <span>Schedule Check-in</span>
                            </button>
                            <button className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium">
                              View History
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
