"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface WisconsinTemplate {
  id: number
  template_name: string
  template_version: string
  tax_exempt_compliant: boolean
  approved_by_compliance: boolean
  approved_at: string
  active: boolean
}

interface BillingHealthSnapshot {
  id: number
  snapshot_date: string
  tax_exempt_compliance_score: number
  statements_sent: number
  statements_tax_exempt: number
  escalation_triggered_count: number
  avg_billing_turnaround_days: number
}

interface WisconsinConfig {
  id: number
  organization_id: number
  tax_exempt_medical_transport: boolean
  auto_escalation_enabled: boolean
  escalation_threshold_days: number
  default_template_id: number | null
}

export default function WisconsinBillingDashboard() {
  const [templates, setTemplates] = useState<WisconsinTemplate[]>([])
  const [healthSnapshots, setHealthSnapshots] = useState<BillingHealthSnapshot[]>([])
  const [config, setConfig] = useState<WisconsinConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWisconsinData()
    const interval = setInterval(fetchWisconsinData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchWisconsinData = async () => {
    try {
      const [templatesData, healthData, configData] = await Promise.all([
        apiFetch<WisconsinTemplate[]>("/api/wisconsin-billing/templates"),
        apiFetch<BillingHealthSnapshot[]>("/api/wisconsin-billing/health?limit=7"),
        apiFetch<WisconsinConfig>("/api/wisconsin-billing/config")
      ])
      setTemplates(templatesData)
      setHealthSnapshots(healthData)
      setConfig(configData)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <div className="flex items-center justify-center h-screen">
              <p className="text-xl text-gray-400">Loading Wisconsin billing...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const latestHealth = healthSnapshots[0]
  const activeTemplates = templates.filter(t => t.active)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold mb-2">
                Wisconsin Billing Module
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">State-Specific Billing Compliance</h2>
              <p className="text-gray-400">
                Tax-exempt medical transport rules, pre-approved templates, and billing health monitoring for Wisconsin operations.
              </p>
            </header>

            {/* Configuration Overview */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Wisconsin Configuration</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Tax-Exempt Medical Transport</p>
                  <p className="text-white text-lg font-semibold">
                    {config?.tax_exempt_medical_transport ? "✓ Enabled" : "✗ Disabled"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Auto Escalation</p>
                  <p className="text-white text-lg font-semibold">
                    {config?.auto_escalation_enabled ? "✓ Enabled" : "✗ Disabled"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Escalation Threshold</p>
                  <p className="text-white text-lg font-semibold">{config?.escalation_threshold_days} days</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Active Templates</p>
                  <p className="text-white text-lg font-semibold">{activeTemplates.length}</p>
                </div>
              </div>
            </section>

            {/* Billing Health Dashboard */}
            {latestHealth && (
              <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Billing Health Dashboard</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-950 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Tax Compliance Score</p>
                    <p className={`text-2xl font-bold ${latestHealth.tax_exempt_compliance_score >= 95 ? 'text-green-400' : latestHealth.tax_exempt_compliance_score >= 85 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {latestHealth.tax_exempt_compliance_score}%
                    </p>
                  </div>
                  <div className="bg-gray-950 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Statements Sent</p>
                    <p className="text-white text-2xl font-bold">{latestHealth.statements_sent}</p>
                  </div>
                  <div className="bg-gray-950 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Tax-Exempt</p>
                    <p className="text-white text-2xl font-bold">{latestHealth.statements_tax_exempt}</p>
                  </div>
                  <div className="bg-gray-950 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Escalations</p>
                    <p className="text-white text-2xl font-bold">{latestHealth.escalation_triggered_count}</p>
                  </div>
                  <div className="bg-gray-950 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Avg Turnaround</p>
                    <p className="text-white text-2xl font-bold">{latestHealth.avg_billing_turnaround_days}d</p>
                  </div>
                </div>
              </section>
            )}

            {/* Pre-Approved Templates */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Pre-Approved Statement Templates</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Compliance-approved templates for Wisconsin medical transport billing with tax-exempt rules embedded.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Template Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Version</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Tax-Exempt Compliant</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Compliance Approved</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Approved Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template.id} className="border-b border-gray-800 hover:bg-gray-800 transition">
                        <td className="p-4 text-white font-medium">{template.template_name}</td>
                        <td className="p-4 text-gray-400 text-sm font-mono">{template.template_version}</td>
                        <td className="p-4">
                          {template.tax_exempt_compliant ? (
                            <span className="text-green-400 text-sm">✓ Yes</span>
                          ) : (
                            <span className="text-gray-400 text-sm">✗ No</span>
                          )}
                        </td>
                        <td className="p-4">
                          {template.approved_by_compliance ? (
                            <span className="text-green-400 text-sm">✓ Approved</span>
                          ) : (
                            <span className="text-yellow-400 text-sm">Pending</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(template.approved_at)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${template.active ? 'bg-green-700 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                            {template.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Billing Health Trend */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">7-Day Billing Health Trend</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-400">Date</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-400">Compliance Score</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-400">Statements</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-400">Tax-Exempt</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-400">Escalations</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-400">Turnaround</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthSnapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="border-b border-gray-800">
                        <td className="p-3 text-gray-400 text-sm">{formatDate(snapshot.snapshot_date)}</td>
                        <td className="p-3">
                          <span className={`text-sm font-semibold ${snapshot.tax_exempt_compliance_score >= 95 ? 'text-green-400' : snapshot.tax_exempt_compliance_score >= 85 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {snapshot.tax_exempt_compliance_score}%
                          </span>
                        </td>
                        <td className="p-3 text-white text-sm">{snapshot.statements_sent}</td>
                        <td className="p-3 text-white text-sm">{snapshot.statements_tax_exempt}</td>
                        <td className="p-3 text-white text-sm">{snapshot.escalation_triggered_count}</td>
                        <td className="p-3 text-white text-sm">{snapshot.avg_billing_turnaround_days}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
