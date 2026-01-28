"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  TrendingUp,
  Trophy,
  Calendar,
  Award,
  PlayCircle,
  ChevronRight,
  Clock,
  Target,
  Zap,
  Star,
  BookOpen,
  Users,
} from "lucide-react";
import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function TrainingDashboard() {
  const [streak, setStreak] = useState(0);
  const [streakAnimation, setStreakAnimation] = useState(false);

  useEffect(() => {
    setStreak(12);
    setStreakAnimation(true);
  }, []);

  const coursesInProgress = [
    {
      id: 1,
      title: "Advanced Airway Management",
      progress: 68,
      color: "#3B82F6",
      timeLeft: "2 hrs",
      nextLesson: "Cricothyrotomy Techniques",
    },
    {
      id: 2,
      title: "Trauma Assessment",
      progress: 42,
      color: "#10B981",
      timeLeft: "4 hrs",
      nextLesson: "Multi-System Trauma",
    },
    {
      id: 3,
      title: "Cardiac Emergency Response",
      progress: 85,
      color: "#F59E0B",
      timeLeft: "45 min",
      nextLesson: "Final Assessment",
    },
  ];

  const recommendedCourses = [
    {
      id: 1,
      title: "Pediatric Advanced Life Support",
      instructor: "Dr. Sarah Mitchell",
      rating: 4.9,
      students: 2847,
      duration: "6 hrs",
      ce: 6,
      thumbnail: "bg-gradient-to-br from-pink-500 to-rose-600",
    },
    {
      id: 2,
      title: "Tactical EMS Operations",
      instructor: "Lt. Mike Rodriguez",
      rating: 4.8,
      students: 1923,
      duration: "8 hrs",
      ce: 8,
      thumbnail: "bg-gradient-to-br from-slate-700 to-slate-900",
    },
    {
      id: 3,
      title: "Disaster Response Leadership",
      instructor: "Chief Amy Chen",
      rating: 5.0,
      students: 1456,
      duration: "12 hrs",
      ce: 12,
      thumbnail: "bg-gradient-to-br from-orange-500 to-red-600",
    },
  ];

  const leaderboard = [
    { rank: 1, name: "Jessica Martinez", points: 8450, avatar: "JM", change: 0 },
    { rank: 2, name: "Mike Thompson", points: 8120, avatar: "MT", change: 2 },
    { rank: 3, name: "Sarah Kim", points: 7980, avatar: "SK", change: -1 },
    { rank: 4, name: "You", points: 7650, avatar: "YO", change: 1, highlight: true },
    { rank: 5, name: "David Lee", points: 7420, avatar: "DL", change: -2 },
  ];

  const upcomingDeadlines = [
    { title: "ACLS Recertification", date: "3 days", priority: "high" },
    { title: "Trauma Course Final", date: "5 days", priority: "medium" },
    { title: "Safety Training Quiz", date: "1 week", priority: "low" },
  ];

  const achievements = [
    { icon: Flame, title: "Fire Streak", desc: "12 days", color: "from-orange-500 to-red-600" },
    { icon: Trophy, title: "Top Learner", desc: "This Month", color: "from-yellow-500 to-orange-600" },
    { icon: Target, title: "Perfect Score", desc: "5 Courses", color: "from-green-500 to-emerald-600" },
    { icon: Zap, title: "Fast Finisher", desc: "Speed Demon", color: "from-purple-500 to-pink-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Training Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Continue your learning journey</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-3 rounded-xl cursor-pointer shadow-lg shadow-blue-500/50"
          >
            <span className="font-semibold">Browse Courses</span>
          </motion.div>
        </motion.div>

        {/* Streak & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute -right-8 -top-8 opacity-20">
              <Flame size={120} />
            </div>
            <div className="relative z-10">
              <Flame className="mb-3" size={32} />
              <div className="text-5xl font-bold mb-2">
                {streakAnimation && (
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {streak}
                  </motion.span>
                )}
              </div>
              <p className="text-orange-100">Day Learning Streak</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6"
          >
            <BookOpen className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-2">8</div>
            <p className="text-blue-100">Courses In Progress</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6"
          >
            <Award className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-2">24</div>
            <p className="text-emerald-100">Completed Courses</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6"
          >
            <Trophy className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-2">7,650</div>
            <p className="text-purple-100">Total XP Points</p>
          </motion.div>
        </div>

        {/* Courses in Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Continue Learning</h2>
            <button className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coursesInProgress.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div style={{ width: 80, height: 80 }}>
                    <CircularProgressbar
                      value={course.progress}
                      text={`${course.progress}%`}
                      styles={buildStyles({
                        textColor: "#fff",
                        pathColor: course.color,
                        trailColor: "#1e293b",
                        textSize: "20px",
                      })}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{course.title}</h3>
                    <div className="text-sm text-slate-400 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} />
                        {course.timeLeft} remaining
                      </div>
                      <div className="text-slate-500">Next: {course.nextLesson}</div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-blue-600 to-emerald-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 w-full justify-center"
                    >
                      <PlayCircle size={16} />
                      Resume
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recommended Courses & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommended Courses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold mb-6">Recommended For You</h2>
            <div className="space-y-4">
              {recommendedCourses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer flex items-center gap-4"
                >
                  <div className={`w-24 h-24 ${course.thumbnail} rounded-xl flex items-center justify-center text-3xl font-bold`}>
                    {course.title.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                    <p className="text-sm text-slate-400 mb-2">{course.instructor}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
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
                      <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                        {course.ce} CE
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-2 rounded-lg font-medium"
                  >
                    Enroll
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Leaderboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Leaderboard</h2>
              <Trophy className="text-yellow-400" size={24} />
            </div>
            <div className="space-y-3">
              {leaderboard.map((user) => (
                <motion.div
                  key={user.rank}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + user.rank * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    user.highlight
                      ? "bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-blue-500/50"
                      : "bg-slate-800/50"
                  }`}
                >
                  <div className="text-lg font-bold w-6">{user.rank}</div>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold">
                    {user.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-slate-400">{user.points.toLocaleString()} XP</div>
                  </div>
                  {user.change !== 0 && (
                    <div
                      className={`text-sm ${
                        user.change > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {user.change > 0 ? "↑" : "↓"} {Math.abs(user.change)}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="w-full mt-4 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View Full Leaderboard
            </motion.button>
          </motion.div>
        </div>

        {/* Achievements & Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Achievement Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="lg:col-span-2 bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold mb-6">Recent Achievements</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + idx * 0.1 }}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className={`bg-gradient-to-br ${achievement.color} rounded-xl p-6 text-center cursor-pointer`}
                >
                  <achievement.icon className="mx-auto mb-3" size={40} />
                  <div className="font-bold mb-1">{achievement.title}</div>
                  <div className="text-sm opacity-90">{achievement.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Deadlines */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Calendar size={24} />
              <h2 className="text-2xl font-bold">Upcoming</h2>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 + idx * 0.1 }}
                  className="bg-slate-800/50 rounded-xl p-4 border-l-4"
                  style={{
                    borderLeftColor:
                      deadline.priority === "high"
                        ? "#EF4444"
                        : deadline.priority === "medium"
                        ? "#F59E0B"
                        : "#10B981",
                  }}
                >
                  <div className="font-semibold mb-1">{deadline.title}</div>
                  <div className="text-sm text-slate-400">Due in {deadline.date}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
