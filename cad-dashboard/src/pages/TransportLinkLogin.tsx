import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { ChevronRight } from 'lucide-react'

export default function TransportLinkLogin() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()

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
              <h1 className="text-4xl lg:text-5xl font-bold mb-3">TransportLink Portal</h1>
              <p className="text-gray-400 text-lg">Facility & case manager access</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-4">Facility Login</h2>
                <p className="text-gray-400 mb-6">Submit and track medical transport requests</p>
                <form className="space-y-4 mb-6">
                  <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 outline-none" />
                  <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 outline-none" />
                  <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition">
                    Sign In
                  </button>
                  <button type="button" className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-lg font-semibold hover:bg-white/10 transition">
                    Sign in with SSO
                  </button>
                </form>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border border-orange-500/30 rounded-2xl p-8 flex flex-col justify-center">
                <h2 className="text-2xl font-bold mb-4">New User?</h2>
                <p className="text-gray-300 mb-6 leading-relaxed">Request access to submit and manage medical transport requests for your facility.</p>
                <button onClick={() => navigate('/')} className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition w-full justify-center">
                  <span>Request Access</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
