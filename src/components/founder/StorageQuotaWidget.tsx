"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type StorageHealth = {
  status: string
  configured: boolean
  message: string
  bucket: string
  region: string
  metrics: {
    total_files: number
    total_size_gb: number
    deleted_files: number
    quota_gb: number
    quota_usage_pct: number
    operations_24h: number
    failed_operations_24h: number
    error_rate_24h_pct: number
  }
}

export function StorageQuotaWidget() {
  const [storage, setStorage] = useState<StorageHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchStorage = () => {
      apiFetch<StorageHealth>("/api/founder/storage/health")
        .then((data) => {
          if (mounted) {
            setStorage(data)
            setLoading(false)
          }
        })
        .catch(() => {
          if (mounted) setLoading(false)
        })
    }

    fetchStorage()
    const interval = setInterval(fetchStorage, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading || !storage) {
    return (
      <article className="platform-card">
        <p className="muted-text">Loading storage quota...</p>
      </article>
    )
  }

  const { total_size_gb, quota_gb, quota_usage_pct, total_files } = storage.metrics
  const isWarning = quota_usage_pct > 80
  const isCritical = quota_usage_pct > 95

  return (
    <article className={`platform-card ${isCritical ? "error" : isWarning ? "warning" : ""}`}>
      <div>
        <strong>Storage Quota</strong>
        <p className="muted-text">
          {total_files.toLocaleString()} files • {storage.bucket}
        </p>
      </div>

      <div className="quota-progress">
        <div className="quota-bar">
          <div
            className={`quota-fill ${isCritical ? "critical" : isWarning ? "warning" : "normal"}`}
            style={{ width: `${Math.min(quota_usage_pct, 100)}%` }}
          />
        </div>
        <div className="quota-stats">
          <span className="quota-value">
            {total_size_gb.toFixed(2)} GB / {quota_gb} GB
          </span>
          <span className={`quota-percent ${isCritical ? "critical" : isWarning ? "warning" : ""}`}>
            {quota_usage_pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {isCritical && (
        <div className="quota-alert">
          <strong>⚠️ Critical: Storage quota exceeded 95%</strong>
          <p className="muted-text">Cleanup or upgrade required immediately</p>
        </div>
      )}

      {isWarning && !isCritical && (
        <div className="quota-alert">
          <strong>⚡ Warning: Storage quota exceeded 80%</strong>
          <p className="muted-text">Consider cleanup or quota upgrade soon</p>
        </div>
      )}

      <style jsx>{`
        .quota-progress {
          margin-top: 1rem;
        }
        .quota-bar {
          height: 12px;
          background: #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }
        .quota-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        .quota-fill.normal {
          background: linear-gradient(90deg, #4caf50, #66bb6a);
        }
        .quota-fill.warning {
          background: linear-gradient(90deg, #ff9800, #ffb74d);
        }
        .quota-fill.critical {
          background: linear-gradient(90deg, #f44336, #ef5350);
        }
        .quota-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        .quota-value {
          font-weight: 500;
        }
        .quota-percent {
          font-weight: 700;
        }
        .quota-percent.warning {
          color: #ff9800;
        }
        .quota-percent.critical {
          color: #f44336;
        }
        .quota-alert {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 4px;
          background: rgba(255, 152, 0, 0.1);
          border-left: 3px solid #ff9800;
        }
        .quota-alert strong {
          display: block;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </article>
  )
}
