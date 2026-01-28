import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Building, Shield, Camera, LogOut, ChevronRight, Bell, Moon, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const profileSections = [
    {
      title: 'Personal Information',
      items: [
        { icon: User, label: 'Full Name', value: user?.name || 'John Doe' },
        { icon: Mail, label: 'Email', value: user?.email || 'john@agency.com' },
        { icon: Phone, label: 'Phone', value: '(555) 123-4567' },
        { icon: MapPin, label: 'Address', value: '123 Main St, City, ST 12345' },
      ]
    },
    {
      title: 'Employment',
      items: [
        { icon: Building, label: 'Department', value: 'Operations' },
        { icon: Shield, label: 'Role', value: 'Paramedic' },
        { icon: MapPin, label: 'Station', value: 'Station 1' },
      ]
    },
  ]

  const settings = [
    { icon: Bell, label: 'Push Notifications', toggle: true, value: notifications, onChange: setNotifications },
    { icon: Moon, label: 'Dark Mode', toggle: true, value: darkMode, onChange: setDarkMode },
    { icon: Globe, label: 'Language', value: 'English' },
  ]

  return (
    <div className="px-4 py-6 pb-24">
      <header className="text-center mb-8">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold mx-auto">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white border-2 border-slate-900">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-2xl font-bold text-white mt-4">{user?.name || 'John Doe'}</h1>
        <p className="text-slate-400">{user?.role || 'Paramedic'}</p>
      </header>

      {profileSections.map((section, sIdx) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sIdx * 0.1 }}
          className="mb-6"
        >
          <h2 className="text-sm font-medium text-slate-400 mb-3">{section.title.toUpperCase()}</h2>
          <div className="card space-y-0 divide-y divide-slate-700/50">
            {section.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <item.icon className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-slate-400 text-xs">{item.label}</p>
                  <p className="text-white">{item.value}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <h2 className="text-sm font-medium text-slate-400 mb-3">SETTINGS</h2>
        <div className="card space-y-0 divide-y divide-slate-700/50">
          {settings.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <item.icon className="w-5 h-5 text-slate-400" />
              <span className="text-white flex-1">{item.label}</span>
              {item.toggle ? (
                <button
                  onClick={() => item.onChange?.(!item.value)}
                  className={`w-12 h-7 rounded-full transition-all ${item.value ? 'bg-primary-500' : 'bg-slate-600'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${item.value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              ) : (
                <>
                  <span className="text-slate-400 text-sm">{item.value}</span>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleLogout}
        className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center gap-2 font-medium"
        whileTap={{ scale: 0.98 }}
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </motion.button>

      <p className="text-center text-slate-600 text-xs mt-6">
        FusionEMS Workforce v1.0.0
      </p>
    </div>
  )
}
