import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Clock, CheckCircle, XCircle, Hourglass, ChevronRight, X } from 'lucide-react'
import { format, addDays } from 'date-fns'

interface TimeOffRequest {
  id: string
  type: 'pto' | 'sick' | 'personal' | 'bereavement'
  startDate: Date
  endDate: Date
  hours: number
  status: 'pending' | 'approved' | 'denied'
  reason?: string
}

const mockRequests: TimeOffRequest[] = [
  { id: '1', type: 'pto', startDate: addDays(new Date(), 14), endDate: addDays(new Date(), 16), hours: 24, status: 'pending', reason: 'Family vacation' },
  { id: '2', type: 'sick', startDate: addDays(new Date(), -5), endDate: addDays(new Date(), -5), hours: 12, status: 'approved' },
  { id: '3', type: 'personal', startDate: addDays(new Date(), -20), endDate: addDays(new Date(), -20), hours: 8, status: 'denied', reason: 'Insufficient coverage' },
]

const typeColors = {
  pto: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'PTO' },
  sick: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Sick Leave' },
  personal: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Personal' },
  bereavement: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Bereavement' },
}

const statusConfig = {
  pending: { icon: Hourglass, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  approved: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  denied: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
}

export default function TimeOff() {
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [newRequest, setNewRequest] = useState({ type: 'pto', startDate: '', endDate: '', reason: '' })

  const balances = [
    { type: 'PTO', available: 80, used: 40, color: 'from-blue-500 to-blue-600' },
    { type: 'Sick', available: 48, used: 12, color: 'from-red-500 to-red-600' },
    { type: 'Personal', available: 24, used: 8, color: 'from-purple-500 to-purple-600' },
  ]

  return (
    <div className="px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Off</h1>
          <p className="text-slate-400 text-sm">Manage your leave requests</p>
        </div>
        <motion.button 
          onClick={() => setShowNewRequest(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30"
          whileTap={{ scale: 0.9 }}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </header>

      <div className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">BALANCES</h2>
        <div className="grid grid-cols-3 gap-3">
          {balances.map((bal, i) => (
            <motion.div 
              key={bal.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card text-center"
            >
              <p className="text-slate-400 text-xs mb-1">{bal.type}</p>
              <p className="text-2xl font-bold text-white">{bal.available - bal.used}</p>
              <p className="text-slate-500 text-xs">hrs left</p>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(bal.used / bal.available) * 100}%` }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className={`h-full bg-gradient-to-r ${bal.color}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">REQUESTS</h2>
        <div className="space-y-3">
          {mockRequests.map((req, i) => {
            const typeStyle = typeColors[req.type]
            const statusStyle = statusConfig[req.status]
            const StatusIcon = statusStyle.icon

            return (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 rounded-lg ${typeStyle.bg}`}>
                      <span className={`text-xs font-medium ${typeStyle.text}`}>{typeStyle.label}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {format(req.startDate, 'MMM d')}
                        {req.startDate.getTime() !== req.endDate.getTime() && ` - ${format(req.endDate, 'MMM d')}`}
                      </p>
                      <p className="text-slate-400 text-sm">{req.hours} hours</p>
                      {req.reason && <p className="text-slate-500 text-xs mt-1">{req.reason}</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${statusStyle.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${statusStyle.color}`} />
                    <span className={`text-xs capitalize ${statusStyle.color}`}>{req.status}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {showNewRequest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowNewRequest(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">New Time Off Request</h2>
                <button onClick={() => setShowNewRequest(false)} className="p-2 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(typeColors).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setNewRequest({ ...newRequest, type: key })}
                        className={`py-3 rounded-xl border transition-all ${newRequest.type === key ? `${val.bg} ${val.text} border-current` : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={newRequest.startDate}
                      onChange={e => setNewRequest({ ...newRequest, startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newRequest.endDate}
                      onChange={e => setNewRequest({ ...newRequest, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Reason (optional)</label>
                  <textarea
                    value={newRequest.reason}
                    onChange={e => setNewRequest({ ...newRequest, reason: e.target.value })}
                    className="input resize-none h-24"
                    placeholder="Brief description..."
                  />
                </div>
              </div>
              
              <motion.button 
                className="w-full btn-primary mt-6"
                whileTap={{ scale: 0.98 }}
              >
                Submit Request
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
