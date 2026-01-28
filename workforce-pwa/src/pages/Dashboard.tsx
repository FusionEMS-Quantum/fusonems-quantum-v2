import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Award, AlertTriangle, TrendingUp, ChevronRight, Play, Square, Sun, Moon } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const { user } = useAuth()
  const [clockedIn, setClockedIn] = useState(false)
  const [clockTime, setClockTime] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClock = () => {
    if (clockedIn) {
      setClockedIn(false)
      setClockTime(null)
    } else {
      setClockedIn(true)
      setClockTime(new Date())
    }
  }

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const formatDuration = (start: Date) => {
    const diff = Math.floor((currentTime.getTime() - start.getTime()) / 1000)
    const hrs = Math.floor(diff / 3600)
    const mins = Math.floor((diff % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  const greeting = currentTime.getHours() < 12 ? 'Good morning' : currentTime.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const isDay = currentTime.getHours() >= 6 && currentTime.getHours() < 18

  const quickStats = [
    { label: 'Next Shift', value: 'Tomorrow 6:00 AM', icon: Calendar, color: 'from-blue-500 to-blue-600' },
    { label: 'Hours This Week', value: '32.5 hrs', icon: Clock, color: 'from-emerald-500 to-emerald-600' },
    { label: 'PTO Balance', value: '80 hrs', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
  ]

  const alerts = [
    { type: 'warning', message: 'EMT-B certification expires in 45 days', link: '/certifications' },
    { type: 'info', message: 'New schedule posted for next week', link: '/schedule' },
  ]

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm flex items-center gap-1">
            {isDay ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {greeting}
          </p>
          <h1 className="text-2xl font-bold text-white">{user?.name?.split(' ')[0] || 'Team Member'}</h1>
        </div>
        <Link to="/profile" className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
          {user?.name?.charAt(0) || 'U'}
        </Link>
      </header>

      <motion.div 
        className={`card ${clockedIn ? 'bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border-emerald-500/30' : 'bg-gradient-to-br from-slate-800/50 to-slate-700/30'}`}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{clockedIn ? 'Currently Working' : 'Not Clocked In'}</p>
            <p className="text-3xl font-bold text-white mt-1">{formatTime(currentTime)}</p>
            {clockedIn && clockTime && (
              <p className="text-emerald-400 text-sm mt-1">Working for {formatDuration(clockTime)}</p>
            )}
          </div>
          <motion.button 
            onClick={handleClock}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${clockedIn ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30'}`}
            whileTap={{ scale: 0.9 }}
          >
            {clockedIn ? <Square className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
          </motion.button>
        </div>
      </motion.div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Link key={i} to={alert.link}>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${alert.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}
              >
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
                <span className="text-sm text-slate-200 flex-1">{alert.message}</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {quickStats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-white font-semibold">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Upcoming Certifications</h2>
          <Link to="/certifications" className="text-primary-400 text-sm">View All</Link>
        </div>
        <div className="space-y-2">
          {[
            { name: 'EMT-Basic', expires: '45 days', status: 'warning' },
            { name: 'CPR/BLS', expires: '120 days', status: 'ok' },
            { name: 'EVOC', expires: '200 days', status: 'ok' },
          ].map((cert, i) => (
            <motion.div 
              key={cert.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Award className={`w-5 h-5 ${cert.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-white">{cert.name}</span>
              </div>
              <span className={`text-sm ${cert.status === 'warning' ? 'text-amber-400' : 'text-slate-400'}`}>
                {cert.expires}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
