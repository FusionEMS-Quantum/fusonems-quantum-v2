"use client"

import Link from "next/link"
import { useState } from "react"

const modules = [
  { 
    name: "CAD", 
    desc: "Computer-Aided Dispatch", 
    link: "/cad",
    features: ["Real-time 911 dispatch", "AI-powered routing", "Resource optimization", "Unit tracking"],
    gradient: "from-red-600 to-orange-600",
    badge: "Mission Critical"
  },
  { 
    name: "ePCR", 
    desc: "Electronic Patient Care Reports", 
    link: "/epcr",
    features: ["NEMSIS 3.5 compliant", "Auto-narratives", "Offline capable", "Protocol integration"],
    gradient: "from-blue-600 to-cyan-600",
    badge: "Clinical"
  },
  { 
    name: "Billing", 
    desc: "Revenue Cycle Management", 
    link: "/billing/dashboard",
    features: ["Automated collections", "Denial management AI", "Payment plans", "Insurance verification"],
    gradient: "from-emerald-600 to-teal-600",
    badge: "Financial"
  },
  { 
    name: "Operations", 
    desc: "Fleet & Crew Management", 
    link: "/fleet",
    features: ["Crew scheduling", "Fleet GPS tracking", "DVIR compliance", "Maintenance logs"],
    gradient: "from-violet-600 to-purple-600",
    badge: "Logistics"
  },
  { 
    name: "Analytics", 
    desc: "Quantum Intelligence Engine", 
    link: "/founder",
    features: ["Executive dashboards", "Predictive analytics", "Custom KPIs", "AI briefings"],
    gradient: "from-amber-600 to-orange-600",
    badge: "Intelligence"
  },
  { 
    name: "Compliance", 
    desc: "Regulatory Hub", 
    link: "/founder/compliance/cms",
    features: ["HIPAA controls", "DEA tracking", "CMS billing rules", "Audit trails"],
    gradient: "from-rose-600 to-pink-600",
    badge: "Regulatory"
  },
]

const portals = [
  { 
    name: "EMS Portal", 
    desc: "Crew operations, scheduling, and documentation", 
    link: "/login",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    users: "Paramedics, EMTs, Dispatchers"
  },
  { 
    name: "Agency Portal", 
    desc: "Third-party billing agency management", 
    link: "/agency",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    users: "Billing Partners, Collection Agencies"
  },
  { 
    name: "Patient Portal", 
    desc: "Bill pay, records access, and inquiries", 
    link: "/billing",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    users: "Patients, Legal Guardians"
  },
  { 
    name: "Founder Portal", 
    desc: "Executive analytics and system control", 
    link: "/founder",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    users: "Executives, Administrators"
  },
]

const integrations = [
  { 
    name: "NEMSIS 3.5", 
    desc: "National EMS data standard compliance",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    )
  },
  { 
    name: "Telnyx", 
    desc: "Enterprise communications platform",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )
  },
  { 
    name: "Stripe", 
    desc: "PCI-compliant payment processing",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
  { 
    name: "Telehealth", 
    desc: "Remote patient monitoring integration",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
]

const stats = [
  { value: "500+", label: "EMS Agencies" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "24/7", label: "Support" },
  { value: "HIPAA", label: "Compliant" },
]

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-black text-lg">Q</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-black text-lg tracking-tight">FusionEMS Quantum</div>
              <div className="text-[10px] text-gray-500 tracking-widest uppercase">Enterprise EMS Platform</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="#modules" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              Modules
            </Link>
            <Link href="#portals" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              Portals
            </Link>
            <Link href="#integrations" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              Integrations
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/demo" 
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-semibold tracking-wider uppercase mb-8">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                Enterprise EMS Operating System
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
                The Complete Platform for
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  Modern EMS Operations
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Six integrated modules powering dispatch, patient care, billing, fleet operations, analytics, and compliance for emergency medical services.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="/demo" 
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/30 transition-all"
                >
                  Request Demo
                </Link>
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-lg hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  Sign In to Platform
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl sm:text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className="py-20 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Modules</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Six integrated modules powering your entire EMS operation
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module, i) => (
                <Link
                  key={i}
                  href={module.link}
                  className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex px-3 py-1.5 rounded-lg bg-gradient-to-r ${module.gradient} text-white text-xs font-bold tracking-wide`}>
                      {module.name}
                    </div>
                    <span className="text-[10px] text-gray-600 font-medium tracking-wider uppercase">{module.badge}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">
                    {module.desc}
                  </h3>
                  <ul className="space-y-2 mb-6">
                    {module.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-orange-500 text-sm font-semibold">
                    <span>Explore Module</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="portals" className="py-20 px-4 sm:px-6 border-t border-white/5 bg-gradient-to-b from-transparent to-orange-500/[0.02]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Portals</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Role-based portals for every stakeholder in your operation
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {portals.map((portal, i) => (
                <Link
                  key={i}
                  href={portal.link}
                  className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-orange-500/30 hover:bg-white/[0.04] transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-orange-500 mb-4 group-hover:border-orange-500/30 group-hover:shadow-lg group-hover:shadow-orange-500/10 transition-all">
                    {portal.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {portal.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{portal.desc}</p>
                  <p className="text-xs text-gray-600">{portal.users}</p>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link 
                href="/portals" 
                className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:gap-3 transition-all"
              >
                <span>View All Portals</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        <section id="integrations" className="py-20 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Enterprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Integrations</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Pre-built connections with industry-leading platforms
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {integrations.map((integration, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                    {integration.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{integration.name}</div>
                    <div className="text-xs text-gray-500">{integration.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-orange-500/10 to-red-600/5 border border-orange-500/20 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
                Ready to Transform Your EMS?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Join 500+ agencies using FusionEMS Quantum to streamline operations, improve patient outcomes, and maximize revenue.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="/demo" 
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold hover:shadow-2xl hover:shadow-orange-500/30 transition-all"
                >
                  Request Demo
                </Link>
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
                >
                  Start Free Trial
                </Link>
              </div>
              <p className="text-xs text-gray-600 mt-6">
                14-day trial - No credit card required - 24/7 support
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <span className="text-white font-black text-sm">Q</span>
                </div>
                <span className="text-white font-bold">FusionEMS Quantum</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enterprise EMS Operating System for modern emergency services.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <div className="space-y-2">
                <Link href="/#modules" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Modules</Link>
                <Link href="/portals" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Portals</Link>
                <Link href="/#integrations" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Integrations</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <div className="space-y-2">
                <Link href="/demo" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Request Demo</Link>
                <Link href="/billing" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Pay Bill</Link>
                <Link href="/login" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">+1-719-254-3027</p>
                <p className="text-sm text-gray-500">support@fusionemsquantum.com</p>
                <p className="text-sm text-emerald-500 font-medium">24/7 Available</p>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              2024 FusionEMS Quantum. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Terms</Link>
              <Link href="/security" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
