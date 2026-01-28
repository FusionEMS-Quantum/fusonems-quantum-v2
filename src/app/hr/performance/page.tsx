'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Star,
  Award,
  Target,
  BarChart3,
  Filter,
  Download,
  Plus,
  MessageSquare,
  FileText,
  Eye,
  Edit,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

// Mock performance data
const performanceMetrics = [
  { category: 'Clinical Skills', value: 92, fullMark: 100 },
  { category: 'Communication', value: 88, fullMark: 100 },
  { category: 'Teamwork', value: 95, fullMark: 100 },
  { category: 'Leadership', value: 85, fullMark: 100 },
  { category: 'Documentation', value: 90, fullMark: 100 },
  { category: 'Professionalism', value: 93, fullMark: 100 },
];

const reviewSchedule = [
  {
    id: 1,
    employeeName: 'John Doe',
    position: 'Paramedic',
    reviewDate: '2024-02-15',
    reviewType: 'Annual',
    status: 'scheduled',
    lastScore: 88,
  },
  {
    id: 2,
    employeeName: 'Sarah Johnson',
    position: 'EMT-B',
    reviewDate: '2024-02-20',
    reviewType: '90-Day',
    status: 'scheduled',
    lastScore: 85,
  },
  {
    id: 3,
    employeeName: 'Michael Chen',
    position: 'Operations Manager',
    reviewDate: '2024-01-10',
    reviewType: 'Annual',
    status: 'completed',
    lastScore: 94,
  },
  {
    id: 4,
    employeeName: 'Emily Rodriguez',
    position: 'Critical Care Paramedic',
    reviewDate: '2024-02-28',
    reviewType: 'Mid-Year',
    status: 'pending',
    lastScore: 91,
  },
];

const performanceTrend = [
  { quarter: 'Q1 23', avgScore: 82, reviews: 45 },
  { quarter: 'Q2 23', avgScore: 85, reviews: 48 },
  { quarter: 'Q3 23', avgScore: 87, reviews: 52 },
  { quarter: 'Q4 23', avgScore: 89, reviews: 50 },
  { quarter: 'Q1 24', avgScore: 90, reviews: 47 },
];

const goalCompletion = [
  { name: 'Clinical Excellence', completed: 85, inProgress: 10, notStarted: 5 },
  { name: 'Professional Development', completed: 70, inProgress: 20, notStarted: 10 },
  { name: 'Team Collaboration', completed: 90, inProgress: 8, notStarted: 2 },
  { name: 'Innovation', completed: 60, inProgress: 25, notStarted: 15 },
];

const PerformanceManagement = () => {
  const [selectedView, setSelectedView] = useState<'calendar' | 'analytics' | 'reviews'>(
    'calendar'
  );
  const [filterStatus, setFilterStatus] = useState('all');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Performance Management
            </h1>
            <p className="text-slate-600 mt-1">Reviews, goals, and analytics</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-400 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Export Report</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Schedule Review</span>
            </motion.button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Avg Performance Score',
              value: '89.5',
              change: '+3.2%',
              icon: Star,
              color: 'indigo',
            },
            {
              label: 'Reviews Scheduled',
              value: '12',
              change: '+2',
              icon: Calendar,
              color: 'purple',
            },
            {
              label: 'Goal Completion',
              value: '76%',
              change: '+8%',
              icon: Target,
              color: 'blue',
            },
            {
              label: 'Overdue Reviews',
              value: '3',
              change: '-2',
              icon: AlertCircle,
              color: 'orange',
            },
          ].map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">{kpi.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{kpi.value}</p>
                  <p className="text-sm text-green-600 font-medium mt-1">{kpi.change}</p>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    kpi.color === 'indigo'
                      ? 'bg-indigo-100 text-indigo-600'
                      : kpi.color === 'purple'
                      ? 'bg-purple-100 text-purple-600'
                      : kpi.color === 'blue'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-lg border border-slate-100 w-fit">
          {[
            { value: 'calendar', label: 'Calendar', icon: Calendar },
            { value: 'analytics', label: 'Analytics', icon: BarChart3 },
            { value: 'reviews', label: 'Reviews', icon: FileText },
          ].map((view) => (
            <button
              key={view.value}
              onClick={() => setSelectedView(view.value as any)}
              className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
                selectedView === view.value
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <view.icon className="w-5 h-5" />
              <span className="font-medium">{view.label}</span>
            </button>
          ))}
        </div>

        {/* Calendar View */}
        {selectedView === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Reviews */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Review Calendar</h3>
                  <p className="text-sm text-slate-600 mt-1">Upcoming performance reviews</p>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="divide-y divide-slate-100">
                {reviewSchedule.map((review, idx) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ backgroundColor: '#f8fafc' }}
                    className="p-6 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
                          {review.employeeName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">
                            {review.employeeName}
                          </h4>
                          <p className="text-sm text-slate-600">{review.position}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              <span>{review.reviewDate}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Star className="w-4 h-4" />
                              <span>Last: {review.lastScore}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            review.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : review.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {review.reviewType}
                        </span>
                        <div className="flex gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Performance Snapshot */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-6">
                Team Performance Snapshot
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={performanceMetrics}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Analytics View */}
        {selectedView === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Performance Trend</h3>
                  <p className="text-sm text-slate-600">Quarterly averages</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="quarter" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 5 }}
                    name="Avg Score"
                  />
                  <Line
                    type="monotone"
                    dataKey="reviews"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    name="Reviews"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Goal Completion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Goal Completion</h3>
                  <p className="text-sm text-slate-600">By category</p>
                </div>
                <Target className="w-5 h-5 text-purple-500" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={goalCompletion} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={150} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                  <Bar
                    dataKey="inProgress"
                    stackId="a"
                    fill="#f59e0b"
                    name="In Progress"
                  />
                  <Bar
                    dataKey="notStarted"
                    stackId="a"
                    fill="#ef4444"
                    name="Not Started"
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top Performers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Top Performers</h3>
                  <p className="text-sm text-slate-600">Recognition board</p>
                </div>
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'Michael Chen', score: 94, dept: 'Management', rank: 1 },
                  { name: 'Emily Rodriguez', score: 91, dept: 'Operations', rank: 2 },
                  { name: 'John Doe', score: 88, dept: 'Operations', rank: 3 },
                ].map((performer, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-6 rounded-2xl border-2 ${
                      idx === 0
                        ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300'
                        : idx === 1
                        ? 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300'
                        : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          idx === 0
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                            : idx === 1
                            ? 'bg-gradient-to-br from-slate-400 to-gray-500'
                            : 'bg-gradient-to-br from-orange-400 to-amber-500'
                        }`}
                      >
                        #{performer.rank}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{performer.name}</h4>
                        <p className="text-sm text-slate-600">{performer.dept}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Performance Score</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {performer.score}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Reviews View */}
        {selectedView === 'reviews' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-6">Review Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: '90-Day Review', icon: Clock, color: 'blue' },
                { name: 'Annual Review', icon: Calendar, color: 'indigo' },
                { name: 'Mid-Year Review', icon: FileText, color: 'purple' },
              ].map((template, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4 }}
                  className="p-6 border-2 border-slate-200 rounded-2xl hover:border-indigo-400 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      template.color === 'blue'
                        ? 'bg-blue-100 text-blue-600'
                        : template.color === 'indigo'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    <template.icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900">{template.name}</h4>
                  <p className="text-sm text-slate-600 mt-2">
                    Structured review template with competency assessment
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PerformanceManagement;
