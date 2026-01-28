import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sun, Moon, Sunrise, Sunset, Users, RefreshCw } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns'

interface Shift {
  id: string
  date: Date
  type: 'day' | 'night' | 'swing'
  start: string
  end: string
  station: string
  partner?: string
}

const mockShifts: Shift[] = [
  { id: '1', date: new Date(), type: 'day', start: '06:00', end: '18:00', station: 'Station 1', partner: 'John Smith' },
  { id: '2', date: addDays(new Date(), 1), type: 'night', start: '18:00', end: '06:00', station: 'Station 2', partner: 'Jane Doe' },
  { id: '3', date: addDays(new Date(), 3), type: 'day', start: '06:00', end: '18:00', station: 'Station 1' },
  { id: '4', date: addDays(new Date(), 5), type: 'swing', start: '14:00', end: '02:00', station: 'Station 3', partner: 'Mike Johnson' },
]

const shiftColors = {
  day: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', icon: Sun },
  night: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-400', icon: Moon },
  swing: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', icon: Sunset },
}

export default function MySchedule() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getShiftForDay = (day: Date) => mockShifts.find(s => isSameDay(s.date, day))

  return (
    <div className="px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Schedule</h1>
          <p className="text-slate-400 text-sm">{format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <motion.button 
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-2 rounded-lg bg-primary-500/20 text-primary-400 text-sm font-medium"
            whileTap={{ scale: 0.95 }}
          >
            Today
          </motion.button>
          <motion.button 
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      <div className="space-y-2">
        {weekDays.map((day, i) => {
          const shift = getShiftForDay(day)
          const dayIsToday = isToday(day)
          const colors = shift ? shiftColors[shift.type] : null
          const Icon = colors?.icon || Sunrise

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => shift && setSelectedShift(shift)}
              className={`card cursor-pointer ${dayIsToday ? 'ring-2 ring-primary-500/50' : ''} ${shift ? colors?.bg : ''} ${shift ? colors?.border : 'border-slate-700/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`text-center min-w-[50px] ${dayIsToday ? 'text-primary-400' : 'text-slate-400'}`}>
                  <p className="text-xs uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-2xl font-bold ${dayIsToday ? 'text-primary-400' : 'text-white'}`}>{format(day, 'd')}</p>
                </div>
                
                {shift ? (
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${colors?.text}`} />
                        <span className="text-white font-medium">{shift.start} - {shift.end}</span>
                      </div>
                      <p className="text-slate-400 text-sm">{shift.station}</p>
                      {shift.partner && (
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" /> {shift.partner}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Off</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedShift && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setSelectedShift(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{format(selectedShift.date, 'EEEE, MMM d')}</h2>
                  <p className={`${shiftColors[selectedShift.type].text} capitalize`}>{selectedShift.type} Shift</p>
                </div>
                {shiftColors[selectedShift.type].icon && (
                  <div className={`w-12 h-12 rounded-xl ${shiftColors[selectedShift.type].bg} flex items-center justify-center`}>
                    {(() => { const I = shiftColors[selectedShift.type].icon; return <I className={`w-6 h-6 ${shiftColors[selectedShift.type].text}`} /> })()}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Time</span>
                  <span className="text-white font-medium">{selectedShift.start} - {selectedShift.end}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Station</span>
                  <span className="text-white font-medium">{selectedShift.station}</span>
                </div>
                {selectedShift.partner && (
                  <div className="flex justify-between py-3 border-b border-slate-800">
                    <span className="text-slate-400">Partner</span>
                    <span className="text-white font-medium">{selectedShift.partner}</span>
                  </div>
                )}
              </div>
              
              <motion.button 
                className="w-full btn-primary mt-6 flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-5 h-5" />
                Request Shift Swap
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
