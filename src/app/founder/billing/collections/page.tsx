"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface CollectionsAccount {
  id: number
  patient_id: number
  patient_name: string
  statement_id: number
  statement_number: string
  balance_due: number
  days_since_due: number
  current_state: string
  payment_pause_active: boolean
  escalation_hold_until: string | null
  requires_founder_decision: boolean
  created_at: string
}

interface CollectionsPolicy {
  id: number
  policy_version: string
  internal_only: boolean
  immutable: boolean
  never_external_collections: boolean
  approved_at: string
  locked_at: string
}

interface WriteOffRecord {
  id: number
  account_id: number
  patient_name: string
  original_balance: number
  write_off_amount: number
  write_off_reason: string
  approved_by: string
  approved_at: string
}

export default function CollectionsGovernanceDashboard() {
  const [accounts, setAccounts] = useState<CollectionsAccount[]>([])
  const [policy, setPolicy] = useState<CollectionsPolicy | null>(null)
  const [writeOffs, setWriteOffs] = useState<WriteOffRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCollectionsData()
    const interval = setInterval(fetchCollectionsData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchCollectionsData = async () => {
    try {
      const [accountsData, policyData, writeOffsData] = await Promise.all([
        apiFetch<CollectionsAccount[]>("/api/collections-governance/accounts"),
        apiFetch<CollectionsPolicy>("/api/collections-governance/policy"),
        apiFetch<WriteOffRecord[]>("/api/collections-governance/write-offs?limit=10")
      ])
      setAccounts(accountsData)
      setPolicy(policyData)
      setWriteOffs(writeOffsData)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      initial: "bg-blue-700 text-blue-300",
      followup_15: "bg-yellow-700 text-yellow-300",
      followup_30: "bg-orange-700 text-orange-300",
      followup_60: "bg-red-700 text-red-300",
      founder_decision_90: "bg-purple-700 text-purple-300",
      payment_plan_active: "bg-green-700 text-green-300",
      written_off: "bg-gray-700 text-gray-300"
    }
    return colors[state] || colors.initial
  }

  const getStateLabel = (state: string) => {
    const labels: Record<string, string> = {
      initial: "0 Days",
      followup_15: "15+ Days",
      followup_30: "30+ Days",
      followup_60: "60+ Days",
      founder_decision_90: "90+ Days (Founder Decision)",
      payment_plan_active: "Payment Plan Active",
      written_off: "Written Off"
    }
    return labels[state] || state
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <div className="flex items-center justify-center h-screen">
              <p className="text-xl text-gray-400">Loading collections governance...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const activeAccounts = accounts.filter(a => a.current_state !== "written_off")
  const founderDecisionAccounts = accounts.filter(a => a.requires_founder_decision)
  const pausedAccounts = accounts.filter(a => a.payment_pause_active)
  const totalOutstanding = accounts.reduce((sum, a) => sum + a.balance_due, 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold mb-2">
                Collections Governance
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Immutable Internal-Only Collections Policy</h2>
              <p className="text-gray-400">
                Time-based escalation with payment pause logic. 90+ days require Founder decision. Never external collections.
              </p>
            </header>

            {/* Immutable Policy Display */}
            <section className="bg-gray-900 border-2 border-purple-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Collections Policy v{policy?.policy_version}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    🔒 Locked and immutable. Cannot be altered by AI or workflows. Founder-only modification.
                  </p>
                </div>
                {policy?.immutable && (
                  <span className="px-4 py-2 bg-purple-700 text-purple-200 rounded-lg text-sm font-semibold">
                    IMMUTABLE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Internal Only</p>
                  <p className="text-white text-lg font-semibold">
                    {policy?.internal_only ? "✓ Yes" : "✗ No"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">External Collections</p>
                  <p className="text-white text-lg font-semibold">
                    {policy?.never_external_collections ? "✗ Never" : "Allowed"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Approved Date</p>
                  <p className="text-white text-lg font-semibold">{formatDate(policy?.approved_at || null)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Locked Date</p>
                  <p className="text-white text-lg font-semibold">{formatDate(policy?.locked_at || null)}</p>
                </div>
              </div>
            </section>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-blue-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Active Accounts</p>
                <p className="text-white text-2xl font-bold">{activeAccounts.length}</p>
              </div>
              <div className="bg-gray-900 border border-purple-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Founder Decision Required</p>
                <p className="text-white text-2xl font-bold">{founderDecisionAccounts.length}</p>
              </div>
              <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Payment Pause Active</p>
                <p className="text-white text-2xl font-bold">{pausedAccounts.length}</p>
              </div>
              <div className="bg-gray-900 border border-orange-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Outstanding</p>
                <p className="text-white text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>

            {/* Collections Accounts */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Collections Accounts</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Time-based escalation: 0 → 15 → 30 → 60 → 90+ days (Founder decision)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Patient</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Statement #</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Balance</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Days Past Due</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">State</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Payment Pause</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Founder Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b border-gray-800 hover:bg-gray-800 transition">
                        <td className="p-4 text-white">{account.patient_name}</td>
                        <td className="p-4 text-gray-400 font-mono text-sm">{account.statement_number}</td>
                        <td className="p-4 text-white font-semibold">{formatCurrency(account.balance_due)}</td>
                        <td className="p-4 text-gray-400 text-sm">{account.days_since_due} days</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(account.current_state)}`}>
                            {getStateLabel(account.current_state)}
                          </span>
                        </td>
                        <td className="p-4">
                          {account.payment_pause_active ? (
                            <span className="text-green-400 text-sm">✓ Paused</span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {account.requires_founder_decision ? (
                            <span className="px-2 py-1 bg-purple-700 text-purple-200 rounded text-xs font-medium">
                              Required
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {accounts.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No active collections accounts.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Write-Off History */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Write-Off History</h3>
                <p className="text-gray-400 text-sm mt-1">Founder-approved write-offs with full audit trail</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Patient</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Original Balance</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Write-Off Amount</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Reason</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Approved By</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {writeOffs.map((record) => (
                      <tr key={record.id} className="border-b border-gray-800">
                        <td className="p-4 text-white">{record.patient_name}</td>
                        <td className="p-4 text-gray-400">{formatCurrency(record.original_balance)}</td>
                        <td className="p-4 text-red-400 font-semibold">{formatCurrency(record.write_off_amount)}</td>
                        <td className="p-4 text-gray-300 text-sm">{record.write_off_reason}</td>
                        <td className="p-4 text-gray-400 text-sm">{record.approved_by}</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(record.approved_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {writeOffs.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No write-offs recorded.</p>
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
