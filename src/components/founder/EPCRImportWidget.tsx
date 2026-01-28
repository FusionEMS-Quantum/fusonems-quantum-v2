"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type ImportStats = {
  total_imports: number
  successful_imports: number
  failed_imports: number
  total_records_imported: number
  total_errors: number
  success_rate: number
  vendor_breakdown: {
    imagetrend: number
    zoll: number
  }
  last_import: string | null
}

type ImportHistory = {
  id: number
  source: string
  status: string
  created_at: string
  total_records: number
  successful_records: number
  failed_records: number
  error_count: number
  duration_seconds: number
}

type StatsResponse = {
  success: boolean
  stats: ImportStats
}

type HistoryResponse = {
  success: boolean
  history: ImportHistory[]
  count: number
}

export function EPCRImportWidget() {
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [history, setHistory] = useState<ImportHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let mounted = true
    
    const fetchData = () => {
      // Fetch import stats
      apiFetch<StatsResponse>("/api/founder/epcr-import/stats")
        .then((data) => {
          if (mounted && data.success) {
            setStats(data.stats)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (mounted) {
            setError("Failed to load import stats")
            setLoading(false)
          }
        })
      
      // Fetch import history
      apiFetch<HistoryResponse>("/api/founder/epcr-import/history?limit=10")
        .then((data) => {
          if (mounted && data.success) {
            setHistory(data.history)
          }
        })
        .catch((err) => {
          if (mounted) {
            console.error("Failed to load import history:", err)
          }
        })
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every 60 seconds

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <section className="panel">
        <header>
          <h3>ePCR Import Integration</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading import data...</p>
        </div>
      </section>
    )
  }

  if (error || !stats) {
    return (
      <section className="panel">
        <header>
          <h3>ePCR Import Integration</h3>
        </header>
        <div className="panel-card warning">
          <p>{error || "Unable to load import data"}</p>
        </div>
      </section>
    )
  }

  const hasRecentErrors = history.some(h => h.error_count > 0)

  return (
    <section className="panel">
      <header>
        <h3>ePCR Import Integration</h3>
        <p className="muted-text">ImageTrend Elite & ZOLL RescueNet imports</p>
      </header>

      {/* IMPORT STATISTICS */}
      <div className="stats-grid">
        <article className="platform-card success">
          <p className="muted-text">Success Rate</p>
          <strong className="stat-value">{stats.success_rate}%</strong>
        </article>

        <article className="platform-card">
          <p className="muted-text">Total Imports</p>
          <strong className="stat-value">{stats.total_imports}</strong>
        </article>

        <article className="platform-card">
          <p className="muted-text">Records Imported</p>
          <strong className="stat-value">{stats.total_records_imported}</strong>
        </article>

        <article className={`platform-card ${stats.total_errors > 0 ? "warning" : ""}`}>
          <p className="muted-text">Total Errors</p>
          <strong className="stat-value">{stats.total_errors}</strong>
        </article>
      </div>

      {/* VENDOR BREAKDOWN */}
      <div className="vendor-breakdown">
        <h4>Vendor Breakdown</h4>
        <div className="vendor-grid">
          <article className="vendor-card">
            <div className="vendor-icon imagetrend">IT</div>
            <div className="vendor-info">
              <strong>ImageTrend Elite</strong>
              <p className="muted-text">{stats.vendor_breakdown.imagetrend} imports</p>
            </div>
          </article>

          <article className="vendor-card">
            <div className="vendor-icon zoll">Z</div>
            <div className="vendor-info">
              <strong>ZOLL RescueNet</strong>
              <p className="muted-text">{stats.vendor_breakdown.zoll} imports</p>
            </div>
          </article>
        </div>
      </div>

      {/* RECENT IMPORT HISTORY */}
      <div className="import-history">
        <h4>Recent Import History</h4>
        
        {hasRecentErrors && (
          <div className="platform-card warning">
            <strong>⚠️ Recent Import Errors Detected</strong>
            <p className="muted-text">Some imports have validation errors. Check history below.</p>
          </div>
        )}

        <ul className="history-list">
          {history.map((item) => {
            const successRate = item.total_records > 0
              ? Math.round((item.successful_records / item.total_records) * 100)
              : 0
            const hasErrors = item.error_count > 0 || item.failed_records > 0
            const statusClass = item.status === "completed" ? "success" : hasErrors ? "error" : "muted"

            return (
              <li key={item.id} className={`history-item ${statusClass}`}>
                <div className="history-header">
                  <div className="history-meta">
                    <span className={`vendor-badge ${item.source}`}>
                      {item.source === "imagetrend" ? "ImageTrend" : "ZOLL"}
                    </span>
                    <span className="history-time">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className={`status-badge ${statusClass}`}>
                    {item.status}
                  </span>
                </div>

                <div className="history-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value-small">{item.total_records}</span>
                  </div>
                  <div className="stat-item success">
                    <span className="stat-label">Success:</span>
                    <span className="stat-value-small">{item.successful_records}</span>
                  </div>
                  {item.failed_records > 0 && (
                    <div className="stat-item error">
                      <span className="stat-label">Failed:</span>
                      <span className="stat-value-small">{item.failed_records}</span>
                    </div>
                  )}
                  <div className="stat-item">
                    <span className="stat-label">Rate:</span>
                    <span className="stat-value-small">{successRate}%</span>
                  </div>
                </div>

                {hasErrors && (
                  <div className="error-summary">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">
                      {item.error_count} validation error{item.error_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                <div className="duration-info">
                  <span className="muted-text">
                    Duration: {item.duration_seconds ? `${item.duration_seconds.toFixed(1)}s` : "N/A"}
                  </span>
                </div>
              </li>
            )
          })}

          {history.length === 0 && (
            <li className="history-item">
              <p className="muted-text">No import history available</p>
            </li>
          )}
        </ul>
      </div>

      {stats.last_import && (
        <div className="last-import-info">
          <p className="muted-text">
            Last import: {new Date(stats.last_import).toLocaleString()}
          </p>
        </div>
      )}

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #333;
        }
        .vendor-breakdown {
          margin-bottom: 1.5rem;
        }
        .vendor-breakdown h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
        }
        .vendor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .vendor-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }
        .vendor-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.25rem;
          color: white;
        }
        .vendor-icon.imagetrend {
          background: linear-gradient(135deg, #2196f3, #1976d2);
        }
        .vendor-icon.zoll {
          background: linear-gradient(135deg, #ff9800, #f57c00);
        }
        .vendor-info strong {
          font-size: 0.95rem;
          display: block;
          margin-bottom: 0.25rem;
        }
        .vendor-info p {
          font-size: 0.85rem;
          margin: 0;
        }
        .import-history h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
        }
        .history-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .history-item {
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 0.75rem;
          background: #fff;
        }
        .history-item.success {
          border-left: 4px solid #4caf50;
        }
        .history-item.error {
          border-left: 4px solid #f44336;
          background: rgba(244, 67, 54, 0.02);
        }
        .history-item.muted {
          border-left: 4px solid #9e9e9e;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .history-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .vendor-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }
        .vendor-badge.imagetrend {
          background: #2196f3;
        }
        .vendor-badge.zoll {
          background: #ff9800;
        }
        .history-time {
          font-size: 0.85rem;
          color: #666;
        }
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.success {
          background: #e8f5e9;
          color: #4caf50;
        }
        .status-badge.error {
          background: #ffebee;
          color: #f44336;
        }
        .status-badge.muted {
          background: #f5f5f5;
          color: #666;
        }
        .history-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .stat-label {
          font-size: 0.85rem;
          color: #666;
        }
        .stat-value-small {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .stat-item.success .stat-value-small {
          color: #4caf50;
        }
        .stat-item.error .stat-value-small {
          color: #f44336;
        }
        .error-summary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(255, 152, 0, 0.1);
          border-radius: 4px;
          margin-top: 0.5rem;
        }
        .error-icon {
          font-size: 1rem;
        }
        .error-text {
          font-size: 0.85rem;
          color: #f57c00;
          font-weight: 500;
        }
        .duration-info {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #f0f0f0;
        }
        .duration-info .muted-text {
          font-size: 0.8rem;
        }
        .last-import-info {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
          text-align: center;
        }
        .last-import-info .muted-text {
          font-size: 0.85rem;
        }
      `}</style>
    </section>
  )
}
