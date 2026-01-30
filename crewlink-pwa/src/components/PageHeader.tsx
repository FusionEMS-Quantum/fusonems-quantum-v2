import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  right?: ReactNode
  /** If true, show logo + title block (dashboard style). If false, show back + title (subpage style). */
  variant?: 'dashboard' | 'subpage'
}

export default function PageHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  variant = 'subpage',
}: PageHeaderProps) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))

  if (variant === 'dashboard') {
    return (
      <header className="bg-surface border-b border-border shadow-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-card flex items-center justify-center font-bold text-white shadow-lg">
            CL
          </div>
          <div>
            <div className="font-semibold text-white">{title}</div>
            {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
          </div>
        </div>
        {right ?? <div className="w-10" />}
      </header>
    )
  }

  return (
    <header className="bg-surface border-b border-border shadow-header px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-button text-muted hover:text-white hover:bg-surface-elevated transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <h1 className="font-semibold text-white truncate">{title}</h1>
      </div>
      {right ?? <div className="w-10 flex-shrink-0" />}
    </header>
  )
}
