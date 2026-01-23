import React, { Suspense, useEffect } from 'react'
import { Link } from 'react-router-dom'

/* =========================
   Metadata + Analytics
   ========================= */
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

/* =========================
   Page
   ========================= */
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

/* =========================
   Error Boundary
   ========================= */
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
        <div role="alert" className="px-8 py-16 text-center text-red-400">
          Something went wrong loading the homepage. Please try again later.
        </div>
      )
    }
    return this.props.children
  }
}

/* =========================
   Loading State
   ========================= */
function LoadingState() {
  return (
    <div className="flex w-full flex-col items-center justify-center py-24 text-[var(--text-muted)]">
      <span className="animate-pulse">Loading homepage...</span>
    </div>
  )
}

/* =========================
   Main Content
   ========================= */
function MainContent() {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center"
      style={{
        background: 'linear-gradient(180deg, #181a1f 0%, #23262b 100%)',
      }}
      role="main"
      aria-label="Homepage main content"
    >
      {/* Hero */}
      <section className="flex w-full max-w-3xl flex-col items-center gap-10 border-b border-white/10 px-8 pb-16 pt-24">
        <h1
          className="text-center text-4xl font-extrabold uppercase tracking-[0.35em] text-white"
          tabIndex={0}
        >
          FusionEMS Quantum
        </h1>

        <p className="max-w-2xl text-center text-lg tracking-wide text-[var(--text-muted)]">
          The regulated, audit-defensible EMS operating system for agencies,
          hospitals, and compliance-driven partners.
        </p>

        <div className="mt-4 flex w-full flex-col gap-4 md:flex-row">
          <Link
            className="flex-1 rounded-full bg-[var(--orange)] px-6 py-4 text-lg font-bold text-black"
            to="/provider-portal"
            role="button"
          >
            Request Medical Transport
          </Link>

          <Link
            className="flex-1 rounded-full border border-[var(--orange)] bg-black/20 px-6 py-4 text-lg font-semibold text-[var(--orange)]"
            to="/login"
            role="button"
          >
            Access Platform
          </Link>

          <Link
            className="flex-1 rounded-full border border-white/10 bg-black/20 px-6 py-4 text-lg font-semibold text-white"
            to="/patient-portal"
            role="button"
          >
            Pay My Medical Transport Bill
          </Link>
        </div>

        <div className="mt-2 flex w-full flex-col gap-4 md:flex-row">
          <Link
            className="flex-1 rounded-full border border-white/10 bg-black/20 px-5 py-3 text-base font-semibold text-white"
            to="/telehealth"
            role="button"
          >
            CareFusion Telehealth
          </Link>

          <Link
            className="flex-1 rounded-full border border-white/10 bg-black/20 px-5 py-3 text-base font-semibold text-white"
            to="/dashboard"
            role="button"
          >
            MedicOS App Platform
          </Link>

          <Link
            className="flex-1 rounded-full border border-white/10 bg-black/20 px-5 py-3 text-base font-semibold text-white"
            to="/reporting"
            role="button"
          >
            Compliance &amp; Legal Readiness
          </Link>

          <Link
            className="flex-1 rounded-full border border-white/10 bg-black/20 px-5 py-3 text-base font-semibold text-white"
            to="/register"
            role="button"
          >
            Request Demo / Contact
          </Link>
        </div>
      </section>

      {/* Problem Section */}
      <section className="flex w-full max-w-3xl flex-col gap-6 border-b border-white/10 px-8 py-16">
        <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-white">
          The Problem
        </h2>

        <ul className="list-disc space-y-3 pl-6 text-base text-[var(--text-muted)]">
          <li>
            Legacy EMS software is fragmented and outdated, risking patient care
            and compliance.
          </li>
          <li>Medical transport and HEMS are underserved by generic platforms.</li>
          <li>
            Billing is delayed, manual, and exposes agencies to revenue loss and
            audit risk.
          </li>
          <li>
            Compliance exposure is real and growing—regulators expect
            cryptographic audit trails, not paper logs.
          </li>
          <li>
            Disconnected systems create data silos and operational blind spots.
          </li>
        </ul>
      </section>

      {/* Footer */}
      <footer className="mt-16 w-full pb-4 text-center text-xs text-[var(--text-muted)]">
        © {new Date().getFullYear()} FusionEMS Quantum — Enterprise EMS Platform
      </footer>
    </div>
  )
}
