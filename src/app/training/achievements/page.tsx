'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Star, Flame, Target, Zap, Award, Crown, Gift, Lock, ChevronRight, TrendingUp, Users, Clock } from 'lucide-react'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  xp: number
  unlocked: boolean
  progress?: number
  maxProgress?: number
}

const rarityColors = {
  common: { bg: 'from-slate-500 to-slate-600', border: 'border-slate-500', text: 'text-slate-300' },
  rare: { bg: 'from-blue-500 to-blue-600', border: 'border-blue-500', text: 'text-blue-300' },
  epic: { bg: 'from-purple-500 to-purple-600', border: 'border-purple-500', text: 'text-purple-300' },
  legendary: { bg: 'from-amber-500 to-orange-600', border: 'border-amber-500', text: 'text-amber-300' },
}

const mockAchievements: Achievement[] = [
  { id: '1', name: 'First Steps', description: 'Complete your first course', icon: '🎓', rarity: 'common', xp: 50, unlocked: true },
  { id: '2', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', rarity: 'common', xp: 100, unlocked: true },
  { id: '3', name: 'Quick Learner', description: 'Complete 5 courses in one week', icon: '⚡', rarity: 'rare', xp: 250, unlocked: true },
  { id: '4', name: 'Perfect Score', description: 'Score 100% on any assessment', icon: '💯', rarity: 'rare', xp: 300, unlocked: false, progress: 98, maxProgress: 100 },
  { id: '5', name: 'Protocol Master', description: 'Complete all protocol courses', icon: '📋', rarity: 'epic', xp: 500, unlocked: false, progress: 7, maxProgress: 12 },
  { id: '6', name: 'FTO Champion', description: 'Successfully train 5 new EMTs', icon: '🏆', rarity: 'epic', xp: 750, unlocked: false, progress: 2, maxProgress: 5 },
  { id: '7', name: 'Legend', description: 'Reach Level 50', icon: '👑', rarity: 'legendary', xp: 2000, unlocked: false, progress: 23, maxProgress: 50 },
]

const mockChallenges = [
  { id: '1', name: 'Weekend Warrior', description: 'Complete 3 courses this weekend', reward: 'Exclusive Badge', rewardXp: 500, timeLeft: '2d 4h', participants: 156, progress: 1, maxProgress: 3 },
  { id: '2', name: 'Assessment Ace', description: 'Score 90%+ on 5 assessments', reward: '1 Free CE Credit', rewardXp: 300, timeLeft: '5d 12h', participants: 89, progress: 3, maxProgress: 5 },
]

export default function AchievementsPage() {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [showNewUnlock, setShowNewUnlock] = useState(false)

  const filtered = mockAchievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked
    if (filter === 'locked') return !a.unlocked
    return true
  })

  useEffect(() => {
    const timer = setTimeout(() => setShowNewUnlock(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/10 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Achievements</h1>
              <p className="text-amber-300">Unlock badges, earn XP, climb the ranks</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-slate-400 text-sm">Total XP</p>
              <p className="text-2xl font-bold text-amber-400">12,450</p>
            </div>
            <div className="w-20 h-20 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#334155" strokeWidth="6" />
                <circle cx="40" cy="40" r="35" fill="none" stroke="url(#levelGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="120 220" />
                <defs><linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ea580c" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">23</span>
                <span className="text-xs text-slate-400">Level</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-amber-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" />Active Challenges</h2>
            </div>
            <div className="space-y-4">
              {mockChallenges.map((challenge, i) => (
                <motion.div key={challenge.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">{challenge.name}</h3>
                      <p className="text-slate-400 text-sm">{challenge.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-400"><Clock className="w-4 h-4" /><span className="text-sm">{challenge.timeLeft}</span></div>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1"><Users className="w-3 h-3" />{challenge.participants} joined</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" initial={{ width: 0 }} animate={{ width: `${(challenge.progress / challenge.maxProgress) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <Gift className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400 text-sm">{challenge.reward}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-amber-400" />Your Stats</h2>
            <div className="space-y-4">
              {[{ label: 'Achievements', value: '3/7' }, { label: 'Streak', value: '12 days', icon: Flame, color: 'text-orange-400' }, { label: 'Courses', value: '24' }, { label: 'Rank', value: '#47', icon: TrendingUp, color: 'text-amber-400' }].map((stat, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                  <span className="text-slate-400">{stat.label}</span>
                  <div className={`flex items-center gap-1 ${stat.color || 'text-white'}`}>
                    {stat.icon && <stat.icon className="w-4 h-4" />}
                    <span className="font-semibold">{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Award className="w-5 h-5 text-amber-400" />All Achievements</h2>
            <div className="flex bg-slate-900 rounded-lg p-1">
              {(['all', 'unlocked', 'locked'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${filter === f ? 'bg-amber-500 text-white' : 'text-slate-400'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((achievement, i) => {
              const colors = rarityColors[achievement.rarity]
              return (
                <motion.div key={achievement.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`relative rounded-xl border ${achievement.unlocked ? colors.border : 'border-slate-700'} bg-slate-800/50 p-4 overflow-hidden cursor-pointer`} whileHover={{ scale: 1.02 }}>
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${achievement.unlocked ? `bg-gradient-to-br ${colors.bg}` : 'bg-slate-800'}`}>
                      {achievement.unlocked ? achievement.icon : <Lock className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${achievement.unlocked ? 'text-white' : 'text-slate-500'}`}>{achievement.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${achievement.unlocked ? colors.bg : 'bg-slate-800'} text-white`}>{achievement.rarity}</span>
                      </div>
                      <p className={`text-sm mt-1 ${achievement.unlocked ? 'text-slate-400' : 'text-slate-600'}`}>{achievement.description}</p>
                      {achievement.progress !== undefined && !achievement.unlocked && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${colors.bg}`} style={{ width: `${(achievement.progress / (achievement.maxProgress || 1)) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 ${achievement.unlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                      <Zap className="w-4 h-4" /><span className="text-sm font-semibold">{achievement.xp}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        <AnimatePresence>
          {showNewUnlock && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 50 }} className="fixed bottom-6 right-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4 shadow-2xl shadow-amber-500/30 max-w-sm">
              <button onClick={() => setShowNewUnlock(false)} className="absolute top-2 right-2 text-white/60 hover:text-white">×</button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl">🔥</div>
                <div>
                  <p className="text-white/80 text-sm">Achievement Unlocked!</p>
                  <p className="text-white font-bold">Week Warrior</p>
                  <p className="text-white/60 text-xs">+100 XP</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
