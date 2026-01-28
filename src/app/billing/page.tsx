"use client"

import { useState } from "react"
import Link from "next/link"
import Logo from "@/components/Logo"
import TrustBadge from "@/components/marketing/TrustBadge"

export default function BillingPage() {
  const [formData, setFormData] = useState({
    accountNumber: "",
    zipCode: "",
    amount: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    if (!formData.accountNumber || !formData.zipCode) {
      setError("Please enter your account number and ZIP code")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/billing/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: formData.accountNumber,
          zipCode: formData.zipCode,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Account found:", data)
      } else {
        setError("Account not found. Please verify your information.")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("An error occurred. Please try again.")
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
            <Link href="/portals" className="nav-item">
              PORTALS
            </Link>
            <Link href="/#contact" className="nav-item">
              DEMO
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
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="eyebrow inline-block mb-4">Patient Portal</div>
            <h1 className="text-5xl font-black text-white mb-4">
              Pay a Medical Bill
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              Secure payment processing for EMS services. Enter your account information below to view and pay your bill.
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-900/50 to-black border-2 border-orange-500/20 rounded-2xl p-8 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-bold text-gray-300 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  required
                  value={formData.accountNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none transition"
                  placeholder="Enter your account number"
                />
              </div>

              <div>
                <label htmlFor="zipCode" className="block text-sm font-bold text-gray-300 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  required
                  value={formData.zipCode}
                  onChange={handleChange}
                  maxLength={5}
                  pattern="[0-9]{5}"
                  className="w-full px-4 py-3 bg-black border-2 border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none transition"
                  placeholder="12345"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the ZIP code associated with the service address
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Looking up account..." : "Continue to Payment"}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-xs text-gray-400 font-semibold">PCI-DSS Compliant</p>
                </div>
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs text-gray-400 font-semibold">256-bit SSL Encryption</p>
                </div>
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-xs text-gray-400 font-semibold">Secure Payment Gateway</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Need help? Contact our billing support team
                </p>
                <div className="flex justify-center gap-6 text-sm">
                  <a href="tel:1-800-555-0123" className="text-orange-400 hover:text-orange-300 transition">
                    📞 1-800-555-0123
                  </a>
                  <a href="mailto:billing@fusionems.com" className="text-orange-400 hover:text-orange-300 transition">
                    ✉️ billing@fusionems.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="flex justify-center gap-24 flex-wrap mb-6">
              <TrustBadge icon="lock" text="HIPAA-Compliant" />
              <TrustBadge icon="shield" text="Secure Processing" />
              <TrustBadge icon="headset" text="24/7 Support" />
            </div>
            <p className="text-xs text-gray-500">
              All transactions are encrypted and processed securely. We never store your full payment information.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-orange-500/20 bg-black/50 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-orange-500 font-bold tracking-widest uppercase text-sm">
            TRUSTED BY THE WORLD'S LEADING EMS ORGANIZATIONS
          </p>
        </div>
      </footer>
    </div>
  )
}
