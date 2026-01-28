import React from 'react'

interface TrustBadgeProps {
  icon: 'shield' | 'lock' | 'activity' | 'headset' | string
  text: string
  variant?: 'default' | 'compact'
}

const iconMap: Record<string, JSX.Element> = {
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),
  lock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
  activity: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
  headset: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
    </svg>
  ),
}

export default function TrustBadge({ icon, text, variant = 'default' }: TrustBadgeProps) {
  const iconElement = iconMap[icon] || iconMap.shield

  return (
    <div className="trust-badge" aria-label={text}>
      <div className="trust-badge-icon">{iconElement}</div>
      <span className="trust-badge-text">{text}</span>
      <style jsx>{`
        .trust-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          transition: color 0.2s ease;
        }

        .trust-badge:hover {
          color: var(--text-secondary);
        }

        .trust-badge-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          color: var(--accent-orange);
        }

        .trust-badge-text {
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        ${variant === 'compact' ? `
          .trust-badge {
            gap: 6px;
          }
          .trust-badge-text {
            font-size: 11px;
          }
        ` : ''}
      `}</style>
    </div>
  )
}
