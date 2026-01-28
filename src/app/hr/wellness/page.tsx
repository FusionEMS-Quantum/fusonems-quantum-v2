'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Activity, Brain, Coffee, TrendingUp, TrendingDown, Award, MessageSquare, Users, Star, Flame, Target, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, RadialBarChart, RadialBar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts'

const burnoutRisk = [
  { name: 'Sarah Johnson', risk: 82, hours: 156, consecutive: 5, factors: ['High OT', 'No vacation 90d', 'Night shifts'] },
  { name: 'Mike Chen', risk: 68, hours: 144, consecutive: 4, factors: ['Trauma calls', 'Schedule changes'] },
  { name: 'Emily Davis', risk: 54, hours: 128, consecutive: 3, factors: ['High call volume'] },
]

const workLifeScores = [
  { month: 'Aug', score: 68 }, { month: 'Sep', score: 72 }, { month: 'Oct', score: 65 },
  { month: 'Nov', score: 70 }, { month: 'Dec', score: 62 }, { month: 'Jan', score: 74 },
]

const overtimeData = [
  { name: 'Wk 1', hours: 12, healthy: 8 }, { name: 'Wk 2', hours: 18, healthy: 8 },
  { name: 'Wk 3', hours: 8, healthy: 8 }, { name: 'Wk 4', hours: 22, healthy: 8 },
]

const wellnessChallenges = [
  { id: '1', name: 'Step Challenge', participants: 24, progress: 78, reward: '1 PTO Day', daysLeft: 5 },
  { id: '2', name: 'Hydration Week', participants: 18, progress: 92, reward: 'Wellness Kit', daysLeft: 2 },
  { id: '3', name: 'Sleep Tracker', participants: 31, progress: 45, reward: '$50 Gift Card', daysLeft: 12 },
]

const recognitions = [
  { from: 'John Smith', to: 'Lisa Park', message: 'Great teamwork on that difficult call yesterday!', badge: 'Team Player' },
  { from: 'Emily Davis', to: 'Chris Wilson', message: 'Thanks for covering my shift last minute.', badge: 'Reliable' },
  { from: 'Sarah Johnson', to: 'Mike Chen', message: 'Your patient care skills are outstanding.', badge: 'Excellence' },
]

const stressIndicators = [
  { metric: 'Call Volume', current: 28, average: 22, status: 'high' },
  { metric: 'Response Time', current: 6.2, average: 5.8, status: 'warning' },
  { metric: 'Patient Load', current: 4.1, average: 4.5, status: 'good' },
  { metric: 'Documentation', current: 95, average: 92, status: 'good' },
]

export default function WellnessPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'recognition'>('overview')

  const overallWellness = 74

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Employee Wellness Hub</h1>
              <p className="text-pink-300">Monitor well-being, prevent burnout, celebrate success</p>
            </div>
          </div>
          
          <div className="flex bg-slate-800 rounded-xl p-1">
            {(['overview', 'challenges', 'recognition'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-pink-500/30 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Wellness Score</h2>
                  <Activity className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#334155" strokeWidth="12" />
                      <circle 
                        cx="80" cy="80" r="70" fill="none" 
                        stroke="url(#gradient)" strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${overallWellness * 4.4} 440`}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-white">{overallWellness}</span>
                      <span className="text-pink-400 text-sm">Good</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-4 text-emerald-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+6% from last month</span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Work-Life Balance Trend</h2>
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={workLifeScores}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} domain={[50, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="score" stroke="#a855f7" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-red-500/30 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Burnout Risk Monitor</h2>
                    <p className="text-slate-400 text-sm">AI-detected high-risk employees</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {burnoutRisk.map((emp, i) => (
                    <motion.div
                      key={emp.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{emp.name}</span>
                        <span className={`text-sm font-bold ${emp.risk > 70 ? 'text-red-400' : emp.risk > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {emp.risk}% Risk
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full ${emp.risk > 70 ? 'bg-red-500' : emp.risk > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${emp.risk}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {emp.factors.map((f, j) => (
                          <span key={j} className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-lg">{f}</span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-amber-500/30 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Overtime Tracker</h2>
                    <p className="text-slate-400 text-sm">Weekly overtime vs healthy threshold</p>
                  </div>
                </div>
                
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overtimeData}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {overtimeData.map((entry, index) => (
                          <Cell key={index} fill={entry.hours > entry.healthy ? '#f59e0b' : '#10b981'} />
                        ))}
                      </Bar>
                      <Bar dataKey="healthy" fill="#334155" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Week 4 exceeded healthy OT threshold by 175%</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Real-Time Stress Indicators</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stressIndicators.map((ind, i) => (
                  <div key={ind.metric} className="p-4 bg-slate-900/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">{ind.metric}</span>
                      {ind.status === 'high' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                       ind.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                       <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className={`text-2xl font-bold ${ind.status === 'high' ? 'text-red-400' : ind.status === 'warning' ? 'text-amber-400' : 'text-white'}`}>
                      {ind.current}
                    </p>
                    <p className="text-slate-500 text-xs">Avg: {ind.average}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {activeTab === 'challenges' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {wellnessChallenges.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-pink-500/30 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">{challenge.name}</h3>
                  <Target className="w-6 h-6 text-pink-400" />
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-pink-400 font-semibold">{challenge.progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${challenge.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>{challenge.participants} participants</span>
                  </div>
                  <span className="text-amber-400">{challenge.daysLeft} days left</span>
                </div>
                
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Reward: {challenge.reward}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'recognition' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Peer Recognition Wall</h2>
              <button className="px-4 py-2 bg-pink-500 text-white rounded-xl font-medium flex items-center gap-2">
                <Star className="w-4 h-4" />
                Give Recognition
              </button>
            </div>
            
            {recognitions.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold">
                    {rec.from.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium">{rec.from}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                      <span className="text-pink-400 font-medium">{rec.to}</span>
                    </div>
                    <p className="text-slate-300 mb-3">{rec.message}</p>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
                      <Award className="w-4 h-4" />
                      {rec.badge}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
