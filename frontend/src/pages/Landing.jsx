import React, { Suspense, useEffect } from 'react'
import { Link } from 'react-router-dom'

const portalCards = [
  {
    title: 'Agency Operations',
    description: 'Command surface for dispatch, staffing, and operational readiness.',
    to: '/dashboard',
  },
  {
    title: 'Provider Portal',
    description: 'Clinical workflows for crews, documentation, and care continuity.',
    to: '/provider-portal',
  },
  {
    title: 'Medical Transport Billing',
    description: 'Patient-facing billing and claims access for transport services.',
    to: '/patient-portal',
  },
  {
    title: 'Fire-EMS Command',
    description: 'Incident coordination, apparatus readiness, and personnel tracking.',
    to: '/fire',
  },
  {
    title: 'HEMS Operations',
    description: 'Mission board, crew readiness, and aircraft oversight.',
    to: '/hems',
  },
  {
    title: 'Telehealth & Virtual Care',
    description: 'Remote clinical support and continuity of care pathways.',
    to: '/telehealth',
  },
  {
    title: 'Compliance & Legal Readiness',
    description: 'Audit trails, regulatory reporting, and legal hold management.',
    to: '/reporting',
  },
  {
    title: 'Founder Control Plane',
    description: 'Executive visibility across governance, exports, and oversight.',
    to: '/founder',
  },
]

function useLandingMetadata() {
  useEffect(() => {
    const title = 'FusionEMS Quantum | Regulated EMS Platform'
    const description =
      'The regulated, audit-defensible EMS operating system for agencies, hospitals, and compliance-driven partners.'
    const url = 'https://fusionems.com/'

    document.title = title

    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', description)

    const openGraphTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:type', content: 'website' },
    ]

    openGraphTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('property', property)
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', content)
    })

    const scriptId = 'plausible-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.defer = true
      script.dataset.domain = 'fusionems.com'
      script.src = 'https://plausible.io/js/script.js'
      document.body.appendChild(script)
    }
  }, [])
}

export default function Landing() {
  useLandingMetadata()

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingState />}>
        <MainContent />
      </Suspense>
    </ErrorBoundary>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    // hook for monitoring / analytics
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="landing-error">
          Something went wrong loading the homepage. Please try again later.
        </div>
      )
    }
    return this.props.children
  }
}

function LoadingState() {
  return (
    <div className="landing-loading">
      <span className="landing-loading__text">Loading homepage...</span>
    </div>
  )
}

function MainContent() {
  return (
    <div className="quantum-home" role="main" aria-label="Homepage main content">
      <header className="quantum-home__hero">
        <div className="quantum-home__hero-eyebrow">FusionEMS Quantum Platform</div>
        <h1 className="quantum-home__hero-title">Regulated EMS Operating System</h1>
        <p className="quantum-home__hero-subtitle">
          FusionEMS Quantum is the audit-defensible command layer for EMS, Fire-EMS, HEMS, and
          hospital-integrated medical transport. Built for regulated operations where every mission
          is traceable, accountable, and optimized.
        </p>
        <div className="quantum-home__hero-actions">
          <Link className="quantum-home__primary-action" to="/login">
            Secure Access
          </Link>
          <Link className="quantum-home__secondary-action" to="/register">
            Request Enterprise Access
          </Link>
          <Link className="quantum-home__tertiary-action" to="/provider-portal">
            Provider Gateway
          </Link>
        </div>
        <div className="quantum-home__hero-metrics">
          <div>
            <span className="quantum-home__metric-label">Regulatory posture</span>
            <span className="quantum-home__metric-value">HIPAA • NEMSIS • NFIRS</span>
          </div>
          <div>
            <span className="quantum-home__metric-label">Audit continuity</span>
            <span className="quantum-home__metric-value">Cryptographic trails & legal holds</span>
          </div>
          <div>
            <span className="quantum-home__metric-label">Mission assurance</span>
            <span className="quantum-home__metric-value">Command-ready 24/7</span>
          </div>
        </div>
      </header>

      <section className="quantum-home__section">
        <div className="quantum-home__section-header">
          <h2>Platform Gateways</h2>
          <p>
            Every portal is a hardened entry point with role-aware access, compliance context, and
            operational oversight.
          </p>
        </div>
        <div className="quantum-home__portal-grid">
          {portalCards.map((card) => (
            <Link key={card.title} className="quantum-home__portal-card" to={card.to}>
              <div className="quantum-home__portal-card-header">
                <span>{card.title}</span>
                <span aria-hidden="true">→</span>
              </div>
              <p>{card.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="quantum-home__section quantum-home__authority">
        <div className="quantum-home__section-header">
          <h2>Operational Authority</h2>
          <p>
            Designed for agencies that answer to regulators, boards, and mission-critical outcomes.
            FusionEMS Quantum delivers clarity, accountability, and executive-grade visibility.
          </p>
        </div>
        <div className="quantum-home__authority-grid">
          <div>
            <h3>Compliance Embedded</h3>
            <p>
              Automated policy enforcement, cryptographic audit trails, and regulatory reporting keep
              every mission defensible.
            </p>
          </div>
          <div>
            <h3>Command-Grade Visibility</h3>
            <p>
              Unified oversight across dispatch, clinical, billing, and governance with decisive
              decision support.
            </p>
          </div>
          <div>
            <h3>Enterprise Readiness</h3>
            <p>
              Integrations and workflows tailored to hospital partners, compliance officers, and
              public sector leadership.
            </p>
          </div>
        </div>
      </section>

      <footer className="quantum-home__footer">
        © {new Date().getFullYear()} FusionEMS Quantum — Enterprise EMS Platform
      </footer>
    </div>
  )
}
