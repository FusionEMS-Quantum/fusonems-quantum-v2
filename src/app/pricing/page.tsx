"use client"

import Link from "next/link"
import Logo from "@/components/Logo"
import { Check, X } from "lucide-react"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="header" height={40} />
          </Link>
          <nav className="flex gap-4">
            <Link href="/#billing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Billing
            </Link>
            <Link href="/billing/roi" className="text-sm text-orange-400 hover:text-orange-300 font-medium">
              Estimate ROI
            </Link>
            <Link href="/demo" className="text-sm text-orange-400 hover:text-orange-300 font-medium">
              Request a Demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-4">
          Pricing Structure
        </h1>
        <p className="text-zinc-300 text-lg mb-12">
          Transparent, usage-aligned pricing that replaces traditional third-party billing vendors while giving agencies more control.
        </p>

        <div className="space-y-8 mb-12">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              How Pricing Works
            </h2>
            <p className="text-zinc-300 mb-4">
              FusionEMS Quantum does not charge a percentage of collections.
              Pricing is presented as:
            </p>
            <ul className="space-y-2 text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span><strong className="text-white">Platform subscription</strong> — Core platform access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span><strong className="text-white">Billing base fee</strong> — Transport Billing Platform, monthly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span><strong className="text-white">Per-transport usage</strong> — Based on completed, billable transports</span>
              </li>
            </ul>
            <p className="text-zinc-400 text-sm mt-4 italic">
              Exact pricing is revealed during demos, after understanding transport volume and service type, or via the ROI calculator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              What Is Included
            </h2>
            <ul className="space-y-2">
              {[
                "AI-first billing automation supervised by humans",
                "Dispatch → documentation → billing continuity",
                "Claims submission and denial monitoring",
                "Exception handling and audit trails",
                "Transparent usage tracking and reporting",
                "Integration with CAD, ePCR, Transport Link, and FusionCare",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-zinc-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              What Is Not Included
            </h2>
            <p className="text-zinc-400 text-sm mb-3">
              To protect scalability and set clear expectations:
            </p>
            <ul className="space-y-2">
              {[
                "Full human call center or AR follow-up",
                "Manual appeals writing as a standard service",
                "Legal collections",
                "Patient financial counseling",
                "Guaranteed reimbursement outcomes",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-zinc-400">
                  <X className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-zinc-500 text-sm mt-4">
              The platform emphasizes automation, monitoring, exception handling, and transparency rather than manual labor.
            </p>
          </section>
        </div>

        <div className="border-t border-zinc-800 pt-10">
          <h2 className="text-xl font-semibold text-white mb-4">
            Estimate Your Impact
          </h2>
          <p className="text-zinc-300 mb-6">
            Use our conservative ROI calculator to model potential financial impact based on your service area and transport volume.
          </p>
          <Link
            href="/billing/roi"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
          >
            Estimate ROI by ZIP Code
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 text-center">
          <Link href="/demo" className="text-orange-400 hover:text-orange-300 font-medium">
            Request a Demo →
          </Link>
          <p className="text-zinc-500 text-sm mt-2">
            We tailor the demo to your transport volume and service type.
          </p>
        </div>
      </main>
    </div>
  )
}
