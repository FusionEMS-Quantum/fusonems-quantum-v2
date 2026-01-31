"use client"

import Link from "next/link"
import Logo from "@/components/Logo"
import { Check, X } from "lucide-react"

export default function SchedulingLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="header" height={40} />
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/#modules"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Platform
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/demo?product=scheduling"
              className="text-sm text-orange-400 hover:text-orange-300 font-medium"
            >
              Request a Demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            FusionEMS Scheduling
          </h1>
          <p className="text-xl text-zinc-300">
            Standalone Crew Scheduling Built for EMS Agencies
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">The Problem</h2>
          <p className="text-zinc-300 mb-4">
            EMS agencies need reliable crew scheduling—but most tools either
            overcomplicate the process or require buying an entire operations
            platform just to manage shifts.
          </p>
          <p className="text-zinc-300">
            Schedulers are left juggling availability, overtime, swaps, and
            coverage across spreadsheets, emails, and disconnected systems.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">
            The Solution
          </h2>
          <p className="text-zinc-300 mb-4">
            FusionEMS Scheduling is a standalone, EMS-focused scheduling system
            designed for real-world operations.
          </p>
          <p className="text-zinc-300">
            Agencies can manage shifts, availability, time off, and staffing
            visibility without requiring CAD, billing, or documentation systems.
            Use it on its own—or integrate it into the broader FusionEMS Quantum
            platform as your needs grow.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-6">
            What FusionEMS Scheduling Handles
          </h2>
          <ul className="space-y-3">
            {[
              "Shift-based scheduling (24s, 12s, mixed models)",
              "Crew availability and preferences",
              "Time-off and leave tracking",
              "Shift trades and coverage visibility",
              "Role-based access (scheduler, supervisor, command)",
              "Agency-wide staffing awareness",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-zinc-400 text-sm mt-4 italic">
            Designed to work the way EMS actually staffs units.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Built for EMS Operations
          </h2>
          <p className="text-zinc-300 mb-4">
            FusionEMS Scheduling is designed specifically for EMS agencies—not
            hospitals, not generic workforce tools.
          </p>
          <p className="text-zinc-300 mb-4">It supports:</p>
          <ul className="space-y-2 text-zinc-300 mb-4">
            <li>• Variable staffing models</li>
            <li>• Operational roles instead of HR roles</li>
            <li>• Schedule visibility without administrative overload</li>
          </ul>
          <p className="text-zinc-400 font-medium">
            No per-user fees. No artificial limits on schedules or shifts.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Standalone or Integrated
          </h2>
          <p className="text-zinc-300 mb-4">Agencies can:</p>
          <ul className="space-y-2 text-zinc-300 mb-4">
            <li>• Use Scheduling as a standalone product</li>
            <li>• Add it alongside other FusionEMS modules</li>
            <li>• Upgrade to full platform integration over time</li>
          </ul>
          <p className="text-zinc-400">
            Scheduling works independently and does not require billing or
            dispatch systems.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">Pricing</h2>
          <p className="text-zinc-300 mb-4">
            FusionEMS Scheduling is priced per agency, not per user.
          </p>
          <ul className="space-y-2 text-zinc-300 mb-4">
            <li>• Unlimited users</li>
            <li>• Unlimited schedules</li>
            <li>• Unlimited shifts</li>
          </ul>
          <p className="text-zinc-400 mb-2">
            Flat monthly pricing per agency.
          </p>
          <p className="text-zinc-500 text-sm italic">
            Exact pricing available during demos or proposals.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Scope & Limitations
          </h2>
          <p className="text-zinc-300 mb-4">
            FusionEMS Scheduling focuses on operational crew scheduling.
            Payroll, HR, and labor management systems remain the agency&apos;s
            system of record.
          </p>
          <p className="text-zinc-400 text-sm mb-4">
            FusionEMS Scheduling does <strong>not</strong>:
          </p>
          <ul className="space-y-2">
            {[
              "Replace payroll systems",
              "Calculate pay rates or payroll exports",
              "Serve as an HR system of record",
              "Manage union contracts or labor negotiations",
              "Track certifications or credentialing",
              "Enforce labor law compliance automatically",
              "Replace command-level staffing decisions",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-zinc-400">
                <X className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-zinc-800 pt-12 text-center">
          <Link
            href="/demo?product=scheduling"
            className="inline-flex items-center justify-center px-10 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-lg transition-colors"
          >
            Request a Scheduling Demo
          </Link>
          <p className="text-zinc-500 text-sm mt-4">
            Demo-led onboarding. We&apos;ll discuss your agency size and staffing
            model before scheduling a walkthrough.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-center gap-6">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm">
            Back to Platform
          </Link>
          <Link href="/pricing" className="text-zinc-400 hover:text-white text-sm">
            Pricing
          </Link>
          <Link
            href="/demo?product=scheduling"
            className="text-orange-400 hover:text-orange-300 font-medium text-sm"
          >
            Request a Demo
          </Link>
        </div>
      </main>
    </div>
  )
}
