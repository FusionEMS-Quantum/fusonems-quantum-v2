"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Logo from "@/components/Logo"

type AreaType = "rural" | "suburban" | "urban"

// Internal pricing (not displayed) — used for ROI modeling only
const BILLING_BASE_MONTHLY = 750
const PER_TRANSPORT_LOW = 8
const PER_TRANSPORT_HIGH = 12

const TRANSPORT_RANGES: Record<AreaType, [number, number]> = {
  rural: [40, 120],
  suburban: [200, 600],
  urban: [800, 2000],
}

function formatRange(a: number, b: number): string {
  return `$${Math.round(a).toLocaleString()}–$${Math.round(b).toLocaleString()}`
}

export default function ROIEstimatorPage() {
  const [zipCode, setZipCode] = useState("")
  const [areaType, setAreaType] = useState<AreaType>("suburban")
  const [avgReimbursement, setAvgReimbursement] = useState(450)
  const [denialReduction, setDenialReduction] = useState(5.5)
  const [manualVolume, setManualVolume] = useState<number | "">("")

  const [tMin, tMax] = manualVolume !== ""
    ? [manualVolume, manualVolume] as [number, number]
    : TRANSPORT_RANGES[areaType]

  const results = useMemo(() => {
    const denialPct = denialReduction / 100
    const rMin = tMin * avgReimbursement * denialPct
    const rMax = tMax * avgReimbursement * denialPct
    const cMin = BILLING_BASE_MONTHLY + tMin * PER_TRANSPORT_LOW
    const cMax = BILLING_BASE_MONTHLY + tMax * PER_TRANSPORT_HIGH
    const nMin = rMin - cMax
    const nMax = rMax - cMin
    return {
      transports: [tMin, tMax],
      recovered: [rMin, rMax],
      cost: [cMin, cMax],
      net: [nMin, nMax],
    }
  }, [tMin, tMax, avgReimbursement, denialReduction])

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
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/demo" className="text-sm text-orange-400 hover:text-orange-300 font-medium">
              Request a Demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">
          Estimate Your Transport Billing ROI
        </h1>

        <p className="text-zinc-300 leading-relaxed mb-8">
          Transport billing outcomes are shaped by operational and documentation decisions made throughout the response—not just at submission.
          FusionEMS Quantum reduces billing loss by eliminating handoffs between dispatch, clinical care, documentation, telehealth, and facility scheduling.
          This page provides a conservative estimate of potential financial impact using clearly stated assumptions and realistic service-area modeling.
        </p>
        <p className="text-zinc-400 text-sm italic mb-6">
          This estimator is intended to support planning and discussion, not to predict exact reimbursement outcomes.
        </p>

        <h2 className="text-xl font-semibold text-white mb-3">
          Why Workflow Impacts Reimbursement
        </h2>
        <p className="text-zinc-300 mb-6">
          Billing outcomes are determined upstream—at dispatch, documentation, clinical justification, and facility coordination—not only at claim submission. When data stays connected across these stages, denial risk drops and reimbursement becomes more predictable.
        </p>

        <h2 className="text-xl font-semibold text-white mb-3">
          How EMS Billing ROI Is Estimated
        </h2>
        <p className="text-zinc-300 mb-6">
          This estimate uses typical transport volumes based on service-area characteristics, modest conservative improvements in billing defensibility, and a transparent base-plus-usage billing model. Results are shown as ranges, not single values, to avoid false precision.
        </p>

        <h2 className="text-xl font-semibold text-white mb-4">
          Enter Your Information
        </h2>

        <div className="space-y-6 mb-10">
          <div>
            <label htmlFor="zip" className="block text-sm font-medium text-zinc-300 mb-1">
              ZIP Code
            </label>
            <input
              id="zip"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="Enter the ZIP code that best represents your primary service area"
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium text-zinc-300 mb-1">
              Area Type
            </label>
            <select
              id="area"
              value={areaType}
              onChange={(e) => setAreaType(e.target.value as AreaType)}
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="rural">Rural</option>
              <option value="suburban">Suburban</option>
              <option value="urban">Urban</option>
            </select>
            <p className="text-xs text-zinc-500 mt-1">Auto-selected if possible; always overrideable</p>
          </div>

          <div>
            <label htmlFor="avg" className="block text-sm font-medium text-zinc-300 mb-1">
              Average Reimbursement per Transport ($)
            </label>
            <input
              id="avg"
              type="number"
              min={100}
              max={2000}
              value={avgReimbursement}
              onChange={(e) => setAvgReimbursement(Math.max(0, Number(e.target.value) || 0))}
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500 mt-1">A default value is provided; adjust to reflect your payer mix</p>
          </div>

          <div>
            <label htmlFor="denial" className="block text-sm font-medium text-zinc-300 mb-1">
              Conservative Denial Reduction Assumption (%)
            </label>
            <input
              id="denial"
              type="number"
              min={1}
              max={15}
              step={0.5}
              value={denialReduction}
              onChange={(e) => setDenialReduction(Math.max(0, Math.min(15, Number(e.target.value) || 0)))}
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500 mt-1">Modest improvement from better documentation continuity (default 5–6%)</p>
          </div>

          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-zinc-300 mb-1">
              Optional: Monthly Transport Volume
            </label>
            <input
              id="volume"
              type="number"
              min={0}
              value={manualVolume === "" ? "" : manualVolume}
              onChange={(e) => {
                const v = e.target.value
                setManualVolume(v === "" ? "" : Math.max(0, Number(v) || 0))
              }}
              placeholder="If known, enter your approximate monthly volume"
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500 mt-1">Otherwise, a typical range will be used</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-3">
          ZIP-Based Service Area Modeling
        </h2>
        <p className="text-zinc-300 mb-4">
          Typical monthly transport ranges used: Rural 40–120, Suburban 200–600, Urban 800–2,000+.
          Ranges are intentionally broad and conservative.
        </p>

        <div className="bg-zinc-900/80 border border-zinc-700 rounded-xl p-6 mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">Estimated Monthly Impact</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-zinc-400">Estimated monthly transports</dt>
              <dd className="text-white font-medium">
                {results.transports[0] === results.transports[1]
                  ? results.transports[0].toLocaleString()
                  : `${results.transports[0].toLocaleString()}–${results.transports[1].toLocaleString()}`}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-400">Estimated recovered revenue</dt>
              <dd className="text-green-400 font-medium">
                {formatRange(results.recovered[0], results.recovered[1])}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-400">Estimated billing cost</dt>
              <dd className="text-zinc-300 font-medium">
                {formatRange(results.cost[0], results.cost[1])}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-400">Estimated net financial impact</dt>
              <dd className={`font-medium ${results.net[1] >= 0 ? "text-green-400" : "text-amber-400"}`}>
                {formatRange(results.net[0], results.net[1])}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-zinc-500 mt-4">All values shown are estimates.</p>
        </div>

        <h2 className="text-xl font-semibold text-white mb-3">
          How These Numbers Are Calculated
        </h2>
        <p className="text-zinc-300 mb-6">
          Recovered revenue reflects modest improvements in documentation quality and billing defensibility.
          Billing cost reflects a predictable base platform fee plus per-transport usage.
          No percentage-of-revenue billing is used.
        </p>

        <h2 className="text-xl font-semibold text-white mb-3">
          Conservative, Transparent Assumptions
        </h2>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-10">
          <p className="text-zinc-300 text-sm">
            Estimates vary based on payer mix, transport types, documentation practices, and operational workflows.
            Results shown are not guarantees of reimbursement or financial performance.
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
          >
            Request a Customized Analysis
          </Link>
          <p className="text-sm text-zinc-500 mt-4">
            <Link href="/#billing" className="text-orange-400 hover:underline">
              Back to Billing
            </Link>
            {" · "}
            <Link href="/pricing" className="text-orange-400 hover:underline">
              Pricing structure
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
