import { useRef, useEffect, useState } from 'react'
import Logo from '../components/Logo'
import { DollarSign, Lock } from 'lucide-react'

export default function PayBill() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [userType, setUserType] = useState<'patient' | 'rep' | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const particles: any[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3
      })
    }
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, `rgba(249, 115, 22, ${p.opacity})`)
        gradient.addColorStop(1, `rgba(249, 115, 22, 0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })
      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-50" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-none px-6 lg:px-8 py-6 border-b border-white/10 bg-black/85 backdrop-blur-xl">
          <Logo />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-12">
              <DollarSign className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h1 className="text-4xl lg:text-5xl font-bold mb-3">Pay Your Medical Transport Bill</h1>
              <p className="text-gray-400 text-lg">Secure online payment for ambulance transport services</p>
            </div>

            {!userType ? (
              <div className="grid md:grid-cols-2 gap-6">
                <button onClick={() => setUserType('patient')} className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-2xl p-8 hover:border-orange-500/30 transition text-left">
                  <h2 className="text-2xl font-bold mb-4">I am the Patient</h2>
                  <p className="text-gray-400">Pay your own medical transport bill</p>
                </button>
                <button onClick={() => setUserType('rep')} className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-2xl p-8 hover:border-orange-500/30 transition text-left">
                  <h2 className="text-2xl font-bold mb-4">Authorized Representative</h2>
                  <p className="text-gray-400">Pay on behalf of a patient</p>
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-2xl p-8">
                <button onClick={() => setUserType(null)} className="text-orange-500 text-sm mb-6 hover:text-orange-400">← Back</button>
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Invoice Number</label>
                    <input type="text" placeholder="INV-2026-00001" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Date of Service</label>
                    <input type="date" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Patient Last Name</label>
                    <input type="text" placeholder="Smith" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 outline-none" />
                  </div>
                  {userType === 'rep' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Relationship to Patient</label>
                        <select className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:border-orange-500 outline-none">
                          <option>Select relationship</option>
                          <option>Family Member</option>
                          <option>Guardian</option>
                          <option>Case Manager</option>
                          <option>Insurance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Authorization Code (if required)</label>
                        <input type="text" placeholder="Optional" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 outline-none" />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Payment Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-400 text-lg">$</span>
                      <input type="number" step="0.01" placeholder="0.00" className="w-full pl-9 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 outline-none" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-lg text-base font-semibold hover:from-orange-600 hover:to-orange-700 transition flex items-center justify-center space-x-2 shadow-xl shadow-orange-500/25">
                    <Lock className="h-5 w-5" />
                    <span>Proceed to Secure Payment</span>
                  </button>
                  <div className="text-center text-sm text-gray-500 flex items-center justify-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Powered by Stripe. PCI DSS compliant.</span>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
