"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  ClipboardCheck, Search, Filter, Plus, Calendar, MapPin,
  AlertTriangle, CheckCircle, Clock, Camera, FileText,
  User, Building, XCircle, Upload, Eye, Activity
} from "lucide-react";

type Inspection = {
  id: number;
  inspection_number: string;
  property_address: string;
  property_type: string;
  inspection_date: string;
  inspector_name: string;
  status: "scheduled" | "passed" | "failed" | "reinspection_required";
  violations_count: number;
  next_inspection_due: string | null;
  occupancy_type: string | null;
};

type Violation = {
  id: number;
  code_section: string;
  description: string;
  severity: "minor" | "major" | "critical";
  photo_url: string | null;
  corrected: boolean;
  correction_date: string | null;
};

export default function FireInspections() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scheduled" | "passed" | "failed" | "reinspection_required">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    loadInspections();
  }, [filter]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const data = await apiFetch<{ inspections: Inspection[] }>(`/fire/rms/inspections${params}`);
      setInspections(data.inspections || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadViolations = async (inspectionId: number) => {
    try {
      const data = await apiFetch<{ violations: Violation[] }>(`/fire/rms/inspections/${inspectionId}/violations`);
      setViolations(data.violations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const selectInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    loadViolations(inspection.id);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "scheduled":
        return { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Calendar, label: "Scheduled" };
      case "passed":
        return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle, label: "Passed" };
      case "failed":
        return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle, label: "Failed" };
      case "reinspection_required":
        return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle, label: "Reinspection" };
      default:
        return { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", icon: Clock, label: "Unknown" };
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "Critical" };
      case "major":
        return { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "Major" };
      case "minor":
        return { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Minor" };
      default:
        return { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", label: "Unknown" };
    }
  };

  const filteredInspections = inspections.filter(i =>
    i.inspection_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.property_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: inspections.length,
    scheduled: inspections.filter(i => i.status === "scheduled").length,
    passed: inspections.filter(i => i.status === "passed").length,
    failed: inspections.filter(i => i.status === "failed").length,
    reinspection: inspections.filter(i => i.status === "reinspection_required").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-purple-600/10" />
        <div className="relative px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Fire Inspections</h1>
                <p className="text-gray-400 text-sm">Fire code compliance & violation tracking</p>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl font-semibold hover:border-purple-500 transition-all"
              >
                <Calendar className="w-5 h-5" />
                Calendar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                New Inspection
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {[
            { label: "Total", value: stats.total, icon: ClipboardCheck, gradient: "from-purple-600 to-pink-600" },
            { label: "Scheduled", value: stats.scheduled, icon: Calendar, gradient: "from-blue-600 to-cyan-600" },
            { label: "Passed", value: stats.passed, icon: CheckCircle, gradient: "from-green-600 to-emerald-600" },
            { label: "Failed", value: stats.failed, icon: XCircle, gradient: "from-red-600 to-rose-600" },
            { label: "Reinspection", value: stats.reinspection, icon: AlertTriangle, gradient: "from-amber-600 to-orange-600" },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className={`bg-gradient-to-br ${stat.gradient} p-[1px] rounded-2xl`}>
                <div className="bg-gray-900 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-4"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inspections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="reinspection_required">Reinspection Required</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Inspections List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-gray-400">
                  <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Loading inspections...
                </div>
              ) : filteredInspections.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No inspections found
                </div>
              ) : (
                <AnimatePresence>
                  {filteredInspections.map((inspection, idx) => {
                    const statusConfig = getStatusConfig(inspection.status);

                    return (
                      <motion.div
                        key={inspection.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.01, y: -2 }}
                        onClick={() => selectInspection(inspection)}
                        className={`bg-gray-900/50 backdrop-blur-xl border rounded-2xl p-5 cursor-pointer transition-all ${
                          selectedInspection?.id === inspection.id
                            ? "border-purple-500 shadow-lg shadow-purple-500/20"
                            : "border-gray-800 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                              <Building className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-lg">{inspection.inspection_number}</div>
                              <div className="text-sm text-gray-400">{inspection.property_address}</div>
                            </div>
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-1 ${statusConfig.bg} ${statusConfig.border} border rounded-full`}>
                            <statusConfig.icon className={`w-4 h-4 ${statusConfig.color}`} />
                            <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="p-3 bg-gray-800/50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-blue-400" />
                              <span className="text-xs text-gray-400">Date</span>
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {new Date(inspection.inspection_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="p-3 bg-gray-800/50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-green-400" />
                              <span className="text-xs text-gray-400">Inspector</span>
                            </div>
                            <div className="text-sm font-semibold text-white truncate">{inspection.inspector_name}</div>
                          </div>
                          <div className="p-3 bg-gray-800/50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span className="text-xs text-gray-400">Violations</span>
                            </div>
                            <div className="text-lg font-bold text-red-400">{inspection.violations_count}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Building className="w-4 h-4" />
                          <span>{inspection.property_type}</span>
                          {inspection.occupancy_type && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>{inspection.occupancy_type}</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          {/* Violations Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1"
          >
            {selectedInspection ? (
              <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 sticky top-6">
                <h3 className="text-xl font-bold text-white mb-4">Violations</h3>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold mb-4 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                  Add Photo
                </motion.button>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {violations.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <div className="text-sm">No violations found</div>
                    </div>
                  ) : (
                    violations.map((violation) => {
                      const severityConfig = getSeverityConfig(violation.severity);

                      return (
                        <motion.div
                          key={violation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-semibold text-white">{violation.code_section}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityConfig.bg} ${severityConfig.color} ${severityConfig.border} border`}>
                              {severityConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">{violation.description}</p>
                          
                          {violation.photo_url && (
                            <div className="mb-3 relative group">
                              <img
                                src={violation.photo_url}
                                alt="Violation"
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          )}

                          {violation.corrected ? (
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              <span>Corrected {violation.correction_date && `on ${new Date(violation.correction_date).toLocaleDateString()}`}</span>
                            </div>
                          ) : (
                            <button className="w-full px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors">
                              Mark as Corrected
                            </button>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors">
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-12 text-center">
                <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400">Select an inspection to view violations</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
