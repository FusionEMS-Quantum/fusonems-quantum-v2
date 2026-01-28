import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Download, ChevronRight, X, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { format, subMonths } from 'date-fns'

interface PayStub {
  id: string
  periodStart: Date
  periodEnd: Date
  payDate: Date
  grossPay: number
  netPay: number
  regularHours: number
  overtimeHours: number
  deductions: { name: string; amount: number }[]
}

const mockPayStubs: PayStub[] = Array.from({ length: 6 }, (_, i) => ({
  id: `${i + 1}`,
  periodStart: subMonths(new Date(), i),
  periodEnd: subMonths(new Date(), i),
  payDate: subMonths(new Date(), i),
  grossPay: 3200 + Math.random() * 800,
  netPay: 2400 + Math.random() * 600,
  regularHours: 80,
  overtimeHours: Math.floor(Math.random() * 20),
  deductions: [
    { name: 'Federal Tax', amount: 320 + Math.random() * 50 },
    { name: 'State Tax', amount: 120 + Math.random() * 30 },
    { name: 'Social Security', amount: 198 },
    { name: 'Medicare', amount: 46 },
    { name: 'Health Insurance', amount: 180 },
    { name: '401(k)', amount: 160 },
  ],
}))

export default function PayStubs() {
  const [selectedStub, setSelectedStub] = useState<PayStub | null>(null)

  const ytdGross = mockPayStubs.reduce((sum, s) => sum + s.grossPay, 0)
  const ytdNet = mockPayStubs.reduce((sum, s) => sum + s.netPay, 0)
  const avgNet = ytdNet / mockPayStubs.length

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pay Stubs</h1>
        <p className="text-slate-400 text-sm">View your earnings history</p>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-500/30"
        >
          <p className="text-emerald-400 text-xs mb-1">YTD Gross</p>
          <p className="text-2xl font-bold text-white">${ytdGross.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30"
        >
          <p className="text-blue-400 text-xs mb-1">YTD Net</p>
          <p className="text-2xl font-bold text-white">${ytdNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
        </motion.div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">PAY HISTORY</h2>
        <div className="space-y-3">
          {mockPayStubs.map((stub, i) => {
            const diff = stub.netPay - avgNet
            const isUp = diff > 0

            return (
              <motion.div
                key={stub.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedStub(stub)}
                className="card cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{format(stub.payDate, 'MMMM d, yyyy')}</p>
                      <p className="text-slate-400 text-sm">{stub.regularHours + stub.overtimeHours} hours worked</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${stub.netPay.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    <div className={`flex items-center gap-1 text-xs ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isUp ? '+' : ''}{diff.toFixed(0)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedStub && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setSelectedStub(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Pay Statement</h2>
                  <p className="text-slate-400">{format(selectedStub.payDate, 'MMMM d, yyyy')}</p>
                </div>
                <button onClick={() => setSelectedStub(null)} className="p-2 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card bg-emerald-500/10 border-emerald-500/30">
                  <p className="text-emerald-400 text-xs">Gross Pay</p>
                  <p className="text-2xl font-bold text-white">${selectedStub.grossPay.toFixed(2)}</p>
                </div>
                <div className="card bg-blue-500/10 border-blue-500/30">
                  <p className="text-blue-400 text-xs">Net Pay</p>
                  <p className="text-2xl font-bold text-white">${selectedStub.netPay.toFixed(2)}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">HOURS</h3>
                <div className="card space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Regular Hours</span>
                    <span className="text-white font-medium">{selectedStub.regularHours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Overtime Hours</span>
                    <span className="text-amber-400 font-medium">{selectedStub.overtimeHours}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-300 font-medium">Total Hours</span>
                    <span className="text-white font-bold">{selectedStub.regularHours + selectedStub.overtimeHours}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">DEDUCTIONS</h3>
                <div className="card space-y-3">
                  {selectedStub.deductions.map((ded, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-slate-300">{ded.name}</span>
                      <span className="text-red-400">-${ded.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-300 font-medium">Total Deductions</span>
                    <span className="text-red-400 font-bold">
                      -${selectedStub.deductions.reduce((s, d) => s + d.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <motion.button 
                className="w-full btn-primary flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
              >
                <Download className="w-5 h-5" />
                Download PDF
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
