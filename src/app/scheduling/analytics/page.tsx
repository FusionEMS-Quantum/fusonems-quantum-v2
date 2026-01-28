'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Clock, Calendar, DollarSign, AlertTriangle, CheckCircle, RefreshCw, Download } from 'lucide-react';

export default function SchedulingAnalytics() {
  const [dateRange, setDateRange] = useState('week');
  const analytics = {
    coverage: { rate: 94.2, trend: 2.5 },
    overtime: { hours: 127.5, cost: 8925, trend: -5.2 },
    staffing: { total: 48, available: 42, on_leave: 6 },
    shifts: { total: 168, filled: 158, open: 10 },
    requests: { pending: 8, approved: 24, denied: 3 },
    alerts: { critical: 2, warning: 5, resolved: 18 },
  };

  const StatCard = ({ icon: Icon, label, value, subValue, trend, color }: any) => (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 hover:border-orange-600/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mt-4">{value}</p>
      <p className="text-sm text-zinc-400 mt-1">{label}</p>
      {subValue && <p className="text-xs text-zinc-500 mt-0.5">{subValue}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold"><span className="text-orange-500">Scheduling</span> Analytics</h1>
            <p className="text-zinc-400 mt-1">Workforce metrics and performance insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm">
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-orange-600/50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />Export
            </button>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle} label="Coverage Rate" value={`${analytics.coverage.rate}%`} trend={analytics.coverage.trend} color="bg-green-600/20" />
          <StatCard icon={Clock} label="Overtime Hours" value={analytics.overtime.hours} subValue={`$${analytics.overtime.cost.toLocaleString()} cost`} trend={analytics.overtime.trend} color="bg-yellow-600/20" />
          <StatCard icon={Users} label="Available Staff" value={`${analytics.staffing.available}/${analytics.staffing.total}`} subValue={`${analytics.staffing.on_leave} on leave`} color="bg-blue-600/20" />
          <StatCard icon={Calendar} label="Open Shifts" value={analytics.shifts.open} subValue={`${analytics.shifts.filled} filled of ${analytics.shifts.total}`} color="bg-orange-600/20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Request Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg"><span className="text-yellow-400">Pending</span><span className="text-xl font-bold">{analytics.requests.pending}</span></div>
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg"><span className="text-green-400">Approved</span><span className="text-xl font-bold">{analytics.requests.approved}</span></div>
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg"><span className="text-red-400">Denied</span><span className="text-xl font-bold">{analytics.requests.denied}</span></div>
            </div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Alert Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-red-400">Critical</span></div><span className="text-xl font-bold">{analytics.alerts.critical}</span></div>
              <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /><span className="text-yellow-400">Warning</span></div><span className="text-xl font-bold">{analytics.alerts.warning}</span></div>
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-400">Resolved</span></div><span className="text-xl font-bold">{analytics.alerts.resolved}</span></div>
            </div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Insights</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-zinc-800/50 rounded-lg border-l-2 border-orange-500"><p className="text-zinc-300">Coverage improved 2.5% from last period</p></div>
              <div className="p-3 bg-zinc-800/50 rounded-lg border-l-2 border-green-500"><p className="text-zinc-300">Overtime costs down 5.2% this period</p></div>
              <div className="p-3 bg-zinc-800/50 rounded-lg border-l-2 border-yellow-500"><p className="text-zinc-300">10 shifts require immediate staffing</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
