"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Flame,
  Star,
  Award,
  Zap,
  Target,
  Crown,
  TrendingUp,
  Users,
  Gift,
  Lock,
} from "lucide-react";

export default function LeaderboardHub() {
  const [timeRange, setTimeRange] = useState<"weekly" | "monthly" | "all-time">("weekly");
  const [leaderboardType, setLeaderboardType] = useState<"points" | "courses" | "streak">("points");

  const leaderboards = {
    points: {
      weekly: [
        { rank: 1, name: "Jessica Martinez", points: 1450, avatar: "JM", change: 0, badge: "👑" },
        { rank: 2, name: "Mike Thompson", points: 1320, avatar: "MT", change: 2, badge: "⚡" },
        { rank: 3, name: "Sarah Kim", points: 1180, avatar: "SK", change: -1, badge: "🔥" },
        { rank: 4, name: "You", points: 1050, avatar: "YO", change: 1, highlight: true, badge: "⭐" },
        { rank: 5, name: "David Lee", points: 980, avatar: "DL", change: -2, badge: "🎯" },
        { rank: 6, name: "Emma Wilson", points: 920, avatar: "EW", change: 3, badge: null },
        { rank: 7, name: "Chris Anderson", points: 890, avatar: "CA", change: -1, badge: null },
        { rank: 8, name: "Lisa Rodriguez", points: 850, avatar: "LR", change: 1, badge: null },
        { rank: 9, name: "James Taylor", points: 820, avatar: "JT", change: -2, badge: null },
        { rank: 10, name: "Amy Chen", points: 780, avatar: "AC", change: 0, badge: null },
      ],
      monthly: [
        { rank: 1, name: "Jessica Martinez", points: 5650, avatar: "JM", change: 0, badge: "👑" },
        { rank: 2, name: "Sarah Kim", points: 5120, avatar: "SK", change: 1, badge: "⚡" },
        { rank: 3, name: "Mike Thompson", points: 4980, avatar: "MT", change: -1, badge: "🔥" },
        { rank: 4, name: "David Lee", points: 4750, avatar: "DL", change: 2, badge: "⭐" },
        { rank: 5, name: "You", points: 4450, avatar: "YO", change: 0, highlight: true, badge: "🎯" },
      ],
      "all-time": [
        { rank: 1, name: "Jessica Martinez", points: 28450, avatar: "JM", change: 0, badge: "👑" },
        { rank: 2, name: "Mike Thompson", points: 26120, avatar: "MT", change: 0, badge: "⚡" },
        { rank: 3, name: "Sarah Kim", points: 24980, avatar: "SK", change: 0, badge: "🔥" },
        { rank: 4, name: "You", points: 22650, avatar: "YO", change: 1, highlight: true, badge: "⭐" },
        { rank: 5, name: "David Lee", points: 21420, avatar: "DL", change: -1, badge: "🎯" },
      ],
    },
  };

  const achievements = [
    { id: 1, icon: Flame, title: "Fire Starter", desc: "10 day streak", color: "from-orange-500 to-red-600", unlocked: true },
    { id: 2, icon: Trophy, title: "Top Learner", desc: "Ranked #1", color: "from-yellow-500 to-orange-600", unlocked: true },
    { id: 3, icon: Target, title: "Perfect Score", desc: "100% on 5 tests", color: "from-green-500 to-emerald-600", unlocked: true },
    { id: 4, icon: Zap, title: "Speed Demon", desc: "Complete in record time", color: "from-purple-500 to-pink-600", unlocked: true },
    { id: 5, icon: Star, title: "5-Star Student", desc: "Excellent ratings", color: "from-blue-500 to-cyan-600", unlocked: true },
    { id: 6, icon: Award, title: "Certified Pro", desc: "10 certifications", color: "from-indigo-500 to-purple-600", unlocked: true },
    { id: 7, icon: Crown, title: "Knowledge King", desc: "100 courses", color: "from-yellow-400 to-yellow-600", unlocked: false },
    { id: 8, icon: Users, title: "Team Player", desc: "Help 50 peers", color: "from-emerald-500 to-teal-600", unlocked: false },
  ];

  const challenges = [
    {
      id: 1,
      title: "Weekend Warrior",
      desc: "Complete 3 courses this weekend",
      progress: 2,
      goal: 3,
      reward: "500 XP + Badge",
      timeLeft: "2 days",
      type: "active",
    },
    {
      id: 2,
      title: "Streak Master",
      desc: "Maintain 30-day learning streak",
      progress: 12,
      goal: 30,
      reward: "1000 XP + Special Badge",
      timeLeft: "18 days",
      type: "active",
    },
    {
      id: 3,
      title: "Quiz Champion",
      desc: "Score 90%+ on 5 quizzes in a row",
      progress: 3,
      goal: 5,
      reward: "750 XP",
      timeLeft: "No limit",
      type: "ongoing",
    },
  ];

  const rewards = [
    { id: 1, name: "Custom Avatar Frame", cost: 5000, icon: "🖼️", unlocked: false },
    { id: 2, name: "Priority Support", cost: 10000, icon: "🎫", unlocked: false },
    { id: 3, name: "Exclusive Badge", cost: 7500, icon: "🏆", unlocked: false },
    { id: 4, name: "Course Discount 20%", cost: 15000, icon: "💰", unlocked: false },
    { id: 5, name: "Early Access", cost: 20000, icon: "⚡", unlocked: false },
    { id: 6, name: "VIP Status", cost: 50000, icon: "👑", unlocked: false },
  ];

  const currentLeaderboard = leaderboards.points[timeRange];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Gamification Hub
          </h1>
          <p className="text-slate-400 mt-2">Compete, earn rewards, and climb the leaderboard</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-2xl p-6"
          >
            <Trophy className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">22,650</div>
            <p className="text-yellow-100 text-sm">Total XP</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6"
          >
            <Crown className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">#4</div>
            <p className="text-purple-100 text-sm">Global Rank</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6"
          >
            <Award className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">18</div>
            <p className="text-blue-100 text-sm">Badges Earned</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-6"
          >
            <Flame className="mb-3" size={32} />
            <div className="text-4xl font-bold mb-1">12</div>
            <p className="text-orange-100 text-sm">Day Streak</p>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Trophy size={24} className="text-yellow-400" />
              <h2 className="text-2xl font-bold">Leaderboard</h2>
            </div>
            <div className="flex gap-3">
              {(["weekly", "monthly", "all-time"] as const).map((range) => (
                <motion.button
                  key={range}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    timeRange === range
                      ? "bg-gradient-to-r from-yellow-600 to-orange-600"
                      : "bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1).replace("-", " ")}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {currentLeaderboard.slice(0, 3).map((user, idx) => (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className={`${
                  idx === 0
                    ? "bg-gradient-to-br from-yellow-500 to-orange-600 order-2"
                    : idx === 1
                    ? "bg-gradient-to-br from-slate-400 to-slate-600 order-1"
                    : "bg-gradient-to-br from-orange-700 to-orange-900 order-3"
                } rounded-2xl p-6 text-center relative`}
                style={{ marginTop: idx === 0 ? 0 : idx === 1 ? "20px" : "40px" }}
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div
                    className={`w-12 h-12 ${
                      idx === 0
                        ? "bg-yellow-400"
                        : idx === 1
                        ? "bg-slate-300"
                        : "bg-orange-600"
                    } rounded-full flex items-center justify-center text-2xl font-bold shadow-lg`}
                  >
                    {user.rank}
                  </div>
                </div>
                <div className="mt-4 mb-3">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                    {user.avatar}
                  </div>
                  <div className="text-lg font-bold">{user.name}</div>
                  <div className="text-3xl font-bold my-2">{user.points.toLocaleString()}</div>
                  <div className="text-sm opacity-90">XP Points</div>
                </div>
                {user.badge && <div className="text-4xl">{user.badge}</div>}
              </motion.div>
            ))}
          </div>

          {/* Rest of Leaderboard */}
          <div className="space-y-2">
            {currentLeaderboard.slice(3).map((user, idx) => (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + idx * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  user.highlight
                    ? "bg-gradient-to-r from-blue-600/30 to-emerald-600/30 border border-blue-500/50"
                    : "bg-slate-800/50 hover:bg-slate-800"
                }`}
              >
                <div className="text-2xl font-bold w-8 text-center">{user.rank}</div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold">
                  {user.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-sm text-slate-400">{user.points.toLocaleString()} XP</div>
                </div>
                {user.badge && <div className="text-2xl">{user.badge}</div>}
                {user.change !== 0 && (
                  <div
                    className={`text-sm font-medium ${
                      user.change > 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {user.change > 0 ? "↑" : "↓"} {Math.abs(user.change)}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Achievements & Challenges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Award size={24} />
              <h2 className="text-2xl font-bold">Achievement Badges</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement, idx) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0 + idx * 0.05 }}
                  whileHover={{ scale: achievement.unlocked ? 1.05 : 1.0, rotate: achievement.unlocked ? 5 : 0 }}
                  className={`${
                    achievement.unlocked
                      ? `bg-gradient-to-br ${achievement.color}`
                      : "bg-slate-800/50 opacity-50"
                  } rounded-xl p-4 text-center cursor-pointer relative`}
                >
                  {!achievement.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <Lock size={24} />
                    </div>
                  )}
                  <achievement.icon className="mx-auto mb-2" size={32} />
                  <div className="font-bold text-sm mb-1">{achievement.title}</div>
                  <div className="text-xs opacity-90">{achievement.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Active Challenges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Target size={24} />
              <h2 className="text-2xl font-bold">Active Challenges</h2>
            </div>
            <div className="space-y-4">
              {challenges.map((challenge, idx) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + idx * 0.1 }}
                  className="bg-slate-800/50 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold mb-1">{challenge.title}</h3>
                      <p className="text-sm text-slate-400">{challenge.desc}</p>
                    </div>
                    <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium">
                      {challenge.timeLeft}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-semibold text-emerald-400">
                        {challenge.progress}/{challenge.goal}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(challenge.progress / challenge.goal) * 100}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Gift size={14} className="text-yellow-400" />
                    <span className="text-slate-400">Reward:</span>
                    <span className="font-semibold text-yellow-400">{challenge.reward}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Rewards Store */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Gift size={24} />
              <h2 className="text-2xl font-bold">Rewards Store</h2>
            </div>
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-2 rounded-xl font-bold">
              22,650 XP Available
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rewards.map((reward, idx) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + idx * 0.05 }}
                whileHover={{ scale: 1.03 }}
                className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="text-6xl mb-3">{reward.icon}</div>
                <h3 className="font-bold mb-2">{reward.name}</h3>
                <div className="text-2xl font-bold text-yellow-400 mb-4">
                  {reward.cost.toLocaleString()} XP
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={reward.cost > 22650}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    reward.cost > 22650
                      ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
                  }`}
                >
                  {reward.cost > 22650 ? <Lock size={16} className="inline mr-2" /> : null}
                  {reward.unlocked ? "Claimed" : "Unlock"}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
