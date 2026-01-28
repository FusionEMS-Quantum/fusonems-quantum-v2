"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type SystemHealthData = {
  overall_status: "HEALTHY" | "WARNING" | "DEGRADED" | "CRITICAL"
  overall_message: string
  timestamp: string
  subsystems: {
    storage: SubsystemHealth
    validation_rules: SubsystemHealth
    nemsis: SubsystemHealth
    exports: SubsystemHealth
  }
  critical_issues: string[]
  warnings: string[]
  requires_immediate_attention: boolean
}

type SubsystemHealth = {
  status: "HEALTHY" | "WARNING" | "DEGRADED" | "CRITICAL" | "UNKNOWN"
  message: string
  metrics?: Record<string, number | string>
}

export function SystemHealthWidget() {
  const [health, setHealth] = useState<SystemHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let mounted = true
    const fetchHealth = () => {
      apiFetch<SystemHealthData>("/api/founder/system/health")
        .then((data) => {
          if (mounted) {
            setHealth(data)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (mounted) {
            setError("Failed to load system health")
            setLoading(false)
          }
        })
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <section className="panel">
        <header>
          <h3>System Health</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading system health...</p>
        </div>
      </section>
    )
  }

  if (error || !health) {
    return (
      <section className="panel">
        <header>
          <h3>System Health</h3>
        </header>
        <div className="panel-card warning">
          <p>{error || "Unable to load system health"}</p>
        </div>
      </section>
    )
  }

  const statusColor = {
    HEALTHY: "success",
    WARNING: "warning",
    DEGRADED: "warning",
    CRITICAL: "error",
  }[health.overall_status]

  return (
    <section className="panel">
      <header>
        <h3>System Health</h3>
        <p className="muted-text">Last updated: {new Date(health.timestamp).toLocaleTimeString()}</p>
      </header>

      <div className={`platform-card ${statusColor}`}>
        <div>
          <strong className="health-status">{health.overall_status}</strong>
          <p className="muted-text">{health.overall_message}</p>
        </div>
      </div>

      {health.requires_immediate_attention && health.critical_issues.length > 0 && (
        <div className="platform-card error">
          <strong>⚠️ Immediate Attention Required</strong>
          <ul className="issue-list">
            {health.critical_issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {health.warnings.length > 0 && (
        <div className="platform-card warning">
          <strong>⚡ Warnings</strong>
          <ul className="issue-list">
            {health.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="subsystems-grid">
        <SubsystemCard title="Storage" health={health.subsystems.storage} />
        <SubsystemCard title="Validation Rules" health={health.subsystems.validation_rules} />
        <SubsystemCard title="NEMSIS" health={health.subsystems.nemsis} />
        <SubsystemCard title="Exports" health={health.subsystems.exports} />
      </div>

      <style jsx>{`
        .health-status {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .issue-list {
          margin: 0.5rem 0 0 0;
          padding-left: 1.25rem;
          list-style: disc;
        }
        .issue-list li {
          margin: 0.25rem 0;
          font-size: 0.9rem;
        }
        .subsystems-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
      `}</style>
    </section>
  )
}

function SubsystemCard({ title, health }: { title: string; health: SubsystemHealth }) {
  const statusColor = {
    HEALTHY: "success",
    WARNING: "warning",
    DEGRADED: "warning",
    CRITICAL: "error",
    UNKNOWN: "muted",
  }[health.status]

  return (
    <article className={`platform-card ${statusColor}`}>
      <div>
        <strong>{title}</strong>
        <p className="muted-text">{health.status}</p>
        <p className="muted-text" style={{ fontSize: "0.85rem" }}>
          {health.message}
        </p>
      </div>
    </article>
  )
}
