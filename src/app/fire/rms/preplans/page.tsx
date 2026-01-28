"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  FileText, Search, Plus, MapPin, AlertTriangle, Image,
  Layers, Navigation, Users, Phone, Activity, Flame, Building2
} from "lucide-react";

type PrePlan = {
  id: number;
  building_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  occupancy_type: string;
  risk_score: number;
  has_hazmat: boolean;
  has_floor_plan: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  last_updated: string;
};

export default function PrePlans() {
  const [preplans, setPreplans] = useState<PrePlan[]>([]);
  const [selected, setSelected] = useState<PrePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPreplans();
  }, []);

  const loadPreplans = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ preplans: PrePlan[] }>("/fire/rms/preplans");
      setPreplans(data.preplans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 7) return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "High Risk" };
    if (score >= 4) return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Medium Risk" };
    return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", label: "Low Risk" };
  };

  const filteredPreplans = preplans.filter(p =>
    p.building_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-emerald-600/10 to-green-600/10" />
        <div className="relative px-6 py-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Pre-Incident Plans</h1>
                <p className="text-gray-400 text-sm">Target hazard identification & tactical planning</p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg">
              <Plus className="w-5 h-5" />
              New Pre-Plan
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Plans", value: preplans.length, gradient: "from-green-600 to-emerald-600" },
            { label: "High Risk", value: preplans.filter(p => p.risk_score >= 7).length, gradient: "from-red-600 to-rose-600" },
            { label: "Hazmat Sites", value: preplans.filter(p => p.has_hazmat).length, gradient: "from-amber-600 to-orange-600" },
            { label: "With Floor Plans", value: preplans.filter(p => p.has_floor_plan).length, gradient: "from-blue-600 to-cyan-600" },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}>
              <div className={`bg-gradient-to-br ${stat.gradient} p-[1px] rounded-2xl`}>
                <div className="bg-gray-900 rounded-2xl p-5">
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search pre-plans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors" />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 col-span-2">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading pre-plans...
            </div>
          ) : filteredPreplans.length === 0 ? (
            <div className="text-center py-12 text-gray-400 col-span-2">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No pre-plans found
            </div>
          ) : (
            filteredPreplans.map((preplan, idx) => {
              const riskConfig = getRiskColor(preplan.risk_score);
              
              return (
                <motion.div key={preplan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }} whileHover={{ scale: 1.01, y: -2 }} onClick={() => setSelected(preplan)}
                  className={`bg-gray-900/50 backdrop-blur-xl border rounded-2xl p-5 cursor-pointer transition-all ${
                    selected?.id === preplan.id ? "border-green-500 shadow-lg shadow-green-500/20" : "border-gray-800 hover:border-gray-700"
                  }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Building2 className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{preplan.building_name}</div>
                        <div className="text-sm text-gray-400">{preplan.address}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 ${riskConfig.bg} ${riskConfig.border} border rounded-full`}>
                      <Flame className={`w-4 h-4 ${riskConfig.color}`} />
                      <span className={`text-sm font-medium ${riskConfig.color}`}>{riskConfig.label}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-gray-800/50 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">Occupancy Type</div>
                      <div className="text-sm font-semibold text-white">{preplan.occupancy_type}</div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">Risk Score</div>
                      <div className={`text-2xl font-bold ${riskConfig.color}`}>{preplan.risk_score}/10</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {preplan.has_hazmat && (
                      <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Hazmat
                      </span>
                    )}
                    {preplan.has_floor_plan && (
                      <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Floor Plans
                      </span>
                    )}
                    {preplan.contact_name && (
                      <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Contact Available
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {preplan.latitude && preplan.longitude && (
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors">
                        <Navigation className="w-4 h-4" />
                        Navigate
                      </button>
                    )}
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-sm transition-colors">
                      <FileText className="w-4 h-4" />
                      View Plan
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
