"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface PaymentPlan {
  id: number
  patient_id: number
  patient_name: string
  total_amount: number
  down_payment: number
  remaining_balance: number
  installment_amount: number
  installment_frequency: string
  total_installments: number
  installments_paid: number
  plan_tier: string
  auto_pay_enabled: boolean
  status: string
  start_date: string
  end_date: string
}

interface InsuranceFollowUp {
  id: number
  claim_id: number
  payer_name: string
  claim_amount: number
  days_since_submission: number
  follow_up_count: number
  last_follow_up_date: string
  next_follow_up_date: string
  status: string
  ai_recommended_action: string
}

interface RevenueKPI {
  id: number
  metric_name: string
  current_value: number
  target_value: number
  performance_percentage: number
  trend: string
}

export default function PaymentResolutionDashboard() {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([])
  const [insuranceFollowUps, setInsuranceFollowUps] = useState<InsuranceFollowUp[]>([])
  const [revenueKPIs, setRevenueKPIs] = useState<RevenueKPI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPaymentData()
    const interval = setInterval(fetchPaymentData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchPaymentData = async () => {
    try {
      const [plansData, followUpsData, kpisData] = await Promise.all([
        apiFetch<PaymentPlan[]>("/api/payment-resolution/payment-plans"),
        apiFetch<InsuranceFollowUp[]>("/api/payment-resolution/insurance-follow-ups"),
        apiFetch<RevenueKPI[]>("/api/payment-resolution/revenue-kpis")
      ])
      setPaymentPlans(plansData)
      setInsuranceFollowUps(followUpsData)
      setRevenueKPIs(kpisData)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getPlanTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      short_term: "bg-blue-700 text-blue-300",
      standard: "bg-green-700 text-green-300",
      extended: "bg-purple-700 text-purple-300"
    }
    return colors[tier] || colors.standard
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-700 text-green-300",
      completed: "bg-blue-700 text-blue-300",
      defaulted: "bg-red-700 text-red-300",
      pending: "bg-yellow-700 text-yellow-300"
    }
    return colors[status] || colors.pending
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <div className="flex items-center justify-center h-screen">
              <p className="text-xl text-gray-400">Loading payment resolution...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const activePlans = paymentPlans.filter(p => p.status === "active")
  const autoPayPlans = paymentPlans.filter(p => p.auto_pay_enabled)
  const urgentFollowUps = insuranceFollowUps.filter(f => f.days_since_submission > 30)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold mb-2">
                Payment Resolution
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Payment Plans & Insurance Follow-Up</h2>
              <p className="text-gray-400">
                3-tier payment plans with Stripe integration (Card + ACH), auto-pay optional, and insurance follow-up automation.
              </p>
            </header>

            {/* Revenue Health KPIs */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Revenue Health KPIs</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {revenueKPIs.map((kpi) => (
                  <div key={kpi.id} className="bg-gray-950 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">{kpi.metric_name}</p>
                    <p className="text-white text-2xl font-bold mb-1">
                      {kpi.metric_name.includes('$') || kpi.metric_name.includes('Revenue') ? formatCurrency(kpi.current_value) : kpi.current_value}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-semibold ${kpi.performance_percentage >= 100 ? 'text-green-400' : kpi.performance_percentage >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {kpi.performance_percentage.toFixed(1)}%
                      </span>
                      <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-400' : kpi.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                        {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Active Payment Plans</p>
                <p className="text-white text-2xl font-bold">{activePlans.length}</p>
              </div>
              <div className="bg-gray-900 border border-blue-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Auto-Pay Enabled</p>
                <p className="text-white text-2xl font-bold">{autoPayPlans.length}</p>
              </div>
              <div className="bg-gray-900 border border-yellow-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Insurance Follow-Ups</p>
                <p className="text-white text-2xl font-bold">{insuranceFollowUps.length}</p>
              </div>
              <div className="bg-gray-900 border border-red-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Urgent (30+ Days)</p>
                <p className="text-white text-2xl font-bold">{urgentFollowUps.length}</p>
              </div>
            </div>

            {/* Payment Plans */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Payment Plans</h3>
                <p className="text-gray-400 text-sm mt-1">
                  3 tiers: Short-term (3-6 months), Standard (7-12 months), Extended (13-24 months). Auto-pay optional with explicit consent.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Patient</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Total Amount</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Remaining Balance</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Installment</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Progress</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Tier</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Auto-Pay</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentPlans.map((plan) => (
                      <tr key={plan.id} className="border-b border-gray-800 hover:bg-gray-800 transition">
                        <td className="p-4 text-white">{plan.patient_name}</td>
                        <td className="p-4 text-white font-semibold">{formatCurrency(plan.total_amount)}</td>
                        <td className="p-4 text-gray-400">{formatCurrency(plan.remaining_balance)}</td>
                        <td className="p-4 text-white text-sm">
                          {formatCurrency(plan.installment_amount)} / {plan.installment_frequency}
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-[100px]">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${(plan.installments_paid / plan.total_installments) * 100}%` }}
                              />
                            </div>
                            <span className="text-gray-400 text-xs">
                              {plan.installments_paid}/{plan.total_installments}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanTierColor(plan.plan_tier)}`}>
                            {plan.plan_tier.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          {plan.auto_pay_enabled ? (
                            <span className="text-green-400 text-sm">✓ Enabled</span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(plan.status)}`}>
                            {plan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paymentPlans.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No payment plans active.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Insurance Follow-Ups */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Insurance Follow-Up Queue</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Automated follow-up tracking with AI-recommended actions for insurance claims
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Payer</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Claim Amount</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Days Since Submission</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Follow-Up Count</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Last Follow-Up</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Next Follow-Up</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">AI Recommendation</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insuranceFollowUps.map((followUp) => (
                      <tr key={followUp.id} className={`border-b border-gray-800 hover:bg-gray-800 transition ${followUp.days_since_submission > 30 ? 'bg-red-900/10' : ''}`}>
                        <td className="p-4 text-white">{followUp.payer_name}</td>
                        <td className="p-4 text-white font-semibold">{formatCurrency(followUp.claim_amount)}</td>
                        <td className="p-4">
                          <span className={`text-sm font-semibold ${followUp.days_since_submission > 30 ? 'text-red-400' : followUp.days_since_submission > 15 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {followUp.days_since_submission} days
                          </span>
                        </td>
                        <td className="p-4 text-white text-sm">{followUp.follow_up_count}</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(followUp.last_follow_up_date)}</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(followUp.next_follow_up_date)}</td>
                        <td className="p-4 text-sm">
                          <span className="text-purple-400">{followUp.ai_recommended_action}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(followUp.status)}`}>
                            {followUp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {insuranceFollowUps.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No insurance follow-ups pending.</p>
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
