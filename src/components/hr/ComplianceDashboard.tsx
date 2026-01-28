'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, FileCheck, Clock } from 'lucide-react';

export interface ComplianceMetric {
  id: string;
  name: string;
  score: number; // 0-100
  status: 'compliant' | 'warning' | 'non-compliant';
  lastChecked: string;
  trend: number; // percentage change
  alerts?: number;
  details?: string;
}

interface ComplianceDashboardProps {
  metrics: ComplianceMetric[];
  overallScore?: number;
  isLoading?: boolean;
  className?: string;
  onMetricClick?: (metric: ComplianceMetric) => void;
}

const statusConfig = {
  compliant: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-300',
    label: 'Compliant',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    label: 'Warning',
  },
  'non-compliant': {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
    label: 'Non-Compliant',
  },
};

const CircularProgress: React.FC<{ value: number; size?: number; strokeWidth?: number; label?: string }> = ({
  value,
  size = 120,
  strokeWidth = 8,
  label,
}) => {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setProgress(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const getColor = (val: number) => {
    if (val >= 90) return '#10b981'; // green
    if (val >= 70) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{Math.round(progress)}</span>
        {label && <span className="text-xs text-gray-600 mt-1">{label}</span>}
      </div>
    </div>
  );
};

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  metrics,
  overallScore,
  isLoading = false,
  className = '',
  onMetricClick,
}) => {
  const totalAlerts = metrics.reduce((sum, m) => sum + (m.alerts || 0), 0);
  const compliantCount = metrics.filter(m => m.status === 'compliant').length;
  const warningCount = metrics.filter(m => m.status === 'warning').length;
  const nonCompliantCount = metrics.filter(m => m.status === 'non-compliant').length;

  const calculatedOverallScore = overallScore ?? 
    metrics.reduce((sum, m) => sum + m.score, 0) / (metrics.length || 1);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Compliance Dashboard</h2>
            <p className="text-emerald-100 text-sm">Real-time compliance monitoring and alerts</p>
          </div>
          <Shield className="w-12 h-12 text-white opacity-50" />
        </div>
      </div>

      <div className="p-6">
        {/* Overall Score */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Overall Compliance Score</h3>
            <CircularProgress value={calculatedOverallScore} size={140} label="%" />
            <p className="text-xs text-gray-600 mt-4 text-center">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-green-50 border-2 border-green-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-green-900">Compliant</span>
              </div>
              <div className="text-3xl font-bold text-green-700">{compliantCount}</div>
              <div className="text-xs text-green-600 mt-1">
                {((compliantCount / metrics.length) * 100).toFixed(0)}% of total
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-900">Warnings</span>
              </div>
              <div className="text-3xl font-bold text-yellow-700">{warningCount}</div>
              <div className="text-xs text-yellow-600 mt-1">Needs attention</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs font-medium text-red-900">Non-Compliant</span>
              </div>
              <div className="text-3xl font-bold text-red-700">{nonCompliantCount}</div>
              <div className="text-xs text-red-600 mt-1">Immediate action required</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">Active Alerts</span>
              </div>
              <div className="text-3xl font-bold text-blue-700">{totalAlerts}</div>
              <div className="text-xs text-blue-600 mt-1">Across all metrics</div>
            </motion.div>
          </div>
        </div>

        {/* Metrics List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 mb-4">Compliance Metrics</h3>
          {metrics.map((metric, index) => {
            const config = statusConfig[metric.status];
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className={`${config.bg} border-2 ${config.border} rounded-lg p-4 cursor-pointer transition-all`}
                onClick={() => onMetricClick?.(metric)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <StatusIcon className={`w-6 h-6 ${config.color} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900">{metric.name}</h4>
                      {metric.details && (
                        <p className="text-xs text-gray-600 mt-1">{metric.details}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{metric.score}%</div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {metric.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-xs font-medium ${metric.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.trend >= 0 ? '+' : ''}{metric.trend}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.score}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last checked: {new Date(metric.lastChecked).toLocaleString()}</span>
                  </div>
                  {metric.alerts && metric.alerts > 0 && (
                    <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="font-medium">{metric.alerts} alert{metric.alerts !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
