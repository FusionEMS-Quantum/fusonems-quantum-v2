'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Calendar,
  Download,
  Upload,
  Send,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  Eye,
  Edit,
  FileText,
  Users,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock payroll data
const payPeriods = [
  {
    id: 1,
    periodStart: '2024-01-01',
    periodEnd: '2024-01-15',
    payDate: '2024-01-20',
    status: 'paid',
    totalAmount: 156200,
    totalHours: 3124,
    employees: 162,
  },
  {
    id: 2,
    periodStart: '2024-01-16',
    periodEnd: '2024-01-31',
    payDate: '2024-02-05',
    status: 'approved',
    totalAmount: 158400,
    totalHours: 3168,
    employees: 162,
  },
  {
    id: 3,
    periodStart: '2024-02-01',
    periodEnd: '2024-02-15',
    payDate: '2024-02-20',
    status: 'pending',
    totalAmount: 159800,
    totalHours: 3196,
    employees: 165,
  },
];

const employeePayroll = [
  {
    id: 1,
    name: 'John Doe',
    employeeId: 'EMP001',
    department: 'Operations',
    regularHours: 80,
    overtimeHours: 12,
    hourlyRate: 32.50,
    grossPay: 3380,
    deductions: 812,
    netPay: 2568,
    status: 'approved',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    employeeId: 'EMP002',
    department: 'Operations',
    regularHours: 80,
    overtimeHours: 8,
    hourlyRate: 24.75,
    grossPay: 2277,
    deductions: 546,
    netPay: 1731,
    status: 'approved',
  },
  {
    id: 3,
    name: 'Michael Chen',
    employeeId: 'EMP003',
    department: 'Management',
    regularHours: 80,
    overtimeHours: 0,
    hourlyRate: 45.00,
    grossPay: 3600,
    deductions: 864,
    netPay: 2736,
    status: 'pending',
  },
];

const costAnalysis = [
  { category: 'Regular Pay', amount: 125000, percent: 62 },
  { category: 'Overtime', amount: 28000, percent: 14 },
  { category: 'Benefits', amount: 32000, percent: 16 },
  { category: 'Taxes', amount: 16000, percent: 8 },
];

const payrollTrend = [
  { month: 'Aug', amount: 295000, hours: 5900 },
  { month: 'Sep', amount: 302000, hours: 6040 },
  { month: 'Oct', amount: 298000, hours: 5960 },
  { month: 'Nov', amount: 310000, hours: 6200 },
  { month: 'Dec', amount: 315000, hours: 6300 },
  { month: 'Jan', amount: 318000, hours: 6360 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const PayrollProcessing = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(payPeriods[2]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showDetails, setShowDetails] = useState(false);

  const currentStats = {
    totalGross: employeePayroll.reduce((sum, emp) => sum + emp.grossPay, 0),
    totalNet: employeePayroll.reduce((sum, emp) => sum + emp.netPay, 0),
    totalHours: employeePayroll.reduce((sum, emp) => sum + emp.regularHours + emp.overtimeHours, 0),
    avgPay: employeePayroll.reduce((sum, emp) => sum + emp.netPay, 0) / employeePayroll.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Payroll Processing
            </h1>
            <p className="text-slate-600 mt-1">Manage pay periods and employee compensation</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-400 transition-colors flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              <span>Import Hours</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-400 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Process Payroll</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Pay Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Select Pay Period</h3>
            <Calendar className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {payPeriods.map((period) => (
              <motion.button
                key={period.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPeriod(period)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedPeriod.id === period.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">
                      {period.periodStart} - {period.periodEnd}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Pay Date: {period.payDate}</p>
                    <p className="text-sm text-slate-600">
                      ${(period.totalAmount / 1000).toFixed(1)}K • {period.totalHours}h
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      period.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : period.status === 'approved'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {period.status}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Total Gross Pay',
              value: `$${(currentStats.totalGross / 1000).toFixed(1)}K`,
              icon: DollarSign,
              color: 'emerald',
              change: '+2.3%',
            },
            {
              label: 'Total Net Pay',
              value: `$${(currentStats.totalNet / 1000).toFixed(1)}K`,
              icon: CheckCircle,
              color: 'teal',
              change: '+1.8%',
            },
            {
              label: 'Total Hours',
              value: currentStats.totalHours.toFixed(0),
              icon: Clock,
              color: 'blue',
              change: '+4.2%',
            },
            {
              label: 'Avg Pay/Employee',
              value: `$${currentStats.avgPay.toFixed(0)}`,
              icon: Users,
              color: 'purple',
              change: '+1.5%',
            },
          ].map((stat, idx) => (
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
                  <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-green-600 font-medium mt-1">{stat.change}</p>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    stat.color === 'emerald'
                      ? 'bg-emerald-100 text-emerald-600'
                      : stat.color === 'teal'
                      ? 'bg-teal-100 text-teal-600'
                      : stat.color === 'blue'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payroll Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Payroll Trend</h3>
                <p className="text-sm text-slate-600">6-month overview</p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={payrollTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Cost Analysis */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cost Analysis</h3>
                <p className="text-sm text-slate-600">Breakdown by category</p>
              </div>
              <PieChartIcon className="w-5 h-5 text-teal-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {costAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Employee Payroll Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Employee Payroll</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {employeePayroll.length} employees in current period
                </p>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">All Departments</option>
                  <option value="Operations">Operations</option>
                  <option value="Management">Management</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Reg Hours
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    OT Hours
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Rate
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Gross Pay
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Deductions
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Net Pay
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeePayroll.map((emp) => (
                  <motion.tr
                    key={emp.id}
                    whileHover={{ backgroundColor: '#f0fdf4' }}
                    className="transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-600">{emp.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{emp.regularHours}h</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{emp.overtimeHours}h</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      ${emp.hourlyRate.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      ${emp.grossPay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      -${emp.deductions.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                      ${emp.netPay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          emp.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PayrollProcessing;
