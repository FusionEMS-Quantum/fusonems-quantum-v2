import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, Coffee, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, isToday } from 'date-fns'

interface TimeEntry {
  id: string
  date: Date
  clockIn: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  totalHours?: number
  status: 'working' | 'completed' | 'pending'
}

const mockEntries: TimeEntry[] = [
  { id: '1', date: new Date(), clockIn: '06:02', status: 'working' },
  { id: '2', date: addDays(new Date(), -1), clockIn: '05:58', clockOut: '18:05', totalHours: 12.12, status: 'pending' },
  { id: '3', date: addDays(new Date(), -3), clockIn: '06:00', clockOut: '18:00', totalHours: 12, status: 'completed' },
  { id: '4', date: addDays(new Date(), -5), clockIn: '17:55', clockOut: '06:03', totalHours: 12.13, status: 'completed' },
]

export default function Timesheet() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [onBreak, setOnBreak] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  const todayEntry = mockEntries.find(e => isSameDay(e.date, new Date()) && e.status === 'working')
  const weekTotal = mockEntries
    .filter(e => e.date >= weekStart && e.date <= addDays(weekStart, 6))
    .reduce((sum, e) => sum + (e.totalHours || 0), 0)

  const getEntryForDay = (day: Date) => mockEntries.find(e => isSameDay(e.date, day))

  const statusConfig = {
    working: { icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    completed: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    pending: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  }

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Timesheet</h1>
        <p className="text-slate-400 text-sm">{format(currentTime, 'EEEE, MMMM d')}</p>
      </header>

      {todayEntry && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-500/30 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-emerald-400 text-sm">Currently Working</p>
              <p className="text-3xl font-bold text-white">{format(currentTime, 'HH:mm:ss')}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Clocked in</p>
              <p className="text-white font-medium">{todayEntry.clockIn}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <motion.button 
              onClick={() => setOnBreak(!onBreak)}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium ${onBreak ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}
              whileTap={{ scale: 0.98 }}
            >
              <Coffee className="w-5 h-5" />
              {onBreak ? 'End Break' : 'Start Break'}
            </motion.button>
            <motion.button 
              className="flex-1 py-3 rounded-xl bg-red-500 text-white flex items-center justify-center gap-2 font-medium"
              whileTap={{ scale: 0.98 }}
            >
              <Square className="w-5 h-5" />
              Clock Out
            </motion.button>
          </div>
        </motion.div>
      )}

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm">Week Total</p>
            <p className="text-2xl font-bold text-white">{weekTotal.toFixed(1)} hrs</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button 
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="p-2 rounded-lg bg-slate-700 text-slate-300"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <span className="text-slate-400 text-sm min-w-[100px] text-center">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'd')}
            </span>
            <motion.button 
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="p-2 rounded-lg bg-slate-700 text-slate-300"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
        
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((weekTotal / 40) * 100, 100)}%` }}
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
          />
        </div>
        <p className="text-slate-500 text-xs mt-2 text-right">{(40 - weekTotal).toFixed(1)} hrs to 40hr week</p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">TIME ENTRIES</h2>
        <div className="space-y-2">
          {weekDays.map((day, i) => {
            const entry = getEntryForDay(day)
            const dayIsToday = isToday(day)
            const config = entry ? statusConfig[entry.status] : null
            const StatusIcon = config?.icon || Clock

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card flex items-center justify-between ${dayIsToday ? 'ring-1 ring-primary-500/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-center min-w-[40px] ${dayIsToday ? 'text-primary-400' : 'text-slate-400'}`}>
                    <p className="text-xs uppercase">{format(day, 'EEE')}</p>
                    <p className={`text-lg font-bold ${dayIsToday ? 'text-primary-400' : 'text-white'}`}>{format(day, 'd')}</p>
                  </div>
                  
                  {entry ? (
                    <div>
                      <p className="text-white text-sm">
                        {entry.clockIn} {entry.clockOut ? `- ${entry.clockOut}` : '- ...'}
                      </p>
                      {entry.totalHours && (
                        <p className="text-slate-400 text-xs">{entry.totalHours.toFixed(2)} hours</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No entry</p>
                  )}
                </div>
                
                {entry && config && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${config.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
