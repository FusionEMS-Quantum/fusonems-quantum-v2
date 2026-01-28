import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, AlertTriangle, CheckCircle, XCircle, Upload, Calendar, ChevronRight, X, FileText } from 'lucide-react'
import { format, differenceInDays, addDays } from 'date-fns'

interface Certification {
  id: string
  name: string
  issuer: string
  issueDate: Date
  expiryDate: Date
  status: 'active' | 'expiring' | 'expired'
  documentUrl?: string
}

const mockCerts: Certification[] = [
  { id: '1', name: 'EMT-Basic', issuer: 'NREMT', issueDate: addDays(new Date(), -365), expiryDate: addDays(new Date(), 45), status: 'expiring' },
  { id: '2', name: 'CPR/BLS Provider', issuer: 'American Heart Association', issueDate: addDays(new Date(), -300), expiryDate: addDays(new Date(), 120), status: 'active' },
  { id: '3', name: 'EVOC', issuer: 'State EMS', issueDate: addDays(new Date(), -200), expiryDate: addDays(new Date(), 165), status: 'active' },
  { id: '4', name: 'PHTLS', issuer: 'NAEMT', issueDate: addDays(new Date(), -400), expiryDate: addDays(new Date(), -30), status: 'expired' },
  { id: '5', name: 'ACLS Provider', issuer: 'American Heart Association', issueDate: addDays(new Date(), -180), expiryDate: addDays(new Date(), 550), status: 'active' },
]

const statusConfig = {
  active: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Active' },
  expiring: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Expiring Soon' },
  expired: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Expired' },
}

export default function Certifications() {
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all')

  const filtered = filter === 'all' ? mockCerts : mockCerts.filter(c => c.status === filter)
  
  const summary = {
    active: mockCerts.filter(c => c.status === 'active').length,
    expiring: mockCerts.filter(c => c.status === 'expiring').length,
    expired: mockCerts.filter(c => c.status === 'expired').length,
  }

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Certifications</h1>
        <p className="text-slate-400 text-sm">Track and renew your credentials</p>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['active', 'expiring', 'expired'] as const).map((status, i) => {
          const config = statusConfig[status]
          const Icon = config.icon
          return (
            <motion.button
              key={status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setFilter(filter === status ? 'all' : status)}
              className={`card text-center transition-all ${filter === status ? config.bg + ' ' + config.border : ''}`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-1 ${config.color}`} />
              <p className="text-2xl font-bold text-white">{summary[status]}</p>
              <p className={`text-xs ${config.color}`}>{config.label}</p>
            </motion.button>
          )
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((cert, i) => {
          const config = statusConfig[cert.status]
          const Icon = config.icon
          const daysUntil = differenceInDays(cert.expiryDate, new Date())

          return (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedCert(cert)}
              className={`card cursor-pointer border ${config.border} ${config.bg}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                    <Award className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{cert.name}</p>
                    <p className="text-slate-400 text-sm">{cert.issuer}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {daysUntil > 0 ? `${daysUntil}d` : daysUntil === 0 ? 'Today' : `${Math.abs(daysUntil)}d ago`}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs">{format(cert.expiryDate, 'MMM d, yyyy')}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedCert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setSelectedCert(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${statusConfig[selectedCert.status].bg} flex items-center justify-center`}>
                    <Award className={`w-6 h-6 ${statusConfig[selectedCert.status].color}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedCert.name}</h2>
                    <p className="text-slate-400">{selectedCert.issuer}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCert(null)} className="p-2 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Issue Date</span>
                  <span className="text-white">{format(selectedCert.issueDate, 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Expiry Date</span>
                  <span className={statusConfig[selectedCert.status].color}>{format(selectedCert.expiryDate, 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Status</span>
                  <span className={`${statusConfig[selectedCert.status].color} capitalize`}>{selectedCert.status}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <motion.button 
                  className="py-3 rounded-xl bg-slate-700 text-white flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.98 }}
                >
                  <FileText className="w-5 h-5" />
                  View Document
                </motion.button>
                <motion.button 
                  className="btn-primary flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="w-5 h-5" />
                  Upload New
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
