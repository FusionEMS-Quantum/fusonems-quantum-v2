"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface PatientStatement {
  id: number
  statement_number: string
  patient_id: number
  patient_name: string
  statement_date: string
  due_date: string
  total_charges: number
  insurance_paid: number
  adjustments: number
  patient_responsibility: number
  amount_paid: number
  balance_due: number
  lifecycle_state: string
  preferred_channel: string
  sent_via: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  paid_at: string | null
  ai_generated: boolean
  ai_decision_confidence: number
}

interface BillingAuditLog {
  id: number
  statement_id: number
  action_type: string
  action_description: string
  actor: string
  ai_executed: boolean
  created_at: string
}

interface SoleBillerConfig {
  id: number
  autonomous_threshold: number
  auto_send_enabled: boolean
  email_to_physical_failover_days: number
  lob_api_key_configured: boolean
  postmark_api_key_configured: boolean
}

export default function SoleBillerDashboard() {
  const [statements, setStatements] = useState<PatientStatement[]>([])
  const [auditLogs, setAuditLogs] = useState<BillingAuditLog[]>([])
  const [config, setConfig] = useState<SoleBillerConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [selectedStatement, setSelectedStatement] = useState<PatientStatement | null>(null)
  const [showNewStatementModal, setShowNewStatementModal] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statementsData, configData, auditData] = await Promise.all([
        apiFetch<PatientStatement[]>("/api/founder-billing/statements"),
        apiFetch<SoleBillerConfig>("/api/founder-billing/config"),
        apiFetch<BillingAuditLog[]>("/api/founder-billing/audit-logs?limit=20")
      ])
      setStatements(statementsData)
      setConfig(configData)
      setAuditLogs(auditData)
      setLoading(false)
    } catch (err) {
      setError("Failed to load sole biller dashboard")
      setLoading(false)
    }
  }

  const handleGenerateStatement = async (patientId: number) => {
    try {
      await apiFetch("/api/founder-billing/generate-statement", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId })
      })
      fetchDashboardData()
    } catch (err) {
      alert("Failed to generate statement")
    }
  }

  const handleSendStatement = async (statementId: number) => {
    try {
      await apiFetch("/api/founder-billing/send-statement", {
        method: "POST",
        body: JSON.stringify({ statement_id: statementId })
      })
      fetchDashboardData()
    } catch (err) {
      alert("Failed to send statement")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getLifecycleColor = (state: string) => {
    const colors: Record<string, string> = {
      drafted: "bg-gray-700 text-gray-300",
      finalized: "bg-blue-700 text-blue-300",
      sent: "bg-yellow-700 text-yellow-300",
      delivered: "bg-purple-700 text-purple-300",
      opened: "bg-indigo-700 text-indigo-300",
      paid: "bg-green-700 text-green-300",
      escalated: "bg-red-700 text-red-300",
      failed: "bg-red-900 text-red-300"
    }
    return colors[state] || colors.drafted
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <div className="flex items-center justify-center h-screen">
              <p className="text-xl text-gray-400">Loading sole biller dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const draftedStatements = statements.filter(s => s.lifecycle_state === "drafted")
  const sentStatements = statements.filter(s => ["sent", "delivered", "opened"].includes(s.lifecycle_state))
  const paidStatements = statements.filter(s => s.lifecycle_state === "paid")
  const escalatedStatements = statements.filter(s => s.lifecycle_state === "escalated")

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold mb-2">
                Founder Billing Console
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Sole Biller Mode — AI-Managed Billing</h2>
              <p className="text-gray-400">
                AI operates under delegated Founder authority. Autonomous statement generation, channel selection, and delivery.
              </p>
            </header>

            {/* Configuration Status */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">AI Autonomous Configuration</h3>
                <Link 
                  href="/founder/billing/sole-biller/config" 
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Edit Config
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Autonomous Threshold</p>
                  <p className="text-white text-lg font-semibold">{formatCurrency(config?.autonomous_threshold || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Auto-Send Enabled</p>
                  <p className="text-white text-lg font-semibold">{config?.auto_send_enabled ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Email Failover Days</p>
                  <p className="text-white text-lg font-semibold">{config?.email_to_physical_failover_days || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Lob & Postmark</p>
                  <p className="text-white text-lg font-semibold">
                    {config?.lob_api_key_configured && config?.postmark_api_key_configured ? "✓ Configured" : "⚠ Incomplete"}
                  </p>
                </div>
              </div>
            </section>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-blue-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Drafted Statements</p>
                <p className="text-white text-2xl font-bold">{draftedStatements.length}</p>
              </div>
              <div className="bg-gray-900 border border-yellow-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Sent / In Flight</p>
                <p className="text-white text-2xl font-bold">{sentStatements.length}</p>
              </div>
              <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Paid</p>
                <p className="text-white text-2xl font-bold">{paidStatements.length}</p>
              </div>
              <div className="bg-gray-900 border border-red-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Escalated</p>
                <p className="text-white text-2xl font-bold">{escalatedStatements.length}</p>
              </div>
            </div>

            {/* Statements Table */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Patient Statements</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Statement #</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Patient</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Balance Due</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Due Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Lifecycle</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Sent Via</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">AI Generated</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((statement) => (
                      <tr 
                        key={statement.id} 
                        className="border-b border-gray-800 hover:bg-gray-800 transition cursor-pointer"
                        onClick={() => setSelectedStatement(statement)}
                      >
                        <td className="p-4 text-white font-mono text-sm">{statement.statement_number}</td>
                        <td className="p-4 text-white">{statement.patient_name}</td>
                        <td className="p-4 text-white font-semibold">{formatCurrency(statement.balance_due)}</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(statement.due_date)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getLifecycleColor(statement.lifecycle_state)}`}>
                            {statement.lifecycle_state}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{statement.sent_via || "—"}</td>
                        <td className="p-4">
                          {statement.ai_generated && (
                            <span className="text-purple-400 text-xs">
                              AI {(statement.ai_decision_confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {statement.lifecycle_state === "drafted" && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendStatement(statement.id)
                              }}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition"
                            >
                              Send
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {statements.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No statements found. Generate your first statement to get started.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Audit Trail */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Billing Audit Trail</h3>
                <p className="text-gray-400 text-sm mt-1">Full transparency: AI actions logged with "Action executed by AI agent under Founder billing authority"</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Timestamp</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Action</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Description</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Actor</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">AI Executed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-800">
                        <td className="p-4 text-gray-400 text-sm">{formatDate(log.created_at)}</td>
                        <td className="p-4 text-white text-sm font-mono">{log.action_type}</td>
                        <td className="p-4 text-gray-300 text-sm">{log.action_description}</td>
                        <td className="p-4 text-gray-400 text-sm">{log.actor}</td>
                        <td className="p-4">
                          {log.ai_executed && (
                            <span className="text-purple-400 text-xs font-medium">AI Agent</span>
                          )}
                        </td>
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
