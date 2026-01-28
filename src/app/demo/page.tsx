"use client"

import { useState } from "react"
import Link from "next/link"
import Logo from "@/components/Logo"
import TrustBadge from "@/components/marketing/TrustBadge"

export default function DemoRequest() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    role: "",
    challenges: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
      }
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="homepage-wrapper">
      <header className="top-bar">
        <div className="top-bar-container">
          <Link href="/" className="logo-section">
            <Logo variant="header" height={48} />
          </Link>

          <nav className="quick-nav">
            <Link href="/#modules" className="nav-item">
              MODULES
            </Link>
            <Link href="/#stats" className="nav-item">
              PERFORMANCE
            </Link>
          </nav>

          <div className="top-bar-actions">
            <Link href="/login" className="btn-access">
              Launch →
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen py-24 px-6">
        <div className="max-w-4xl mx-auto">
          {!submitted ? (
            <div className="relative">
              <div className="text-center mb-12">
                <div className="eyebrow inline-block mb-4">Enterprise Demo Request</div>
                <h1 className="text-5xl font-black text-white mb-4">
                  Request a Demo
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  See how FusionEMS Quantum can transform your EMS operations. Our team will contact you within 24 hours to schedule a personalized demonstration.
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-900/50 to-black border-2 border-orange-500/20 rounded-2xl p-8 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-bold text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none transition"
                        placeholder="John Smith"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-bold text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none transition"
                        placeholder="john@ems.org"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="organization" className="block text-sm font-bold text-gray-300 mb-2">
                        Organization *
                      </label>
                      <input
                        type="text"
                        id="organization"
                        name="organization"
                        required
                        value={formData.organization}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none transition"
                        placeholder="Metropolitan EMS"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-bold text-gray-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none transition"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-bold text-gray-300 mb-2">
                      Your Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white focus:border-orange-400 focus:outline-none transition"
                    >
                      <option value="">Select your role</option>
                      <option value="ems-chief">EMS Chief / Director</option>
                      <option value="operations">Operations Director</option>
                      <option value="hospital-admin">Hospital Administrator</option>
                      <option value="it-manager">IT Manager</option>
                      <option value="compliance">Compliance Officer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="challenges" className="block text-sm font-bold text-gray-300 mb-2">
                      What challenges are you looking to solve? (Optional)
                    </label>
                    <textarea
                      id="challenges"
                      name="challenges"
                      rows={4}
                      value={formData.challenges}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none transition resize-none"
                      placeholder="Tell us about your current systems, pain points, and goals..."
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Submitting..." : "Request Demo"}
                    </button>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                      By submitting this form, you agree to our{" "}
                      <Link href="/privacy" className="text-orange-400 hover:underline">
                        Privacy Policy
                      </Link>
                      . We handle all data in accordance with HIPAA requirements.
                    </p>
                  </div>
                </form>
              </div>

              <div className="mt-12 text-center">
                <div className="flex justify-center gap-24 flex-wrap mb-8">
                  <TrustBadge icon="shield" text="NEMSIS-Compliant" />
                  <TrustBadge icon="lock" text="HIPAA-Aligned" />
                  <TrustBadge icon="activity" text="99.9% Uptime SLA" />
                  <TrustBadge icon="headset" text="24/7 Support" />
                </div>
                <p className="text-sm text-gray-500">
                  Trusted by 500+ EMS agencies nationwide
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="mb-8">
                <svg className="mx-auto h-24 w-24 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-4xl font-black text-white mb-4">
                Request Received
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
                Thank you for your interest in FusionEMS Quantum. Our enterprise team will contact you within 24 hours to schedule your personalized demo.
              </p>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Check your email at <span className="text-orange-400 font-semibold">{formData.email}</span> for confirmation.
                </p>
                <Link href="/" className="btn-primary inline-block">
                  Return to Homepage
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
