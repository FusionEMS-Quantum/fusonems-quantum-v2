"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Zap,
  BookOpen,
} from "lucide-react";

export default function CompetenciesMatrix() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Skills", count: 48 },
    { id: "clinical", name: "Clinical", count: 18 },
    { id: "operations", name: "Operations", count: 12 },
    { id: "equipment", name: "Equipment", count: 10 },
    { id: "communication", name: "Communication", count: 8 },
  ];

  const skills = [
    {
      id: 1,
      name: "Endotracheal Intubation",
      category: "clinical",
      proficiency: 95,
      level: "expert",
      lastPerformed: "2 days ago",
      timesPerformed: 156,
      certExpiry: "Jun 2026",
      decayWarning: false,
      recertDue: false,
    },
    {
      id: 2,
      name: "IV Therapy",
      category: "clinical",
      proficiency: 92,
      level: "expert",
      lastPerformed: "Yesterday",
      timesPerformed: 342,
      certExpiry: "May 2026",
      decayWarning: false,
      recertDue: false,
    },
    {
      id: 3,
      name: "12-Lead EKG Interpretation",
      category: "clinical",
      proficiency: 88,
      level: "advanced",
      lastPerformed: "1 week ago",
      timesPerformed: 234,
      certExpiry: "Aug 2026",
      decayWarning: false,
      recertDue: false,
    },
    {
      id: 4,
      name: "Pediatric Assessment",
      category: "clinical",
      proficiency: 85,
      level: "advanced",
      lastPerformed: "3 days ago",
      timesPerformed: 98,
      certExpiry: "Mar 2026",
      decayWarning: false,
      recertDue: true,
    },
    {
      id: 5,
      name: "Surgical Cricothyrotomy",
      category: "clinical",
      proficiency: 72,
      level: "intermediate",
      lastPerformed: "4 months ago",
      timesPerformed: 8,
      certExpiry: "Sep 2026",
      decayWarning: true,
      recertDue: false,
    },
    {
      id: 6,
      name: "Incident Command System",
      category: "operations",
      proficiency: 90,
      level: "advanced",
      lastPerformed: "1 week ago",
      timesPerformed: 45,
      certExpiry: "Dec 2026",
      decayWarning: false,
      recertDue: false,
    },
    {
      id: 7,
      name: "Hazmat Operations",
      category: "operations",
      proficiency: 78,
      level: "intermediate",
      lastPerformed: "2 months ago",
      timesPerformed: 23,
      certExpiry: "Jul 2026",
      decayWarning: true,
      recertDue: false,
    },
    {
      id: 8,
      name: "Vehicle Extrication",
      category: "operations",
      proficiency: 82,
      level: "advanced",
      lastPerformed: "3 weeks ago",
      timesPerformed: 67,
      certExpiry: "Nov 2026",
      decayWarning: false,
      recertDue: false,
    },
    {
      id: 9,
      name: "Ventilator Management",
      category: "equipment",
      proficiency: 88,
      level: "advanced",
      lastPerformed: "1 week ago",
      timesPerformed: 134,
      certExpiry: "Apr 2026",
      decayWarning: false,
      recertDue: true,
    },
    {
      id: 10,
      name: "Lucas Device",
      category: "equipment",
      proficiency: 95,
      level: "expert",
      lastPerformed: "5 days ago",
      timesPerformed: 89,
      certExpiry: "Oct 2026",
      decayWarning: false,
      recertDue: false,
    },
    {
      id: 11,
      name: "Radio Communications",
      category: "communication",
      proficiency: 93,
      level: "expert",
      lastPerformed: "Yesterday",
      timesPerformed: 567,
      certExpiry: "N/A",
      decayWarning: false,
      recertDue: false,
    },
    {
      id: 12,
      name: "Crisis Communication",
      category: "communication",
      proficiency: 86,
      level: "advanced",
      lastPerformed: "4 days ago",
      timesPerformed: 234,
      certExpiry: "N/A",
      decayWarning: false,
      recertDue: false,
    },
  ];

  const getProficiencyColor = (proficiency: number) => {
    if (proficiency >= 90) return { bg: "bg-emerald-500", text: "text-emerald-400" };
    if (proficiency >= 75) return { bg: "bg-blue-500", text: "text-blue-400" };
    if (proficiency >= 60) return { bg: "bg-yellow-500", text: "text-yellow-400" };
    return { bg: "bg-red-500", text: "text-red-400" };
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "expert":
        return "bg-purple-500/20 text-purple-400";
      case "advanced":
        return "bg-blue-500/20 text-blue-400";
      case "intermediate":
        return "bg-yellow-500/20 text-yellow-400";
      case "beginner":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const filteredSkills =
    selectedCategory === "all"
      ? skills
      : skills.filter((s) => s.category === selectedCategory);

  const stats = {
    totalSkills: skills.length,
    expertSkills: skills.filter((s) => s.level === "expert").length,
    needsRecert: skills.filter((s) => s.recertDue).length,
    decayWarnings: skills.filter((s) => s.decayWarning).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Skills Competency Matrix
          </h1>
          <p className="text-slate-400 mt-2">Track proficiency, decay, and recertification</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6"
          >
            <Target className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">{stats.totalSkills}</div>
            <p className="text-blue-100 text-sm">Total Skills</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6"
          >
            <Award className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">{stats.expertSkills}</div>
            <p className="text-purple-100 text-sm">Expert Level</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6"
          >
            <AlertTriangle className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">{stats.decayWarnings}</div>
            <p className="text-orange-100 text-sm">Decay Warnings</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6"
          >
            <Clock className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">{stats.needsRecert}</div>
            <p className="text-red-100 text-sm">Recert Needed</p>
          </motion.div>
        </div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-3"
        >
          {categories.map((category, idx) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + idx * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedCategory === category.id
                  ? "bg-gradient-to-r from-blue-600 to-emerald-600 shadow-lg shadow-blue-500/50"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {category.name}
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {category.count}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Skills Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Skills Matrix</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-slate-400">90-100%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-slate-400">75-89%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-slate-400">60-74%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-slate-400">&lt;60%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredSkills.map((skill, idx) => {
              const colors = getProficiencyColor(skill.proficiency);
              return (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.05 }}
                  className={`bg-slate-800/50 rounded-xl p-6 border-l-4 ${
                    skill.decayWarning
                      ? "border-orange-500"
                      : skill.recertDue
                      ? "border-red-500"
                      : "border-slate-700"
                  } hover:bg-slate-800 transition-all`}
                >
                  <div className="flex items-start gap-6">
                    {/* Proficiency Circle */}
                    <div className="relative flex-shrink-0">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#1E293B"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={colors.bg.replace("bg-", "")}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${
                            2 * Math.PI * 40 * (1 - skill.proficiency / 100)
                          }`}
                          strokeLinecap="round"
                          className={colors.bg}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${colors.text}`}>
                            {skill.proficiency}
                          </div>
                          <div className="text-xs text-slate-400">%</div>
                        </div>
                      </div>
                    </div>

                    {/* Skill Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-bold mb-1">{skill.name}</h3>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-medium ${getLevelBadge(
                                skill.level
                              )}`}
                            >
                              {skill.level}
                            </span>
                            <span className="text-sm text-slate-400">
                              {skill.category}
                            </span>
                          </div>
                        </div>
                        {skill.decayWarning && (
                          <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Skill Decay
                          </div>
                        )}
                        {skill.recertDue && (
                          <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                            <Clock size={12} />
                            Recert Due
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <div className="text-slate-400">Last Performed</div>
                          <div className="font-semibold">{skill.lastPerformed}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Times Performed</div>
                          <div className="font-semibold">{skill.timesPerformed}x</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Cert Expiry</div>
                          <div className="font-semibold">{skill.certExpiry}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Proficiency Level</div>
                          <div className={`font-semibold ${colors.text}`}>
                            {skill.level}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {skill.decayWarning && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <Zap size={14} />
                            Practice Now
                          </motion.button>
                        )}
                        {skill.recertDue && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <BookOpen size={14} />
                            Recertify
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          View History
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={24} />
            <h2 className="text-2xl font-bold">Training Recommendations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-6"
            >
              <AlertTriangle className="text-orange-400 mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Skill Decay Alert</h3>
              <p className="text-sm text-slate-400 mb-4">
                Surgical Cricothyrotomy hasn't been performed in 4 months. Practice recommended.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-orange-600 hover:bg-orange-500 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Schedule Practice
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-red-500/10 border border-red-500/50 rounded-xl p-6"
            >
              <Clock className="text-red-400 mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Recertification Due</h3>
              <p className="text-sm text-slate-400 mb-4">
                2 skills require recertification within 60 days. Don't let them expire!
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-red-600 hover:bg-red-500 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View Courses
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-6"
            >
              <CheckCircle className="text-emerald-400 mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Gap Analysis</h3>
              <p className="text-sm text-slate-400 mb-4">
                Strengthen intermediate skills to reach expert level faster. 3 skills identified.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View Plan
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
