"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  Flame, Clock, DollarSign, AlertCircle, FileText, Camera,
  MapPin, Users, TrendingDown, Activity, Plus, Search, Filter
} from "lucide-react";

type Incident = {
  id: number;
  incident_number: string;
  incident_date: string;
  incident_type: string;
  address: string;
  property_loss: number | null;
  contents_loss: number | null;
  cause_determination: string | null;
  origin_area: string | null;
  injuries: number;
  fatalities: number;
  nfirs_complete: boolean;
};

export default function FireIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ incidents: Incident[] }>("/fire/rms/incidents");
      setIncidents(data.incidents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalLoss = incidents.reduce((sum, i) => sum + (i.property_loss || 0) + (i.contents_loss || 0), 0);
  const totalInjuries = incidents.reduce((sum, i) => sum + i.injuries, 0);
  const totalFatalities = incidents.reduce((sum, i) => sum + i.fatalities, 0);
  const nfirsComplete = incidents.filter(i => i.nfirs_complete).length;

  const filteredIncidents = incidents.filter(i =>
    i.incident_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-orange-600/10 to-red-600/10" />
        <div className="relative px-6 py-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Fire Incident Reporting</h1>
                <p className="text-gray-400 text-sm">NFIRS-compliant fire incident documentation</p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg">
              <Plus className="w-5 h-5" />
              New Incident
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Incidents", value: incidents.length, icon: Flame, gradient: "from-red-600 to-orange-600" },
            { label: "Total Loss", value: `$${(totalLoss / 1000).toFixed(0)}K`, icon: DollarSign, gradient: "from-amber-600 to-yellow-600" },
            { label: "Injuries", value: totalInjuries, icon: AlertCircle, gradient: "from-orange-600 to-red-600" },
            { label: "Fatalities", value: totalFatalities, icon: TrendingDown, gradient: "from-red-600 to-rose-600" },
            { label: "NFIRS Complete", value: nfirsComplete, icon: FileText, gradient: "from-green-600 to-emerald-600" },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search incidents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors" />
          </div>
        </motion.div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading incidents...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Flame className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No incidents found
            </div>
          ) : (
            filteredIncidents.map((incident, idx) => (
              <motion.div key={incident.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }} whileHover={{ scale: 1.01, y: -2 }}
                className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/10 rounded-xl">
                      <Flame className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{incident.incident_number}</div>
                      <div className="text-sm text-gray-400">{incident.incident_type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {incident.nfirs_complete ? (
                      <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium rounded-full">NFIRS Complete</span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium rounded-full">Incomplete</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Date/Time</span>
                    </div>
                    <div className="text-sm font-semibold text-white">{new Date(incident.incident_date).toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Location</span>
                    </div>
                    <div className="text-sm font-semibold text-white truncate">{incident.address}</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-gray-400">Total Loss</span>
                    </div>
                    <div className="text-lg font-bold text-amber-400">
                      ${((incident.property_loss || 0) + (incident.contents_loss || 0)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-gray-400">Casualties</span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {incident.injuries} Injured, {incident.fatalities} Fatalities
                    </div>
                  </div>
                </div>

                {incident.cause_determination && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-3">
                    <div className="text-xs text-gray-400 mb-1">Cause Determination</div>
                    <div className="text-sm font-semibold text-white">{incident.cause_determination}</div>
                    {incident.origin_area && <div className="text-xs text-gray-400 mt-1">Origin: {incident.origin_area}</div>}
                  </div>
                )}

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors">
                    <Camera className="w-4 h-4" />
                    Photos
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm transition-colors">
                    <FileText className="w-4 h-4" />
                    Generate NFIRS
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
