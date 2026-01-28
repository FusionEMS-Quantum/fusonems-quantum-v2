"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

interface PendingReceiptsData {
  pending_count: number
  processing_count: number
  total_in_queue: number
  avg_processing_time_minutes: number
  recent_receipts: Array<{
    id: string
    vendor_name: string
    ocr_status: string
    created_at: string
    file_type: string
    file_size: number
  }>
}

interface OCRFailuresData {
  total_failures: number
  retry_exceeded: number
  low_confidence_failures: number
  failures: Array<{
    id: string
    vendor_name: string
    file_path: string
    file_type: string
    ocr_error: string
    ocr_retry_count: number
    ocr_confidence: number
    created_at: string
    user_id: number
  }>
}

interface UnpostedExpensesData {
  unposted_count: number
  total_amount: number
  by_category: Record<string, { count: number; amount: number }>
  oldest_days: number
  expenses: Array<{
    id: string
    description: string
    category: string
    amount: number
    expense_date: string
    approved_at: string
    user_id: number
  }>
}

interface ApprovalWorkflowsData {
  pending_submission: number
  pending_approval: number
  approved_unposted: number
  rejected: number
  total_pending: number
  avg_approval_time_hours: number
  active_workflows: Array<{
    id: string
    expense_id: string
    step_name: string
    assigned_to: number | null
    started_at: string
    notes: string
  }>
}

interface ProcessingMetricsData {
  processed_24h: number
  failed_24h: number
  success_rate: number
  avg_confidence: number
  orphaned_receipts: number
  ai_insight: {
    type: "positive" | "warning" | "critical"
    message: string
  } | null
}

export default function ExpensesDashboardWidget() {
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceiptsData | null>(null)
  const [ocrFailures, setOcrFailures] = useState<OCRFailuresData | null>(null)
  const [unposted, setUnposted] = useState<UnpostedExpensesData | null>(null)
  const [workflows, setWorkflows] = useState<ApprovalWorkflowsData | null>(null)
  const [metrics, setMetrics] = useState<ProcessingMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [expandedFailures, setExpandedFailures] = useState(false)
  const [expandedUnposted, setExpandedUnposted] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchExpensesData = async () => {
      try {
        const [receiptsData, failuresData, unpostedData, workflowsData, metricsData] = await Promise.all([
          apiFetch<PendingReceiptsData>("/api/founder/expenses/pending-receipts"),
          apiFetch<OCRFailuresData>("/api/founder/expenses/ocr-failures"),
          apiFetch<UnpostedExpensesData>("/api/founder/expenses/unposted"),
          apiFetch<ApprovalWorkflowsData>("/api/founder/expenses/approval-workflows"),
          apiFetch<ProcessingMetricsData>("/api/founder/expenses/processing-metrics"),
        ])

        if (mounted) {
          setPendingReceipts(receiptsData)
          setOcrFailures(failuresData)
          setUnposted(unpostedData)
          setWorkflows(workflowsData)
          setMetrics(metricsData)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load expenses data")
          setLoading(false)
        }
      }
    }

    fetchExpensesData()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchExpensesData, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <section className="panel">
        <header>
          <h3>Expenses & Receipts Dashboard</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading expenses data...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <header>
          <h3>Expenses & Receipts Dashboard</h3>
        </header>
        <div className="panel-card warning">
          <p>{error}</p>
        </div>
      </section>
    )
  }

  const displayFailures = expandedFailures
    ? ocrFailures?.failures || []
    : (ocrFailures?.failures || []).slice(0, 5)

  const displayUnposted = expandedUnposted
    ? unposted?.expenses || []
    : (unposted?.expenses || []).slice(0, 5)

  return (
    <div className="panel-stack">
      {/* Receipt Processing Metrics */}
      <section className="panel">
        <header>
          <h3>Receipt Processing Status</h3>
          <p className="muted-text">Last 24 hours</p>
        </header>

        <div className="data-grid">
          <article className="panel-card">
            <p className="muted-text">Processed</p>
            <strong className="success-text">{metrics?.processed_24h || 0}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Failed</p>
            <strong className={metrics?.failed_24h && metrics.failed_24h > 0 ? "warning-text" : ""}>
              {metrics?.failed_24h || 0}
            </strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Success Rate</p>
            <strong
              className={
                (metrics?.success_rate || 0) >= 90
                  ? "success-text"
                  : (metrics?.success_rate || 0) >= 70
                  ? "warning-text"
                  : "error-text"
              }
            >
              {metrics?.success_rate || 0}%
            </strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Avg Confidence</p>
            <strong>{metrics?.avg_confidence || 0}%</strong>
          </article>
        </div>

        {metrics?.ai_insight && (
          <div className={`platform-card ${metrics.ai_insight.type}`}>
            <p>
              <strong>AI Insight:</strong> {metrics.ai_insight.message}
            </p>
          </div>
        )}
      </section>

      {/* Pending Receipts Queue */}
      <section className="panel">
        <header>
          <h3>Receipt OCR Queue</h3>
          <p className="muted-text">{pendingReceipts?.total_in_queue || 0} receipts in queue</p>
        </header>

        <div className="data-grid">
          <article className="panel-card">
            <p className="muted-text">Pending</p>
            <strong>{pendingReceipts?.pending_count || 0}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Processing</p>
            <strong className="processing-text">{pendingReceipts?.processing_count || 0}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Avg Processing Time</p>
            <strong>{pendingReceipts?.avg_processing_time_minutes || 0} min</strong>
          </article>
        </div>

        {pendingReceipts && pendingReceipts.recent_receipts.length > 0 && (
          <div className="receipt-list">
            <h4>Recent Receipts</h4>
            {pendingReceipts.recent_receipts.slice(0, 5).map((receipt) => (
              <div key={receipt.id} className="receipt-item">
                <div className="receipt-header">
                  <strong>{receipt.vendor_name}</strong>
                  <span className={`status-badge ${receipt.ocr_status}`}>{receipt.ocr_status}</span>
                </div>
                <p className="receipt-meta">
                  {receipt.file_type} • {formatFileSize(receipt.file_size)} • {formatDateTime(receipt.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* OCR Failures */}
      <section className="panel">
        <header>
          <h3>OCR Failures</h3>
          <p className="muted-text">{ocrFailures?.total_failures || 0} failed receipts</p>
        </header>

        {ocrFailures && ocrFailures.total_failures > 0 ? (
          <>
            <div className="platform-card error">
              <strong>⚠️ {ocrFailures.total_failures} OCR Failures Detected</strong>
              <p className="muted-text">Review and retry or manually process receipts</p>
            </div>

            <div className="data-grid" style={{ marginTop: "1rem" }}>
              <article className="panel-card">
                <p className="muted-text">Retry Exceeded</p>
                <strong className="error-text">{ocrFailures.retry_exceeded}</strong>
              </article>
              <article className="panel-card">
                <p className="muted-text">Low Confidence</p>
                <strong className="warning-text">{ocrFailures.low_confidence_failures}</strong>
              </article>
            </div>

            <ul className="failures-list">
              {displayFailures.map((failure) => (
                <li key={failure.id} className="failure-item">
                  <div className="failure-header">
                    <strong>{failure.vendor_name}</strong>
                    <span className="failure-confidence">
                      {failure.ocr_confidence}% confidence • {failure.ocr_retry_count} retries
                    </span>
                  </div>
                  <p className="failure-file">{failure.file_type}</p>
                  <p className="failure-error">❌ {failure.ocr_error}</p>
                  <p className="failure-time">{formatDateTime(failure.created_at)}</p>
                </li>
              ))}
            </ul>

            {ocrFailures.failures.length > 5 && (
              <button className="expand-button" onClick={() => setExpandedFailures(!expandedFailures)}>
                {expandedFailures ? "Show Less" : `Show All ${ocrFailures.failures.length} Failures`}
              </button>
            )}
          </>
        ) : (
          <div className="platform-card success">
            <strong>✓ No OCR Failures</strong>
            <p className="muted-text">All receipts processed successfully</p>
          </div>
        )}
      </section>

      {/* Unposted Expenses */}
      <section className="panel">
        <header>
          <h3>Unposted Expenses</h3>
          <p className="muted-text">{unposted?.unposted_count || 0} approved expenses</p>
        </header>

        {unposted && unposted.unposted_count > 0 ? (
          <>
            <div className="platform-card warning">
              <div className="unposted-summary">
                <div>
                  <strong>{formatCurrency(unposted.total_amount)}</strong>
                  <p className="muted-text">Total Unposted</p>
                </div>
                <div>
                  <strong>{unposted.oldest_days} days</strong>
                  <p className="muted-text">Oldest Unposted</p>
                </div>
              </div>
            </div>

            {Object.keys(unposted.by_category).length > 0 && (
              <div className="category-breakdown">
                <h4>By Category</h4>
                <div className="category-grid">
                  {Object.entries(unposted.by_category).map(([category, data]) => (
                    <article key={category} className="category-card">
                      <p className="category-name">{category}</p>
                      <strong>{formatCurrency(data.amount)}</strong>
                      <p className="muted-text">{data.count} expense{data.count !== 1 ? "s" : ""}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <ul className="expenses-list">
              {displayUnposted.map((expense) => (
                <li key={expense.id} className="expense-item">
                  <div className="expense-header">
                    <strong>{expense.description}</strong>
                    <strong className="expense-amount">{formatCurrency(expense.amount)}</strong>
                  </div>
                  <p className="expense-meta">
                    {expense.category} • Approved {formatDateTime(expense.approved_at)}
                  </p>
                </li>
              ))}
            </ul>

            {unposted.expenses.length > 5 && (
              <button className="expand-button" onClick={() => setExpandedUnposted(!expandedUnposted)}>
                {expandedUnposted ? "Show Less" : `Show All ${unposted.expenses.length} Expenses`}
              </button>
            )}
          </>
        ) : (
          <div className="platform-card success">
            <strong>✓ All Expenses Posted</strong>
            <p className="muted-text">No approved expenses waiting to be posted</p>
          </div>
        )}
      </section>

      {/* Approval Workflows */}
      <section className="panel">
        <header>
          <h3>Expense Approval Workflows</h3>
          <p className="muted-text">{workflows?.total_pending || 0} pending approvals</p>
        </header>

        <div className="data-grid">
          <article className="panel-card">
            <p className="muted-text">Pending Submission</p>
            <strong>{workflows?.pending_submission || 0}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Pending Approval</p>
            <strong className="warning-text">{workflows?.pending_approval || 0}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Approved (Unposted)</p>
            <strong className="success-text">{workflows?.approved_unposted || 0}</strong>
          </article>
          <article className="panel-card">
            <p className="muted-text">Rejected</p>
            <strong className="error-text">{workflows?.rejected || 0}</strong>
          </article>
        </div>

        <div className="workflow-stat">
          <p className="muted-text">Average Approval Time</p>
          <strong>{workflows?.avg_approval_time_hours || 0} hours</strong>
        </div>

        {workflows && workflows.active_workflows.length > 0 && (
          <div className="workflow-list">
            <h4>Active Workflows</h4>
            {workflows.active_workflows.slice(0, 5).map((workflow) => (
              <div key={workflow.id} className="workflow-item">
                <div className="workflow-header">
                  <strong>{workflow.step_name}</strong>
                  <span className="workflow-time">{formatDateTime(workflow.started_at)}</span>
                </div>
                {workflow.notes && <p className="workflow-notes">{workflow.notes}</p>}
              </div>
            ))}
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
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
          margin-top: 0.75rem;
        }

        .category-card {
          padding: 0.75rem;
          border-left: 3px solid #1976d2;
          background: rgba(25, 118, 210, 0.05);
          border-radius: 4px;
        }

        .category-name {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 0.25rem;
          text-transform: capitalize;
        }

        .receipt-list,
        .workflow-list,
        .category-breakdown {
          margin-top: 1rem;
        }

        .receipt-list h4,
        .workflow-list h4,
        .category-breakdown h4 {
          font-size: 0.9rem;
          color: #424242;
          margin-bottom: 0.75rem;
        }

        .receipt-item,
        .workflow-item {
          padding: 0.75rem;
          border-left: 3px solid #2196f3;
          background: rgba(33, 150, 243, 0.05);
          margin-bottom: 0.5rem;
          border-radius: 4px;
        }

        .receipt-header,
        .workflow-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .receipt-meta,
        .workflow-time {
          font-size: 0.8rem;
          color: #757575;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background: #fff3e0;
          color: #f57c00;
        }

        .status-badge.processing {
          background: #e3f2fd;
          color: #1976d2;
        }

        .status-badge.completed {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-badge.failed {
          background: #ffebee;
          color: #c62828;
        }

        .failures-list,
        .expenses-list {
          list-style: none;
          padding: 0;
          margin: 1rem 0 0 0;
        }

        .failure-item {
          padding: 1rem;
          border-left: 3px solid #f44336;
          background: rgba(244, 67, 54, 0.05);
          margin-bottom: 0.75rem;
          border-radius: 4px;
        }

        .failure-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .failure-confidence {
          font-size: 0.8rem;
          color: #666;
        }

        .failure-file,
        .failure-time {
          font-size: 0.85rem;
          color: #666;
          margin: 0.25rem 0;
          font-family: monospace;
        }

        .failure-error {
          font-size: 0.85rem;
          color: #f44336;
          margin: 0.5rem 0 0.25rem 0;
          font-weight: 500;
        }

        .expense-item {
          padding: 0.75rem;
          border-left: 3px solid #ff9800;
          background: rgba(255, 152, 0, 0.05);
          margin-bottom: 0.5rem;
          border-radius: 4px;
        }

        .expense-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .expense-amount {
          color: #f57c00;
          font-size: 1rem;
        }

        .expense-meta {
          font-size: 0.8rem;
          color: #757575;
          margin: 0;
        }

        .unposted-summary {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .workflow-stat {
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 4px;
          margin-top: 1rem;
          text-align: center;
        }

        .workflow-notes {
          font-size: 0.85rem;
          color: #666;
          margin-top: 0.5rem;
          font-style: italic;
        }

        .expand-button {
          width: 100%;
          padding: 0.75rem;
          margin-top: 1rem;
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .expand-button:hover {
          background: #e0e0e0;
        }

        .success-text {
          color: #2e7d32;
        }

        .warning-text {
          color: #f57c00;
        }

        .error-text {
          color: #c62828;
        }

        .processing-text {
          color: #1976d2;
        }

        .muted-text {
          color: #757575;
          font-size: 0.9rem;
        }

        .platform-card.success {
          background: rgba(76, 175, 80, 0.1);
          border-left: 3px solid #4caf50;
          padding: 1rem;
        }

        .platform-card.warning {
          background: rgba(255, 152, 0, 0.1);
          border-left: 3px solid #ff9800;
          padding: 1rem;
        }

        .platform-card.error {
          background: rgba(244, 67, 54, 0.1);
          border-left: 3px solid #f44336;
          padding: 1rem;
        }

        .platform-card.positive {
          background: rgba(76, 175, 80, 0.1);
          border-left: 3px solid #4caf50;
          padding: 1rem;
          margin-top: 1rem;
        }

        .platform-card.critical {
          background: rgba(244, 67, 54, 0.1);
          border-left: 3px solid #f44336;
          padding: 1rem;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  )
}
