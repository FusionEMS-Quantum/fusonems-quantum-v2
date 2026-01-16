import { Link } from 'react-router-dom'
import AdvisoryPanel from '../components/AdvisoryPanel.jsx'

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <div>
          <p className="eyebrow">FusonEMS Quantum Platform</p>
          <h1>Unified EMS, Fire-EMS, HEMS, and Telehealth Command</h1>
          <p className="hero-text">
            One operational brain for dispatch, clinical care, compliance, billing,
            telehealth, and flight operations. AI-assisted, audit-ready, and built
            for real-time emergency environments.
          </p>
          <div className="landing-actions">
            <Link className="primary-button" to="/dashboard">
              Enter Command Center
            </Link>
            <Link className="ghost-button" to="/hems">
              Explore HEMS
            </Link>
          </div>
        </div>
        <div className="landing-card">
          <AdvisoryPanel
            title="System Alive"
            model="quantum-ai"
            version="1.0"
            level="ADVISORY"
            message="All modules online. Event bus healthy. Training mode disabled."
            reason="System health + module registry checks."
          />
        </div>
      </header>

      <section className="landing-grid">
        <div className="panel">
          <h3>Operations Spine</h3>
          <p className="list-sub">
            CAD, scheduling, unit tracking, and HEMS mission governance in one
            synchronized timeline.
          </p>
        </div>
        <div className="panel">
          <h3>Clinical + Billing Continuity</h3>
          <p className="list-sub">
            ePCR, HEMS charting, and billing packets flow through canonical events
            with legal-grade auditability.
          </p>
        </div>
        <div className="panel">
          <h3>AI Advisory Layer</h3>
          <p className="list-sub">
            Every AI output is labeled, versioned, and replayable with clear
            overrides and compliance context.
          </p>
        </div>
      </section>
    </div>
  )
}
