"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  Shield, Calendar, Users, Home, BookOpen, Heart,
  TrendingUp, Award, Clock, Plus, Activity, CheckCircle
} from "lucide-react";

type Program = {
  id: number;
  program_name: string;
  program_type: string;
  events_this_month: number;
  people_reached: number;
  smoke_alarms_installed: number;
  next_event_date: string | null;
};

export default function PreventionPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ programs: Program[] }>("/fire/rms/prevention");
      setPrograms(data.programs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalReached = programs.reduce((sum, p) => sum + p.people_reached, 0);
  const totalAlarmsInstalled = programs.reduce((sum, p) => sum + p.smoke_alarms_installed, 0);
  const totalEvents = programs.reduce((sum, p) => sum + p.events_this_month, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-teal-600/10 to-cyan-600/10" />
        <div className="relative px-6 py-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Community Risk Reduction</h1>
                <p className="text-gray-400 text-sm">Public education & fire prevention programs</p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-semibold shadow-lg">
              <Plus className="w-5 h-5" />
              New Event
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Programs", value: programs.length, icon: Shield, gradient: "from-cyan-600 to-teal-600" },
            { label: "Events This Month", value: totalEvents, icon: Calendar, gradient: "from-blue-600 to-cyan-600" },
            { label: "People Reached", value: totalReached, icon: Users, gradient: "from-purple-600 to-pink-600" },
            { label: "Smoke Alarms Installed", value: totalAlarmsInstalled, icon: CheckCircle, gradient: "from-green-600 to-emerald-600" },
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

        <div className="grid lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 col-span-2">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading programs...
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 col-span-2">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No programs found
            </div>
          ) : (
            programs.map((program, idx) => {
              const icons = {
                "smoke_alarm": Home,
                "public_education": BookOpen,
                "station_tour": Award,
                "cpr_training": Heart,
              };
              const ProgramIcon = icons[program.program_type as keyof typeof icons] || Shield;

              return (
                <motion.div key={program.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-cyan-500/10 rounded-xl">
                        <ProgramIcon className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{program.program_name}</div>
                        <div className="text-sm text-gray-400 capitalize">{program.program_type.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-gray-800/50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-cyan-400">{program.events_this_month}</div>
                      <div className="text-xs text-gray-400 mt-1">Events</div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-purple-400">{program.people_reached}</div>
                      <div className="text-xs text-gray-400 mt-1">Reached</div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-green-400">{program.smoke_alarms_installed}</div>
                      <div className="text-xs text-gray-400 mt-1">Alarms</div>
                    </div>
                  </div>

                  {program.next_event_date && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-xs text-gray-400">Next Event</div>
                        <div className="text-sm font-semibold text-white">{new Date(program.next_event_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Impact This Quarter</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold text-cyan-400">{totalEvents * 3}</div>
                  <div className="text-sm text-gray-400">Total Events</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400">{totalReached * 3}</div>
                  <div className="text-sm text-gray-400">Total Reached</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400">{totalAlarmsInstalled * 3}</div>
                  <div className="text-sm text-gray-400">Total Installs</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
