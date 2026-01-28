import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Calendar, Clock, Award, DollarSign } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/timesheet', icon: Clock, label: 'Time' },
  { to: '/certifications', icon: Award, label: 'Certs' },
  { to: '/paystubs', icon: DollarSign, label: 'Pay' },
]

export default function Layout() {
  const location = useLocation()
  
  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <motion.main 
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="safe-area-pt"
      >
        <Outlet />
      </motion.main>
      
      <nav className="bottom-nav">
        <div className="flex justify-around items-center py-2 px-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
                isActive ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
