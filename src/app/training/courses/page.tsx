"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Star,
  Clock,
  Award,
  Users,
  TrendingUp,
  Zap,
  Heart,
  Play,
  CheckCircle,
  BookOpen,
} from "lucide-react";

export default function CourseCatalog() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "all", name: "All Courses", count: 156, icon: BookOpen },
    { id: "clinical", name: "Clinical", count: 64, icon: Heart },
    { id: "operations", name: "Operations", count: 38, icon: Zap },
    { id: "leadership", name: "Leadership", count: 28, icon: TrendingUp },
    { id: "safety", name: "Safety", count: 26, icon: Award },
  ];

  const courses = [
    {
      id: 1,
      title: "Advanced Cardiac Life Support (ACLS)",
      instructor: "Dr. Sarah Mitchell",
      category: "clinical",
      rating: 4.9,
      reviews: 2847,
      students: 12453,
      duration: "8 hours",
      ce: 8,
      difficulty: "Advanced",
      price: "Free",
      enrolled: false,
      progress: 0,
      thumbnail: "bg-gradient-to-br from-red-500 to-pink-600",
      tags: ["Cardiac", "Critical Care", "ACLS"],
      trending: true,
    },
    {
      id: 2,
      title: "Pediatric Advanced Life Support",
      instructor: "Dr. James Wilson",
      category: "clinical",
      rating: 4.8,
      reviews: 1923,
      students: 8934,
      duration: "6 hours",
      ce: 6,
      difficulty: "Advanced",
      price: "Free",
      enrolled: true,
      progress: 45,
      thumbnail: "bg-gradient-to-br from-blue-500 to-cyan-600",
      tags: ["Pediatric", "PALS", "Emergency"],
      trending: false,
    },
    {
      id: 3,
      title: "Tactical EMS Operations",
      instructor: "Lt. Mike Rodriguez",
      category: "operations",
      rating: 5.0,
      reviews: 1456,
      students: 5632,
      duration: "10 hours",
      ce: 10,
      difficulty: "Expert",
      price: "Free",
      enrolled: false,
      progress: 0,
      thumbnail: "bg-gradient-to-br from-slate-700 to-slate-900",
      tags: ["Tactical", "TEMS", "Special Operations"],
      trending: true,
    },
    {
      id: 4,
      title: "Leadership in EMS",
      instructor: "Chief Amy Chen",
      category: "leadership",
      rating: 4.9,
      reviews: 982,
      students: 4521,
      duration: "12 hours",
      ce: 12,
      difficulty: "Intermediate",
      price: "Free",
      enrolled: false,
      progress: 0,
      thumbnail: "bg-gradient-to-br from-purple-500 to-indigo-600",
      tags: ["Leadership", "Management", "Team Building"],
      trending: false,
    },
    {
      id: 5,
      title: "Hazmat Awareness & Operations",
      instructor: "Capt. John Davis",
      category: "safety",
      rating: 4.7,
      reviews: 756,
      students: 3892,
      duration: "8 hours",
      ce: 8,
      difficulty: "Intermediate",
      price: "Free",
      enrolled: true,
      progress: 68,
      thumbnail: "bg-gradient-to-br from-yellow-500 to-orange-600",
      tags: ["Hazmat", "Safety", "Operations"],
      trending: false,
    },
    {
      id: 6,
      title: "Trauma Assessment & Management",
      instructor: "Dr. Lisa Martinez",
      category: "clinical",
      rating: 4.9,
      reviews: 2134,
      students: 9876,
      duration: "6 hours",
      ce: 6,
      difficulty: "Advanced",
      price: "Free",
      enrolled: true,
      progress: 22,
      thumbnail: "bg-gradient-to-br from-emerald-500 to-teal-600",
      tags: ["Trauma", "Assessment", "Critical Care"],
      trending: true,
    },
  ];

  const filteredCourses =
    selectedCategory === "all"
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-500/20 text-green-400";
      case "Intermediate":
        return "bg-yellow-500/20 text-yellow-400";
      case "Advanced":
        return "bg-orange-500/20 text-orange-400";
      case "Expert":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Course Catalog
            </h1>
            <p className="text-slate-400 mt-2">
              156 courses available • 98 with CE credits
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("grid")}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-blue-600"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <Grid3x3 size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("list")}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-blue-600"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <List size={20} />
            </motion.button>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search courses, instructors, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Filter size={20} />
              Filters
            </motion.button>
          </div>
        </motion.div>

        {/* Category Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-3"
        >
          {categories.map((category, idx) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                selectedCategory === category.id
                  ? "bg-gradient-to-r from-blue-600 to-emerald-600 shadow-lg shadow-blue-500/50"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <category.icon size={18} />
              {category.name}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {category.count}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Courses Grid/List */}
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredCourses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition-all cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative">
                    <div
                      className={`${course.thumbnail} h-48 flex items-center justify-center text-6xl font-bold`}
                    >
                      {course.title.slice(0, 1)}
                    </div>
                    {course.trending && (
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <TrendingUp size={12} />
                        Trending
                      </div>
                    )}
                    {course.enrolled && (
                      <div className="absolute top-4 left-4 bg-blue-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <CheckCircle size={12} />
                        Enrolled
                      </div>
                    )}
                    {course.enrolled && course.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg leading-tight flex-1">
                        {course.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      {course.instructor}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Star
                          size={14}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        {course.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        {course.students.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {course.duration}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {course.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${getDifficultyColor(
                            course.difficulty
                          )}`}
                        >
                          {course.difficulty}
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs font-medium">
                          {course.ce} CE
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full mt-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                        course.enrolled
                          ? "bg-gradient-to-r from-blue-600 to-emerald-600"
                          : "bg-slate-800 hover:bg-slate-700"
                      }`}
                    >
                      {course.enrolled ? (
                        <>
                          <Play size={18} />
                          Continue Learning
                        </>
                      ) : (
                        <>
                          <Award size={18} />
                          Enroll Now
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredCourses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={`${course.thumbnail} w-32 h-32 rounded-xl flex items-center justify-center text-4xl font-bold flex-shrink-0`}
                    >
                      {course.title.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-xl mb-1">
                            {course.title}
                          </h3>
                          <p className="text-slate-400">{course.instructor}</p>
                        </div>
                        {course.trending && (
                          <span className="bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            <TrendingUp size={12} />
                            Trending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Star
                            size={14}
                            className="text-yellow-400 fill-yellow-400"
                          />
                          {course.rating} ({course.reviews.toLocaleString()})
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={14} />
                          {course.students.toLocaleString()} students
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {course.duration}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${getDifficultyColor(
                            course.difficulty
                          )}`}
                        >
                          {course.difficulty}
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs font-medium">
                          {course.ce} CE Credits
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {course.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                        course.enrolled
                          ? "bg-gradient-to-r from-blue-600 to-emerald-600"
                          : "bg-slate-800 hover:bg-slate-700"
                      }`}
                    >
                      {course.enrolled ? (
                        <>
                          <Play size={18} />
                          Continue
                        </>
                      ) : (
                        <>
                          <Award size={18} />
                          Enroll
                        </>
                      )}
                    </motion.button>
                  </div>
                  {course.enrolled && course.progress > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-blue-400 font-semibold">
                          {course.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
