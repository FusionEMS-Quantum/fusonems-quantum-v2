'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar, AlertCircle, Check } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export interface PayrollSummary {
  totalPayroll: number;
  employeeCount: number;
  averageSalary: number;
  periodStart: string;
  periodEnd: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  trend: number; // percentage change from previous period
  sparklineData?: number[];
  breakdown?: {
    regular: number;
    overtime: number;
    bonuses: number;
    deductions: number;
  };
}

interface PayrollSummaryCardProps {
  data: PayrollSummary;
  isLoading?: boolean;
  className?: string;
  onViewDetails?: () => void;
}

const AnimatedCounter: React.FC<{ value: number; duration?: number; prefix?: string; suffix?: string }> = ({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const StatusBadge: React.FC<{ status: PayrollSummary['status'] }> = ({ status }) => {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, label: 'Pending' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Calendar, label: 'Processing' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', icon: Check, label: 'Completed' },
    error: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle, label: 'Error' },
  };

  const { bg, text, icon: Icon, label } = config[status];

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bg} ${text}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

export const PayrollSummaryCard: React.FC<PayrollSummaryCardProps> = ({
  data,
  isLoading = false,
  className = '',
  onViewDetails,
}) => {
  const sparklineData = data.sparklineData || [65, 68, 70, 72, 69, 73, 75, 78, 76, 80, 82, 85];
  const chartData = sparklineData.map((value, index) => ({ value, index }));

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded w-2/3" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl shadow-2xl overflow-hidden ${className}`}
    >
      <div className="p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/80">Total Payroll</h3>
              <p className="text-xs text-white/60">
                {new Date(data.periodStart).toLocaleDateString()} - {new Date(data.periodEnd).toLocaleDateString()}
              </p>
            </div>
          </div>
          <StatusBadge status={data.status} />
        </div>

        {/* Main Amount */}
        <div className="mb-6">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-4xl font-bold mb-2"
          >
            $<AnimatedCounter value={data.totalPayroll} />
          </motion.div>
          
          <div className="flex items-center gap-2">
            {data.trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-300" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-300" />
            )}
            <span className={`text-sm font-medium ${data.trend >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {data.trend >= 0 ? '+' : ''}{data.trend.toFixed(1)}%
            </span>
            <span className="text-sm text-white/60">vs last period</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="h-16 -mx-2 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
                dot={false}
                animationDuration={2000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-white/80" />
              <span className="text-xs text-white/60">Employees</span>
            </div>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={data.employeeCount} />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-white/80" />
              <span className="text-xs text-white/60">Avg Salary</span>
            </div>
            <div className="text-2xl font-bold">
              $<AnimatedCounter value={Math.round(data.averageSalary)} />
            </div>
          </div>
        </div>

        {/* Breakdown */}
        {data.breakdown && (
          <div className="space-y-2 mb-6">
            <h4 className="text-xs font-medium text-white/80 mb-3">Breakdown</h4>
            {Object.entries(data.breakdown).map(([key, value]) => {
              const percentage = (value / data.totalPayroll) * 100;
              const isDeduction = key === 'deductions';
              
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="capitalize text-white/80">{key}</span>
                    <span className="font-medium">
                      {isDeduction ? '-' : ''}${value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={`h-full rounded-full ${
                        isDeduction ? 'bg-red-400' : 'bg-white/80'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        {onViewDetails && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onViewDetails}
            className="w-full bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-white/95 transition-colors"
          >
            View Detailed Report
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default PayrollSummaryCard;
