"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  Truck, Search, Plus, Calendar, Wrench, CheckCircle,
  AlertTriangle, XCircle, Activity, Gauge, Clock, FileText
} from "lucide-react";

type Apparatus = {
  id: number;
  unit_number: string;
  apparatus_type: string;
  make: string;
  model: string;
  year: number;
  status: "in_service" | "out_of_service" | "maintenance";
  mileage: number;
  last_pump_test: string | null;
  next_pm_due: string | null;
  deficiencies: number;
};

export default function ApparatusManagement() {
  const [apparatus, setApparatus] = useState<Apparatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "in_service" | "out_of_service" | "maintenance">("all");

  useEffect(() => {
    loadApparatus();
  }, [filter]);

  const loadApparatus = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const data = await apiFetch<{ apparatus: Apparatus[] }>(`/fire/rms/apparatus${params}`);
      setApparatus(data.apparatus || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "in_service":
        return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle, label: "In Service" };
      case "out_of_service":
        return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle, label: "Out of Service" };
      case "maintenance":
        return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Wrench, label: "Maintenance" };
      default:
        return { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", icon: Activity, label: "Unknown" };
    }
  };

  const stats = {
    total: apparatus.length,
    inService: apparatus.filter(a => a.status === "in_service").length,
    outOfService: apparatus.filter(a => a.status === "out_of_service").length,
    maintenance: apparatus.filter(a => a.status === "maintenance").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-600/10 to-orange-600/10" />
        <div className="relative px-6 py-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Apparatus Management</h1>
                <p className="text-gray-400 text-sm">Fleet maintenance, pump tests & daily checks</p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold shadow-lg">
              <Plus className="w-5 h-5" />
              Daily Check
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Units", value: stats.total, icon: Truck, gradient: "from-orange-600 to-red-600" },
            { label: "In Service", value: stats.inService, icon: CheckCircle, gradient: "from-green-600 to-emerald-600" },
            { label: "Out of Service", value: stats.outOfService, icon: XCircle, gradient: "from-red-600 to-rose-600" },
            { label: "Maintenance", value: stats.maintenance, icon: Wrench, gradient: "from-amber-600 to-orange-600" },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}>
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

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 col-span-full">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading apparatus...
            </div>
          ) : apparatus.length === 0 ? (
            <div className="text-center py-12 text-gray-400 col-span-full">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No apparatus found
            </div>
          ) : (
            apparatus.map((unit, idx) => {
              const statusConfig = getStatusConfig(unit.status);

              return (
                <motion.div key={unit.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Truck className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{unit.unit_number}</div>
                        <div className="text-sm text-gray-400">{unit.apparatus_type}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 ${statusConfig.bg} ${statusConfig.border} border rounded-full`}>
                      <statusConfig.icon className={`w-4 h-4 ${statusConfig.color}`} />
                      <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Make/Model</span>
                      <span className="text-white font-medium">{unit.make} {unit.model}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Year</span>
                      <span className="text-white font-medium">{unit.year}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Mileage</span>
                      <span className="text-white font-medium">{unit.mileage.toLocaleString()} mi</span>
                    </div>
                  </div>

                  {unit.deficiencies > 0 && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400 font-medium">{unit.deficiencies} Deficienc{unit.deficiencies > 1 ? 'ies' : 'y'}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {unit.last_pump_test && (
                      <div className="p-2 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Gauge className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-gray-400">Last Pump Test</span>
                        </div>
                        <div className="text-xs font-semibold text-white">{new Date(unit.last_pump_test).toLocaleDateString()}</div>
                      </div>
                    )}
                    {unit.next_pm_due && (
                      <div className="p-2 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span className="text-xs text-gray-400">Next PM Due</span>
                        </div>
                        <div className="text-xs font-semibold text-white">{new Date(unit.next_pm_due).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800 flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl text-xs text-gray-300 transition-colors">
                      <FileText className="w-3 h-3" />
                      History
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl text-xs transition-colors">
                      <Wrench className="w-3 h-3" />
                      Service
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
