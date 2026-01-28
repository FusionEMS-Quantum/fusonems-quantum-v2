"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

interface CashBalanceData {
  total_cash: number
  change_from_previous_period_pct: number
  recent_deposits_count: number
  recent_deposits_amount: number
  period_days: number
  ai_insight: {
    type: "positive" | "warning" | "neutral"
    message: string
  } | null
}

interface AccountsReceivableData {
  total_ar: number
  current: number
  ar_30_60_days: number
  ar_60_90_days: number
  ar_over_90_days: number
  avg_days_to_payment: number
  aging_breakdown_pct: {
    current: number
    "30_60": number
    "60_90": number
    over_90: number
  }
  ai_insight: {
    type: "positive" | "warning" | "critical" | "neutral"
    message: string
  } | null
}

interface ProfitLossData {
  period: string
  period_label: string
  revenue: number
  costs: number
  gross_profit: number
  gross_margin_pct: number
  transaction_count: number
  revenue_change_pct: number
  ai_insight: {
    type: "positive" | "warning" | "neutral"
    message: string
  } | null
}

interface TaxSummaryData {
  tax_year: number
  current_quarter: string
  estimated_tax_liability: number
  ytd_revenue: number
  quarterly_filings_current: boolean
  next_filing_date: string
  days_until_filing: number
  ai_insight: {
    type: "warning" | "neutral"
    message: string
  } | null
}

export default function AccountingDashboardWidget() {
  const [cashBalance, setCashBalance] = useState<CashBalanceData | null>(null)
  const [ar, setAr] = useState<AccountsReceivableData | null>(null)
  const [pl, setPl] = useState<ProfitLossData | null>(null)
  const [tax, setTax] = useState<TaxSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [plPeriod, setPlPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly")

  useEffect(() => {
    let mounted = true

    const fetchAccountingData = async () => {
      try {
        const [cashData, arData, plData, taxData] = await Promise.all([
          apiFetch<CashBalanceData>("/api/founder/accounting/cash-balance"),
          apiFetch<AccountsReceivableData>("/api/founder/accounting/accounts-receivable"),
          apiFetch<ProfitLossData>(`/api/founder/accounting/profit-loss?period=${plPeriod}`),
          apiFetch<TaxSummaryData>("/api/founder/accounting/tax-summary"),
        ])

        if (mounted) {
          setCashBalance(cashData)
          setAr(arData)
          setPl(plData)
          setTax(taxData)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load accounting data")
          setLoading(false)
        }
      }
    }

    fetchAccountingData()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAccountingData, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [plPeriod])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <section className="panel">
        <header>
          <h3>Accounting Dashboard</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading accounting data...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <header>
          <h3>Accounting Dashboard</h3>
        </header>
        <div className="panel-card warning">
          <p>{error}</p>
        </div>
      </section>
    )
  }

  return (
    <div className="panel-stack">
      {/* Cash Balance Widget */}
      <section className="panel">
        <header>
          <h3>Cash Balance</h3>
          <p className="muted-text">Last {cashBalance?.period_days} days</p>
        </header>

        <div className="platform-card">
          <div className="cash-balance-main">
            <strong className="cash-amount">{formatCurrency(cashBalance?.total_cash || 0)}</strong>
            <span
              className={`cash-change ${
                (cashBalance?.change_from_previous_period_pct || 0) > 0
                  ? "success-text"
                  : (cashBalance?.change_from_previous_period_pct || 0) < 0
                  ? "warning-text"
                  : ""
              }`}
            >
              {formatPercent(cashBalance?.change_from_previous_period_pct || 0)} from previous period
            </span>
          </div>
        </div>

        <div className="data-grid" style={{ marginTop: "1rem" }}>
          <article className="panel-card">
            <p className="muted-text">Recent Deposits (7d)</p>
            <strong>{cashBalance?.recent_deposits_count || 0}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Deposit Amount</p>
            <strong>{formatCurrency(cashBalance?.recent_deposits_amount || 0)}</strong>
          </article>
        </div>

        {cashBalance?.ai_insight && (
          <div className={`platform-card ${cashBalance.ai_insight.type}`}>
            <p>
              <strong>AI Insight:</strong> {cashBalance.ai_insight.message}
            </p>
          </div>
        )}
      </section>

      {/* Accounts Receivable Widget */}
      <section className="panel">
        <header>
          <h3>Accounts Receivable</h3>
          <p className="muted-text">Aging Analysis</p>
        </header>

        <div className="platform-card">
          <div className="ar-main">
            <strong className="ar-amount">{formatCurrency(ar?.total_ar || 0)}</strong>
            <p className="muted-text">Total Outstanding</p>
          </div>
          <div className="ar-stat">
            <p className="muted-text">Avg Days to Payment</p>
            <strong>{ar?.avg_days_to_payment || 0} days</strong>
          </div>
        </div>

        <div className="ar-aging-grid">
          <article className="ar-aging-card current">
            <p className="muted-text">Current</p>
            <strong>{formatCurrency(ar?.current || 0)}</strong>
            <span className="aging-pct">{ar?.aging_breakdown_pct.current || 0}%</span>
          </article>
          <article className="ar-aging-card aging-30">
            <p className="muted-text">30-60 Days</p>
            <strong>{formatCurrency(ar?.ar_30_60_days || 0)}</strong>
            <span className="aging-pct">{ar?.aging_breakdown_pct["30_60"] || 0}%</span>
          </article>
          <article className="ar-aging-card aging-60">
            <p className="muted-text">60-90 Days</p>
            <strong>{formatCurrency(ar?.ar_60_90_days || 0)}</strong>
            <span className="aging-pct">{ar?.aging_breakdown_pct["60_90"] || 0}%</span>
          </article>
          <article className="ar-aging-card aging-90">
            <p className="muted-text">Over 90 Days</p>
            <strong>{formatCurrency(ar?.ar_over_90_days || 0)}</strong>
            <span className="aging-pct">{ar?.aging_breakdown_pct.over_90 || 0}%</span>
          </article>
        </div>

        {ar?.ai_insight && (
          <div className={`platform-card ${ar.ai_insight.type}`}>
            <p>
              <strong>AI Insight:</strong> {ar.ai_insight.message}
            </p>
          </div>
        )}
      </section>

      {/* Profit & Loss Widget */}
      <section className="panel">
        <header>
          <h3>Profit & Loss</h3>
          <div className="pl-period-selector">
            <button
              className={`period-button ${plPeriod === "monthly" ? "active" : ""}`}
              onClick={() => setPlPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              className={`period-button ${plPeriod === "quarterly" ? "active" : ""}`}
              onClick={() => setPlPeriod("quarterly")}
            >
              Quarterly
            </button>
            <button
              className={`period-button ${plPeriod === "yearly" ? "active" : ""}`}
              onClick={() => setPlPeriod("yearly")}
            >
              Yearly
            </button>
          </div>
        </header>

        <p className="muted-text" style={{ marginBottom: "1rem" }}>
          {pl?.period_label}
        </p>

        <div className="pl-summary">
          <div className="pl-row">
            <span className="pl-label">Revenue</span>
            <strong className="pl-value success-text">{formatCurrency(pl?.revenue || 0)}</strong>
          </div>
          <div className="pl-row">
            <span className="pl-label">Costs</span>
            <strong className="pl-value">{formatCurrency(pl?.costs || 0)}</strong>
          </div>
          <div className="pl-row total">
            <span className="pl-label">Gross Profit</span>
            <strong className="pl-value">{formatCurrency(pl?.gross_profit || 0)}</strong>
          </div>
        </div>

        <div className="data-grid" style={{ marginTop: "1rem" }}>
          <article className="panel-card">
            <p className="muted-text">Gross Margin</p>
            <strong
              className={
                (pl?.gross_margin_pct || 0) > 35
                  ? "success-text"
                  : (pl?.gross_margin_pct || 0) < 30
                  ? "warning-text"
                  : ""
              }
            >
              {pl?.gross_margin_pct || 0}%
            </strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Revenue Change</p>
            <strong
              className={
                (pl?.revenue_change_pct || 0) > 0
                  ? "success-text"
                  : (pl?.revenue_change_pct || 0) < 0
                  ? "warning-text"
                  : ""
              }
            >
              {formatPercent(pl?.revenue_change_pct || 0)}
            </strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Transactions</p>
            <strong>{pl?.transaction_count || 0}</strong>
          </article>
        </div>

        {pl?.ai_insight && (
          <div className={`platform-card ${pl.ai_insight.type}`}>
            <p>
              <strong>AI Insight:</strong> {pl.ai_insight.message}
            </p>
          </div>
        )}
      </section>

      {/* Tax Widget */}
      <section className="panel">
        <header>
          <h3>Tax Summary</h3>
          <p className="muted-text">{tax?.tax_year} Tax Year</p>
        </header>

        <div className="platform-card">
          <div className="tax-main">
            <strong className="tax-liability">{formatCurrency(tax?.estimated_tax_liability || 0)}</strong>
            <p className="muted-text">Estimated Tax Liability</p>
          </div>
          <div className="tax-stat">
            <p className="muted-text">Current Quarter</p>
            <strong>{tax?.current_quarter}</strong>
          </div>
        </div>

        <div className="data-grid" style={{ marginTop: "1rem" }}>
          <article className="panel-card">
            <p className="muted-text">YTD Revenue</p>
            <strong>{formatCurrency(tax?.ytd_revenue || 0)}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Next Filing</p>
            <strong>{tax?.next_filing_date ? new Date(tax.next_filing_date).toLocaleDateString() : "N/A"}</strong>
            <p className="muted-text" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {tax?.days_until_filing} days
            </p>
          </article>
          <article
            className={`panel-card ${tax?.quarterly_filings_current ? "success" : "warning"}`}
          >
            <p className="muted-text">Filings Status</p>
            <strong>{tax?.quarterly_filings_current ? "Current" : "Overdue"}</strong>
          </article>
        </div>

        {tax?.ai_insight && (
          <div className={`platform-card ${tax.ai_insight.type}`}>
            <p>
              <strong>AI Insight:</strong> {tax.ai_insight.message}
            </p>
          </div>
        )}
      </section>

      <style jsx>{`
        .panel-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        /* Cash Balance Styles */
        .cash-balance-main {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cash-amount {
          font-size: 2rem;
          font-weight: 700;
          color: #2e7d32;
        }

        .cash-change {
          font-size: 0.95rem;
          font-weight: 600;
        }

        /* AR Styles */
        .ar-main {
          margin-bottom: 1rem;
        }

        .ar-amount {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1976d2;
        }

        .ar-stat {
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        .ar-aging-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .ar-aging-card {
          padding: 0.75rem;
          border-radius: 4px;
          border-left: 3px solid;
        }

        .ar-aging-card.current {
          border-left-color: #4caf50;
          background: rgba(76, 175, 80, 0.05);
        }

        .ar-aging-card.aging-30 {
          border-left-color: #ff9800;
          background: rgba(255, 152, 0, 0.05);
        }

        .ar-aging-card.aging-60 {
          border-left-color: #f57c00;
          background: rgba(245, 124, 0, 0.05);
        }

        .ar-aging-card.aging-90 {
          border-left-color: #f44336;
          background: rgba(244, 67, 54, 0.05);
        }

        .aging-pct {
          display: block;
          font-size: 0.85rem;
          color: #757575;
          margin-top: 0.25rem;
        }

        /* P&L Styles */
        .pl-period-selector {
          display: flex;
          gap: 0.5rem;
        }

        .period-button {
          padding: 0.375rem 0.75rem;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .period-button:hover {
          background: #f5f5f5;
        }

        .period-button.active {
          background: #1976d2;
          color: white;
          border-color: #1976d2;
        }

        .pl-summary {
          background: #f9f9f9;
          border-radius: 4px;
          padding: 1rem;
        }

        .pl-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .pl-row:last-child {
          border-bottom: none;
        }

        .pl-row.total {
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 2px solid #333;
          font-weight: 600;
        }

        .pl-label {
          font-size: 0.95rem;
          color: #424242;
        }

        .pl-value {
          font-size: 1.1rem;
          font-weight: 600;
        }

        /* Tax Styles */
        .tax-main {
          margin-bottom: 1rem;
        }

        .tax-liability {
          font-size: 1.75rem;
          font-weight: 700;
          color: #e65100;
        }

        .tax-stat {
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        /* Utility Classes */
        .success-text {
          color: #2e7d32;
        }

        .warning-text {
          color: #f57c00;
        }

        .muted-text {
          color: #757575;
          font-size: 0.9rem;
        }

        .platform-card.success {
          background: rgba(76, 175, 80, 0.1);
          border-left: 3px solid #4caf50;
        }

        .platform-card.warning {
          background: rgba(255, 152, 0, 0.1);
          border-left: 3px solid #ff9800;
        }

        .platform-card.critical {
          background: rgba(244, 67, 54, 0.1);
          border-left: 3px solid #f44336;
        }

        .platform-card.neutral {
          background: rgba(33, 150, 243, 0.1);
          border-left: 3px solid #2196f3;
        }
      `}</style>
    </div>
  )
}
