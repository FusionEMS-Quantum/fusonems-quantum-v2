"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type FailedOperation = {
  timestamp: string
  action_type: string
  file_path: string
  user_id: number | null
  error_message: string
  ip_address: string | null
}

type FailuresResponse = {
  failures: FailedOperation[]
  count: number
}

export function FailedOperationsWidget() {
  const [failures, setFailures] = useState<FailedOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchFailures = () => {
      apiFetch<FailuresResponse>("/api/founder/storage/failures?limit=20")
        .then((data) => {
          if (mounted) {
            setFailures(data.failures)
            setLoading(false)
          }
        })
        .catch(() => {
          if (mounted) setLoading(false)
        })
    }

    fetchFailures()
    const interval = setInterval(fetchFailures, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <section className="panel">
        <header>
          <h3>Failed Operations</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading...</p>
        </div>
      </section>
    )
  }

  if (failures.length === 0) {
    return (
      <section className="panel">
        <header>
          <h3>Failed Operations</h3>
        </header>
        <div className="platform-card success">
          <strong>✓ No Failed Operations</strong>
          <p className="muted-text">All storage operations completed successfully</p>
        </div>
      </section>
    )
  }

  const displayFailures = expanded ? failures : failures.slice(0, 5)

  return (
    <section className="panel">
      <header>
        <h3>Failed Operations</h3>
        <p className="muted-text">{failures.length} recent failures</p>
      </header>

      {failures.length > 0 && (
        <div className="platform-card error">
          <strong>⚠️ {failures.length} Failed Storage Operations</strong>
          <p className="muted-text">Review errors below and take corrective action</p>
        </div>
      )}

      <ul className="failures-list">
        {displayFailures.map((failure, i) => {
          const fileName = failure.file_path.split("/").pop() || failure.file_path
          const time = new Date(failure.timestamp).toLocaleString()

          return (
            <li key={i} className="failure-item">
              <div className="failure-header">
                <strong className="failure-action">{failure.action_type}</strong>
                <span className="failure-time">{time}</span>
              </div>
              <p className="failure-file">{fileName}</p>
              <p className="failure-error">❌ {failure.error_message}</p>
              {failure.ip_address && (
                <p className="failure-ip">IP: {failure.ip_address}</p>
              )}
            </li>
          )
        })}
      </ul>

      {failures.length > 5 && (
        <button 
          className="expand-button" 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show Less" : `Show All ${failures.length} Failures`}
        </button>
      )}

      <style jsx>{`
        .failures-list {
          list-style: none;
          padding: 0;
          margin: 0;
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
        .failure-action {
          font-size: 0.9rem;
          font-weight: 600;
          color: #f44336;
        }
        .failure-time {
          font-size: 0.8rem;
          color: #666;
        }
        .failure-file {
          font-size: 0.85rem;
          color: #333;
          margin: 0.25rem 0;
          font-family: monospace;
        }
        .failure-error {
          font-size: 0.85rem;
          color: #f44336;
          margin: 0.5rem 0 0.25rem 0;
          font-weight: 500;
        }
        .failure-ip {
          font-size: 0.8rem;
          color: #666;
          margin: 0.25rem 0 0 0;
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
      `}</style>
    </section>
  )
}
