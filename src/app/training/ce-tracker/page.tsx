"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Download,
  Upload,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  PieChart as PieChartIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function CETracker() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const ceBalance = [
    { type: "Clinical", earned: 48, required: 40, color: "#3B82F6" },
    { type: "Operations", earned: 12, required: 8, color: "#10B981" },
    { type: "Leadership", earned: 6, required: 4, color: "#F59E0B" },
    { type: "Safety", earned: 8, required: 8, color: "#EF4444" },
  ];

  const certifications = [
    {
      id: 1,
      name: "Paramedic License",
      issuer: "Wisconsin DSPS",
      number: "WI-P-12345",
      issued: "Jan 2024",
      expires: "Dec 2026",
      status: "active",
      daysUntilExpiry: 698,
      renewalCE: 60,
      currentCE: 74,
    },
    {
      id: 2,
      name: "ACLS Certification",
      issuer: "American Heart Association",
      number: "AHA-ACLS-67890",
      issued: "Mar 2024",
      expires: "Mar 2026",
      status: "active",
      daysUntilExpiry: 425,
      renewalCE: 8,
      currentCE: 8,
    },
    {
      id: 3,
      name: "PALS Certification",
      issuer: "American Heart Association",
      number: "AHA-PALS-24680",
      issued: "Apr 2024",
      expires: "Apr 2026",
      status: "active",
      daysUntilExpiry: 455,
      renewalCE: 6,
      currentCE: 6,
    },
    {
      id: 4,
      name: "BLS Certification",
      issuer: "American Heart Association",
      number: "AHA-BLS-13579",
      issued: "Jan 2025",
      expires: "Jan 2027",
      status: "active",
      daysUntilExpiry: 733,
      renewalCE: 4,
      currentCE: 4,
    },
  ];

  const ceActivity = [
    {
      id: 1,
      title: "Advanced Cardiac Life Support",
      date: "Jan 15, 2026",
      credits: 8,
      type: "Clinical",
      status: "approved",
      provider: "AHA",
      certificate: "#",
    },
    {
      id: 2,
      title: "Pediatric Advanced Life Support",
      date: "Jan 10, 2026",
      credits: 6,
      type: "Clinical",
      status: "approved",
      provider: "AHA",
      certificate: "#",
    },
    {
      id: 3,
      title: "Trauma Assessment & Management",
      date: "Jan 5, 2026",
      credits: 6,
      type: "Clinical",
      status: "approved",
      provider: "Internal",
      certificate: "#",
    },
    {
      id: 4,
      title: "Leadership in EMS",
      date: "Dec 20, 2025",
      credits: 4,
      type: "Leadership",
      status: "approved",
      provider: "NAEMT",
      certificate: "#",
    },
    {
      id: 5,
      title: "Hazmat Operations",
      date: "Dec 15, 2025",
      credits: 8,
      type: "Operations",
      status: "pending",
      provider: "External",
      certificate: null,
    },
  ];

  const monthlyProgress = [
    { month: "Aug", credits: 6 },
    { month: "Sep", credits: 8 },
    { month: "Oct", credits: 4 },
    { month: "Nov", credits: 10 },
    { month: "Dec", credits: 12 },
    { month: "Jan", credits: 14 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-400 bg-emerald-500/20";
      case "expiring-soon":
        return "text-orange-400 bg-orange-500/20";
      case "expired":
        return "text-red-400 bg-red-500/20";
      case "approved":
        return "text-emerald-400 bg-emerald-500/20";
      case "pending":
        return "text-yellow-400 bg-yellow-500/20";
      default:
        return "text-slate-400 bg-slate-500/20";
    }
  };

  const getCertStatus = (daysLeft: number) => {
    if (daysLeft > 180) return { status: "active", color: "emerald" };
    if (daysLeft > 90) return { status: "expiring-soon", color: "orange" };
    return { status: "expired", color: "red" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              CE/CME Tracker
            </h1>
            <p className="text-slate-400 mt-2">Manage continuing education and certifications</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            <Upload size={18} />
            Upload CE
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6"
          >
            <Award className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">74</div>
            <p className="text-blue-100 text-sm">Total CE Credits</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6"
          >
            <CheckCircle className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">60/60</div>
            <p className="text-emerald-100 text-sm">Required Met</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6"
          >
            <Calendar className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">698</div>
            <p className="text-purple-100 text-sm">Days to Renewal</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6"
          >
            <AlertTriangle className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">0</div>
            <p className="text-orange-100 text-sm">Expiring Soon</p>
          </motion.div>
        </div>

        {/* CE Balance & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CE Balance Donut */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <PieChartIcon size={24} />
              <h2 className="text-2xl font-bold">CE Balance by Category</h2>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-64 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ceBalance}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="earned"
                    >
                      {ceBalance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E293B",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {ceBalance.map((category, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {category.earned}/{category.required}
                    </div>
                    <div className="text-xs text-slate-400">
                      +{category.earned - category.required} extra
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Monthly Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={24} />
              <h2 className="text-2xl font-bold">CE Activity Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="credits" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Award size={24} />
            <h2 className="text-2xl font-bold">Certifications</h2>
          </div>
          <div className="space-y-4">
            {certifications.map((cert, idx) => {
              const status = getCertStatus(cert.daysUntilExpiry);
              return (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="bg-slate-800/50 rounded-xl p-6 border-l-4"
                  style={{ borderLeftColor: status.color === "emerald" ? "#10B981" : status.color === "orange" ? "#F59E0B" : "#EF4444" }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-1">{cert.name}</h3>
                      <p className="text-sm text-slate-400">{cert.issuer}</p>
                      <p className="text-xs text-slate-500 mt-1">#{cert.number}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                      {status.status.replace("-", " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-slate-400">Issued</div>
                      <div className="font-semibold">{cert.issued}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Expires</div>
                      <div className="font-semibold">{cert.expires}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Days Left</div>
                      <div className="font-semibold">{cert.daysUntilExpiry}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">CE Progress</div>
                      <div className="font-semibold text-emerald-400">
                        {cert.currentCE}/{cert.renewalCE}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(cert.currentCE / cert.renewalCE) * 100}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CE Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <FileText size={24} />
              <h2 className="text-2xl font-bold">CE Activity Log</h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              <Download size={18} />
              Download Transcript
            </motion.button>
          </div>
          <div className="space-y-3">
            {ceActivity.map((activity, idx) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + idx * 0.05 }}
                className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{activity.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div>{activity.date}</div>
                    <div>•</div>
                    <div>{activity.provider}</div>
                    <div>•</div>
                    <div className="bg-slate-700 px-2 py-0.5 rounded">{activity.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-400">{activity.credits}</div>
                    <div className="text-xs text-slate-400">CE Credits</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                  {activity.certificate && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Download size={20} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
