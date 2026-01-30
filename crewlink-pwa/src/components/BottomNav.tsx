import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/ptt', label: 'PTT', icon: PTTIcon },
  { path: '/messages', label: 'Messages', icon: MessagesIcon },
  { path: '/directory', label: 'Directory', icon: DirectoryIcon },
  { path: '/scanner', label: 'Scan', icon: ScannerIcon },
]

function HomeIcon(_: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  )
}

function PTTIcon(_: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
    </svg>
  )
}

function MessagesIcon(_: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
    </svg>
  )
}

function DirectoryIcon(_: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  )
}

function ScannerIcon(_: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav className="bg-surface border-t border-border shadow-nav safe-area-pb">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = currentPath === path || (path === '/' && currentPath === '/')
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center py-2.5 rounded-card transition-all duration-200 ${
                active
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:bg-surface-elevated hover:text-muted-light'
              }`}
            >
              <Icon active={active} />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
