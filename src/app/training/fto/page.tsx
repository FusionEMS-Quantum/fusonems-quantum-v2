"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Award,
  Target,
  Clock,
  BarChart3,
} from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function FTOProgram() {
  const [viewMode, setViewMode] = useState<"fto" | "trainee">("fto");

  const trainees = [
    {
      id: 1,
      name: "Alex Johnson",
      avatar: "AJ",
      phase: 2,
      totalPhases: 4,
      progress: 45,
      startDate: "Dec 15, 2025",
      daysInProgram: 44,
      fto: "Mike Rodriguez",
      nextEvaluation: "Tomorrow",
      status: "on-track",
      strengths: ["Patient Assessment", "Communication"],
      needsWork: ["Medication Administration"],
    },
    {
      id: 2,
      name: "Sarah Chen",
      avatar: "SC",
      phase: 3,
      totalPhases: 4,
      progress: 72,
      startDate: "Nov 1, 2025",
      daysInProgram: 88,
      fto: "Dr. Sarah Mitchell",
      nextEvaluation: "3 days",
      status: "exceeding",
      strengths: ["Clinical Skills", "Leadership", "Decision Making"],
      needsWork: [],
    },
    {
      id: 3,
      name: "Marcus Williams",
      avatar: "MW",
      phase: 1,
      totalPhases: 4,
      progress: 28,
      startDate: "Jan 5, 2026",
      daysInProgram: 23,
      fto: "Lt. Amy Chen",
      nextEvaluation: "Today",
      status: "needs-attention",
      strengths: ["Willingness to Learn"],
      needsWork: ["Time Management", "Documentation", "Protocols"],
    },
  ];

  const competencyCategories = [
    { category: "Patient Assessment", score: 85 },
    { category: "Clinical Skills", score: 78 },
    { category: "Communication", score: 92 },
    { category: "Documentation", score: 88 },
    { category: "Decision Making", score: 75 },
    { category: "Professionalism", score: 95 },
  ];

  const phaseProgress = [
    { phase: "Phase 1", target: 100, actual: 100 },
    { phase: "Phase 2", target: 100, actual: 85 },
    { phase: "Phase 3", target: 100, actual: 45 },
    { phase: "Phase 4", target: 100, actual: 0 },
  ];

  const dailyEvaluations = [
    {
      id: 1,
      date: "Jan 27, 2026",
      shift: "Day Shift",
      calls: 8,
      rating: "Meets Expectations",
      fto: "Mike Rodriguez",
      comments: "Strong performance on cardiac calls. Continue practicing IV starts.",
    },
    {
      id: 2,
      date: "Jan 26, 2026",
      shift: "Night Shift",
      calls: 5,
      rating: "Exceeds Expectations",
      fto: "Mike Rodriguez",
      comments: "Excellent leadership on trauma call. Patient assessment outstanding.",
    },
    {
      id: 3,
      date: "Jan 25, 2026",
      shift: "Day Shift",
      calls: 6,
      rating: "Meets Expectations",
      fto: "Lt. Amy Chen",
      comments: "Good progress. Work on documentation speed and accuracy.",
    },
  ];

  const skillCheckoffs = [
    { skill: "Vital Signs Assessment", status: "completed", signedBy: "M. Rodriguez", date: "Jan 20" },
    { skill: "IV Therapy", status: "completed", signedBy: "M. Rodriguez", date: "Jan 22" },
    { skill: "Advanced Airway Management", status: "in-progress", signedBy: null, date: null },
    { skill: "Cardiac Monitoring", status: "completed", signedBy: "M. Rodriguez", date: "Jan 24" },
    { skill: "Medication Administration", status: "in-progress", signedBy: null, date: null },
    { skill: "Trauma Assessment", status: "not-started", signedBy: null, date: null },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track":
      case "completed":
        return "text-emerald-400 bg-emerald-500/20";
      case "exceeding":
        return "text-blue-400 bg-blue-500/20";
      case "needs-attention":
      case "in-progress":
        return "text-yellow-400 bg-yellow-500/20";
      case "not-started":
        return "text-slate-400 bg-slate-500/20";
      default:
        return "text-slate-400 bg-slate-500/20";
    }
  };

  const getRatingColor = (rating: string) => {
    if (rating.includes("Exceeds")) return "text-blue-400";
    if (rating.includes("Meets")) return "text-emerald-400";
    return "text-yellow-400";
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
              FTO Program
            </h1>
            <p className="text-slate-400 mt-2">Field Training Officer dashboard and trainee tracking</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("fto")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                viewMode === "fto"
                  ? "bg-gradient-to-r from-blue-600 to-emerald-600"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              FTO View
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("trainee")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                viewMode === "trainee"
                  ? "bg-gradient-to-r from-blue-600 to-emerald-600"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              My Progress
            </motion.button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6"
          >
            <Users className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">{trainees.length}</div>
            <p className="text-blue-100 text-sm">Active Trainees</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6"
          >
            <TrendingUp className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">82%</div>
            <p className="text-emerald-100 text-sm">Avg Progress</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6"
          >
            <Calendar className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">52</div>
            <p className="text-purple-100 text-sm">Avg Days</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6"
          >
            <Award className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">12</div>
            <p className="text-orange-100 text-sm">Graduated (6mo)</p>
          </motion.div>
        </div>

        {viewMode === "fto" ? (
          <>
            {/* Trainees Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Users size={24} />
                <h2 className="text-2xl font-bold">My Trainees</h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {trainees.map((trainee, idx) => (
                  <motion.div
                    key={trainee.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-start gap-6">
                      {/* Avatar */}
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                        {trainee.avatar}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-2xl font-bold mb-1">{trainee.name}</h3>
                            <p className="text-slate-400">
                              Phase {trainee.phase} of {trainee.totalPhases}
                            </p>
                          </div>
                          <span
                            className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                              trainee.status
                            )}`}
                          >
                            {trainee.status.replace("-", " ")}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Overall Progress</span>
                            <span className="font-semibold text-blue-400">{trainee.progress}%</span>
                          </div>
                          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${trainee.progress}%` }}
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <div className="text-slate-400">Start Date</div>
                            <div className="font-semibold">{trainee.startDate}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Days in Program</div>
                            <div className="font-semibold">{trainee.daysInProgram}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Next Eval</div>
                            <div className="font-semibold text-orange-400">{trainee.nextEvaluation}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Primary FTO</div>
                            <div className="font-semibold">{trainee.fto}</div>
                          </div>
                        </div>

                        {/* Strengths & Needs Work */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-emerald-400 font-medium mb-2">Strengths</div>
                            <div className="flex flex-wrap gap-2">
                              {trainee.strengths.map((strength) => (
                                <span
                                  key={strength}
                                  className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs"
                                >
                                  {strength}
                                </span>
                              ))}
                            </div>
                          </div>
                          {trainee.needsWork.length > 0 && (
                            <div>
                              <div className="text-sm text-yellow-400 font-medium mb-2">Needs Work</div>
                              <div className="flex flex-wrap gap-2">
                                {trainee.needsWork.map((need) => (
                                  <span
                                    key={need}
                                    className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-xs"
                                  >
                                    {need}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 py-3 rounded-xl font-semibold"
                          >
                            Daily Evaluation
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition-colors"
                          >
                            View Full Profile
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        ) : (
          <>
            {/* Trainee View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Competency Radar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Target size={24} />
                  <h2 className="text-2xl font-bold">Competency Assessment</h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={competencyCategories}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="category" stroke="#94A3B8" />
                    <PolarRadiusAxis stroke="#94A3B8" domain={[0, 100]} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Phase Progress */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 size={24} />
                  <h2 className="text-2xl font-bold">Phase Progress</h2>
                </div>
                <div className="space-y-4">
                  {phaseProgress.map((phase, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{phase.phase}</span>
                        <span className="text-slate-400">
                          {phase.actual}% / {phase.target}%
                        </span>
                      </div>
                      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${phase.actual}%` }}
                          className={`h-full ${
                            phase.actual === phase.target
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-blue-500 to-emerald-500"
                          }`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Daily Evaluations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <FileText size={24} />
                <h2 className="text-2xl font-bold">Recent Evaluations</h2>
              </div>
              <div className="space-y-4">
                {dailyEvaluations.map((evaluation, idx) => (
                  <motion.div
                    key={evaluation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + idx * 0.1 }}
                    className="bg-slate-800/50 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold mb-1">{evaluation.date}</h3>
                        <p className="text-sm text-slate-400">{evaluation.shift} • {evaluation.calls} calls</p>
                      </div>
                      <span className={`font-semibold ${getRatingColor(evaluation.rating)}`}>
                        {evaluation.rating}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{evaluation.comments}</p>
                    <div className="text-xs text-slate-500">FTO: {evaluation.fto}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Skill Checkoffs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle size={24} />
                <h2 className="text-2xl font-bold">Skill Checkoffs</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skillCheckoffs.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 + idx * 0.05 }}
                    className="bg-slate-800/50 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{skill.skill}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          skill.status
                        )}`}
                      >
                        {skill.status.replace("-", " ")}
                      </span>
                    </div>
                    {skill.status === "completed" && (
                      <div className="text-sm text-slate-400">
                        <div>Signed: {skill.date}</div>
                        <div>By: {skill.signedBy}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
