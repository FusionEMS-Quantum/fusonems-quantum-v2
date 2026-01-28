"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type BuilderHealth = {
  status: string
  message: string
  metrics: Record<string, number>
}

type BuildersResponse = {
  builders: {
    validation_rules: BuilderHealth
    nemsis: BuilderHealth
    exports: BuilderHealth
  }
  timestamp: string
}

export function BuilderSystemsWidget() {
  const [builders, setBuilders] = useState<BuildersResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchBuilders = () => {
      apiFetch<BuildersResponse>("/api/founder/builders/health")
        .then((data) => {
          if (mounted) {
            setBuilders(data)
            setLoading(false)
          }
        })
        .catch(() => {
          if (mounted) setLoading(false)
        })
    }

    fetchBuilders()
    const interval = setInterval(fetchBuilders, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading || !builders) {
    return (
      <section className="panel">
        <header>
          <h3>Builder Systems</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading builder systems...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <header>
        <h3>Builder Systems</h3>
        <p className="muted-text">NEMSIS, Validation Rules, and Exports</p>
      </header>

      <div className="builders-grid">
        <BuilderCard
          title="Validation Rules"
          health={builders.builders.validation_rules}
          icon="📋"
          metrics={[
            { label: "Active Rules", value: builders.builders.validation_rules.metrics.active_rules },
            { label: "Open Issues", value: builders.builders.validation_rules.metrics.open_issues },
            { label: "High Severity", value: builders.builders.validation_rules.metrics.high_severity_issues },
          ]}
        />

        <BuilderCard
          title="NEMSIS System"
          health={builders.builders.nemsis}
          icon="🏥"
          metrics={[
            { label: "Total Patients", value: builders.builders.nemsis.metrics.total_patients },
            { label: "Finalized", value: builders.builders.nemsis.metrics.finalized_patients },
            { label: "Avg QA Score", value: `${builders.builders.nemsis.metrics.avg_qa_score}%` },
          ]}
        />

        <BuilderCard
          title="Export System"
          health={builders.builders.exports}
          icon="📤"
          metrics={[
            { label: "Total Exports", value: builders.builders.exports.metrics.total_exports },
            { label: "Pending", value: builders.builders.exports.metrics.pending_exports },
            { label: "Failure Rate", value: `${builders.builders.exports.metrics.failure_rate_pct}%` },
          ]}
        />
      </div>

      <style jsx>{`
        .builders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
      `}</style>
    </section>
  )
}

function BuilderCard({
  title,
  health,
  icon,
  metrics,
}: {
  title: string
  health: BuilderHealth
  icon: string
  metrics: { label: string; value: string | number }[]
}) {
  const statusColor = {
    HEALTHY: "success",
    WARNING: "warning",
    DEGRADED: "warning",
    CRITICAL: "error",
    UNKNOWN: "muted",
  }[health.status] || "muted"

  return (
    <article className={`platform-card ${statusColor}`}>
      <div className="builder-header">
        <span className="builder-icon">{icon}</span>
        <div>
          <strong>{title}</strong>
          <p className="muted-text">{health.status}</p>
        </div>
      </div>

      <p className="builder-message">{health.message}</p>

      <div className="builder-metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className="metric">
            <span className="metric-label">{metric.label}</span>
            <span className="metric-value">{metric.value}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .builder-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .builder-icon {
          font-size: 2rem;
        }
        .builder-message {
          font-size: 0.85rem;
          color: #666;
          margin: 0 0 1rem 0;
        }
        .builder-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 4px;
        }
        .metric-label {
          font-size: 0.85rem;
          color: #666;
        }
        .metric-value {
          font-weight: 600;
          font-size: 0.9rem;
        }
      `}</style>
    </article>
  )
}
