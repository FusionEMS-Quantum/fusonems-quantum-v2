/**
 * Insurance Verification Admin Dashboard
 * Monitoring and management interface for insurance verifications
 */

import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';

interface VerificationStats {
  total_verifications: number;
  verified_count: number;
  failed_count: number;
  pending_count: number;
  average_duration_ms: number;
  success_rate: number;
}

interface RecentVerification {
  id: number;
  patient_name: string;
  payer_name: string;
  verification_status: string;
  is_eligible: boolean | null;
  requested_at: string;
  duration_ms: number;
}

export default function InsuranceVerificationDashboard() {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<RecentVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be actual API calls
      // Simulating data for now
      const mockStats: VerificationStats = {
        total_verifications: 142,
        verified_count: 118,
        failed_count: 18,
        pending_count: 6,
        average_duration_ms: 2340,
        success_rate: 83.1
      };

      const mockRecent: RecentVerification[] = [
        {
          id: 1,
          patient_name: 'John Smith',
          payer_name: 'Blue Cross Blue Shield',
          verification_status: 'verified',
          is_eligible: true,
          requested_at: new Date().toISOString(),
          duration_ms: 1500
        },
        {
          id: 2,
          patient_name: 'Jane Doe',
          payer_name: 'United Healthcare',
          verification_status: 'failed',
          is_eligible: false,
          requested_at: new Date(Date.now() - 3600000).toISOString(),
          duration_ms: 3200
        }
      ];

      setStats(mockStats);
      setRecentVerifications(mockRecent);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Unable to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Verification Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and manage insurance verification activity</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Verifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_verifications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Verified</p>
              <p className="text-2xl font-bold text-gray-900">{stats.verified_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failed_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.success_rate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Average Response Time</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDuration(stats.average_duration_ms)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min((stats.average_duration_ms / 5000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Verified</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {((stats.verified_count / stats.total_verifications) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm text-gray-600">Failed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {((stats.failed_count / stats.total_verifications) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {((stats.pending_count / stats.total_verifications) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Verifications */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Verifications</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentVerifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No recent verifications</p>
            </div>
          ) : (
            recentVerifications.map((verification) => (
              <div key={verification.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">{verification.patient_name}</h4>
                      {verification.verification_status === 'verified' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span>{verification.payer_name}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDuration(verification.duration_ms)}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(verification.requested_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {verification.is_eligible !== null && (
                    <div className={`text-sm font-medium ${verification.is_eligible ? 'text-green-600' : 'text-red-600'}`}>
                      {verification.is_eligible ? 'Eligible' : 'Not Eligible'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
