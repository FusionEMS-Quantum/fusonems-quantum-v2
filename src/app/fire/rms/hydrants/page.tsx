"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  MapPin, Droplets, Search, Filter, Plus, Calendar,
  Navigation, CheckCircle, AlertTriangle, XCircle, Gauge,
  TrendingUp, Clock, Map as MapIcon, List, Activity
} from "lucide-react";

type Hydrant = {
  id: number;
  hydrant_number: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hydrant_type: string | null;
  flow_capacity_gpm: number | null;
  static_pressure_psi: number | null;
  status: string | null;
  last_inspection_date: string | null;
  next_inspection_due: string | null;
};

type HydrantInspection = {
  id: number;
  inspection_date: string;
  flow_gpm: number | null;
  static_pressure_psi: number | null;
  valve_operational: boolean;
  deficiencies_found: string | null;
  status: string;
};

export default function HydrantManagement() {
  const [hydrants, setHydrants] = useState<Hydrant[]>([]);
  const [selectedHydrant, setSelectedHydrant] = useState<Hydrant | null>(null);
  const [inspections, setInspections] = useState<HydrantInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");
  const [filter, setFilter] = useState<"all" | "operational" | "needs_repair" | "out_of_service">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);

  useEffect(() => {
    loadHydrants();
  }, [filter]);

  const loadHydrants = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const data = await apiFetch<{ hydrants: Hydrant[] }>(`/fire/rms/hydrants${params}`);
      setHydrants(data.hydrants || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInspections = async (hydrantId: number) => {
    try {
      const data = await apiFetch<{ inspections: HydrantInspection[] }>(`/fire/rms/hydrants/${hydrantId}/inspections`);
      setInspections(data.inspections || []);
    } catch (err) {
      console.error(err);
    }
  };

  const selectHydrant = (hydrant: Hydrant) => {
    setSelectedHydrant(hydrant);
    loadInspections(hydrant.id);
  };

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case "operational":
        return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle, label: "Operational" };
      case "needs_repair":
        return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle, label: "Needs Repair" };
      case "out_of_service":
        return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle, label: "Out of Service" };
      default:
        return { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", icon: Activity, label: "Unknown" };
    }
  };

  const getFlowRating = (gpm: number | null) => {
    if (!gpm) return { label: "Unknown", color: "text-gray-400", bg: "bg-gray-500/10" };
    if (gpm >= 1500) return { label: "Excellent", color: "text-green-400", bg: "bg-green-500/10" };
    if (gpm >= 1000) return { label: "Good", color: "text-blue-400", bg: "bg-blue-500/10" };
    if (gpm >= 500) return { label: "Fair", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { label: "Poor", color: "text-red-400", bg: "bg-red-500/10" };
  };

  const filteredHydrants = hydrants.filter(h =>
    h.hydrant_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: hydrants.length,
    operational: hydrants.filter(h => h.status === "operational").length,
    needsRepair: hydrants.filter(h => h.status === "needs_repair").length,
    outOfService: hydrants.filter(h => h.status === "out_of_service").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-600/10 to-blue-600/10" />
        <div className="relative px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <Droplets className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Hydrant Management</h1>
                <p className="text-gray-400 text-sm">Flow testing, inspections & maintenance tracking</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Hydrant
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: "Total Hydrants", value: stats.total, icon: Droplets, gradient: "from-blue-600 to-cyan-600" },
            { label: "Operational", value: stats.operational, icon: CheckCircle, gradient: "from-green-600 to-emerald-600" },
            { label: "Needs Repair", value: stats.needsRepair, icon: AlertTriangle, gradient: "from-amber-600 to-orange-600" },
            { label: "Out of Service", value: stats.outOfService, icon: XCircle, gradient: "from-red-600 to-rose-600" },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="relative group"
            >
              <div className={`bg-gradient-to-br ${stat.gradient} p-[1px] rounded-2xl`}>
                <div className="bg-gray-900 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <stat.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
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
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search hydrants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="operational">Operational</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 p-1 bg-gray-800 rounded-xl">
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView("map")}
                className={`p-2 rounded-lg transition-all ${view === "map" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <MapIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Hydrant List */}
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
                  Loading hydrants...
                </div>
              ) : filteredHydrants.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Droplets className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No hydrants found
                </div>
              ) : (
                <AnimatePresence>
                  {filteredHydrants.map((hydrant, idx) => {
                    const statusConfig = getStatusConfig(hydrant.status);
                    const flowRating = getFlowRating(hydrant.flow_capacity_gpm);

                    return (
                      <motion.div
                        key={hydrant.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.01, y: -2 }}
                        onClick={() => selectHydrant(hydrant)}
                        className={`bg-gray-900/50 backdrop-blur-xl border rounded-2xl p-5 cursor-pointer transition-all ${
                          selectedHydrant?.id === hydrant.id
                            ? "border-blue-500 shadow-lg shadow-blue-500/20"
                            : "border-gray-800 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <MapPin className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-lg">{hydrant.hydrant_number}</div>
                              <div className="text-sm text-gray-400">{hydrant.address}</div>
                            </div>
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-1 ${statusConfig.bg} ${statusConfig.border} border rounded-full`}>
                            <statusConfig.icon className={`w-4 h-4 ${statusConfig.color}`} />
                            <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          {hydrant.flow_capacity_gpm && (
                            <div className={`p-3 ${flowRating.bg} rounded-xl`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Gauge className={`w-4 h-4 ${flowRating.color}`} />
                                <span className="text-xs text-gray-400">Flow Rate</span>
                              </div>
                              <div className={`text-lg font-bold ${flowRating.color}`}>{hydrant.flow_capacity_gpm} GPM</div>
                              <div className="text-xs text-gray-500">{flowRating.label}</div>
                            </div>
                          )}
                          {hydrant.static_pressure_psi && (
                            <div className="p-3 bg-gray-800/50 rounded-xl">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-purple-400" />
                                <span className="text-xs text-gray-400">Pressure</span>
                              </div>
                              <div className="text-lg font-bold text-purple-400">{hydrant.static_pressure_psi} PSI</div>
                            </div>
                          )}
                          {hydrant.next_inspection_due && (
                            <div className="p-3 bg-gray-800/50 rounded-xl">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs text-gray-400">Next Due</span>
                              </div>
                              <div className="text-sm font-semibold text-cyan-400">
                                {new Date(hydrant.next_inspection_due).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </div>

                        {hydrant.latitude && hydrant.longitude && (
                          <button className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors">
                            <Navigation className="w-4 h-4" />
                            Navigate to Hydrant
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          {/* Details Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1"
          >
            {selectedHydrant ? (
              <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 sticky top-6">
                <h3 className="text-xl font-bold text-white mb-4">Inspection History</h3>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowInspectionForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold mb-4 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  New Inspection
                </motion.button>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {inspections.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">No inspections yet</div>
                    </div>
                  ) : (
                    inspections.map((inspection) => (
                      <motion.div
                        key={inspection.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-white">
                            {new Date(inspection.inspection_date).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inspection.status === "passed" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            {inspection.status.toUpperCase()}
                          </span>
                        </div>
                        {inspection.flow_gpm && (
                          <div className="text-sm text-gray-400 mb-1">Flow: <span className="text-white font-medium">{inspection.flow_gpm} GPM</span></div>
                        )}
                        {inspection.static_pressure_psi && (
                          <div className="text-sm text-gray-400 mb-1">Pressure: <span className="text-white font-medium">{inspection.static_pressure_psi} PSI</span></div>
                        )}
                        <div className="text-sm text-gray-400">
                          Valve: <span className={inspection.valve_operational ? "text-green-400" : "text-red-400"}>
                            {inspection.valve_operational ? "Operational" : "Issues"}
                          </span>
                        </div>
                        {inspection.deficiencies_found && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                            {inspection.deficiencies_found}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-12 text-center">
                <Droplets className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400">Select a hydrant to view details</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
