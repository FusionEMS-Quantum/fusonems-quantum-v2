import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Flame, Ambulance, Plane, AlertCircle } from 'lucide-react'
import Logo from '../components/Logo'

export default function Login() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      particles.forEach((p, i) => {
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
        particles.forEach((p2, j) => {
          if (i >= j) return
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            const opacity = (1 - dist / 120) * 0.15
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      })
      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  const handleLogin = async (module: string) => {
    setError('')
    setLoading(true)
    try {
      const response = await fetch('http://api.fusionemsquantum.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: formData.email, password: formData.password, module })
      })
      if (!response.ok) throw new Error('Invalid credentials')
      const data = await response.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const modules = [
    { id: 'cad', icon: Radio, title: 'Computer-Aided Dispatch', desc: 'Dispatcher & operations center access', color: 'from-orange-500 to-red-600' },
    { id: 'fire', icon: Flame, title: 'Fire/EMS Operations', desc: 'Fire department personnel access', color: 'from-red-500 to-orange-600' },
    { id: 'medical', icon: Ambulance, title: 'Medical Transport', desc: 'ePCR & scheduling for EMS crews', color: 'from-orange-600 to-red-500' },
    { id: 'hems', icon: Plane, title: 'Helicopter EMS', desc: 'Flight crew & pilot access', color: 'from-red-600 to-orange-500' }
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-50" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-none px-6 lg:px-8 py-6 border-b border-white/10 bg-black/85 backdrop-blur-xl">
          <Logo />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-7xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-4xl lg:text-5xl font-bold mb-3">Access FusionEMS Quantum</h1>
              <p className="text-gray-400 text-lg">Select your module and sign in</p>
            </div>

            {error && (
              <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
                  className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-2xl p-8 cursor-pointer hover:border-orange-500/30 transition-all duration-300"
                >
                  <div className={`inline-flex p-4 bg-gradient-to-br ${mod.color} rounded-xl mb-4 shadow-lg shadow-orange-500/20`}>
                    <mod.icon className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-white">{mod.title}</h2>
                  <p className="text-gray-400 mb-6">{mod.desc}</p>

                  {activeModule === mod.id && (
                    <div className="bg-black/40 rounded-xl p-6 space-y-4 border border-orange-500/20">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none transition"
                        />
                      </div>
                      <button
                        onClick={() => handleLogin(mod.id)}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50"
                      >
                        {loading ? 'Signing in...' : 'Sign In'}
                      </button>
                      <button className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-lg font-semibold hover:bg-white/10 transition">
                        Sign in with SSO
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
