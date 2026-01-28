"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type ReportingData = {
  system_reporting: {
    total_reports: number
    scheduled_reports: number
    on_demand_reports: number
    recent_24h: number
    avg_generation_time_sec: number
  }
  compliance_exports: {
    total_exports: number
    pending_exports: number
    completed_exports: number
    failed_exports: number
    nemsis_compliant: number
    compliance_rate: number
  }
  dashboard_builder: {
    custom_dashboards: number
    active_dashboards: number
    total_widgets: number
    most_used_widgets: Array<{ widget: string; usage_count: number }>
  }
  automated_reports: {
    total_automated: number
    active_schedules: number
    successful_runs_24h: number
    failed_runs_24h: number
    success_rate: number
  }
  data_exports: {
    total_pipelines: number
    active_pipelines: number
    data_volume_gb: number
    last_export_status: string
    export_destinations: Array<{ destination: string; count: number }>
  }
  analytics_api: {
    health_status: "HEALTHY" | "WARNING" | "DEGRADED" | "CRITICAL"
    uptime_percentage: number
    avg_response_time_ms: number
    requests_24h: number
    error_rate: number
  }
  ai_insights: string[]
  timestamp: string
}

export function ReportingDashboardWidget() {
  const [data, setData] = useState<ReportingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let mounted = true
    const fetchData = () => {
      apiFetch<ReportingData>("/api/founder/reporting/analytics")
        .then((result) => {
          if (mounted) {
            setData(result)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (mounted) {
            setError("Failed to load reporting analytics")
            setLoading(false)
          }
        })
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <section className="panel">
        <header>
          <h3>Reporting & Analytics</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading reporting data...</p>
        </div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="panel">
        <header>
          <h3>Reporting & Analytics</h3>
        </header>
        <div className="panel-card warning">
          <p>{error || "Unable to load reporting analytics"}</p>
        </div>
      </section>
    )
  }

  const apiStatusColor = {
    HEALTHY: "success",
    WARNING: "warning",
    DEGRADED: "warning",
    CRITICAL: "error",
  }[data.analytics_api.health_status]

  return (
    <section className="panel">
      <header>
        <h3>Reporting & Analytics</h3>
        <p className="muted-text">Last updated: {new Date(data.timestamp).toLocaleTimeString()}</p>
      </header>

      {data.ai_insights.length > 0 && (
        <div className="platform-card info">
          <strong>AI Insights</strong>
          <ul className="insights-list">
            {data.ai_insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={`platform-card ${apiStatusColor}`}>
        <div>
          <strong className="status-text">Analytics API: {data.analytics_api.health_status}</strong>
          <p className="muted-text">
            {data.analytics_api.uptime_percentage.toFixed(2)}% uptime • {data.analytics_api.avg_response_time_ms}ms avg response
          </p>
          <p className="muted-text">
            {data.analytics_api.requests_24h} requests (24h) • {data.analytics_api.error_rate.toFixed(2)}% error rate
          </p>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="System Reports"
          value={data.system_reporting.total_reports}
          subtitle={`${data.system_reporting.scheduled_reports} scheduled • ${data.system_reporting.on_demand_reports} on-demand`}
          trend={`${data.system_reporting.recent_24h} generated in 24h`}
          status="info"
        />
        <MetricCard
          title="Compliance Exports"
          value={data.compliance_exports.total_exports}
          subtitle={`${data.compliance_exports.pending_exports} pending • ${data.compliance_exports.completed_exports} completed`}
          trend={`${data.compliance_exports.compliance_rate.toFixed(1)}% NEMSIS compliant`}
          status={data.compliance_exports.compliance_rate > 95 ? "success" : "warning"}
        />
        <MetricCard
          title="Custom Dashboards"
          value={data.dashboard_builder.custom_dashboards}
          subtitle={`${data.dashboard_builder.active_dashboards} active`}
          trend={`${data.dashboard_builder.total_widgets} total widgets`}
          status="success"
        />
        <MetricCard
          title="Data Pipelines"
          value={data.data_exports.active_pipelines}
          subtitle={`${data.data_exports.total_pipelines} total pipelines`}
          trend={`${data.data_exports.data_volume_gb.toFixed(2)} GB exported`}
          status={data.data_exports.last_export_status === "success" ? "success" : "warning"}
        />
      </div>

      <div className="section-title">
        <strong>Automated Reports</strong>
      </div>
      <div className="platform-card">
        <div className="automation-grid">
          <div>
            <strong style={{ fontSize: "1.5rem" }}>{data.automated_reports.total_automated}</strong>
            <p className="muted-text">Total Automated</p>
          </div>
          <div>
            <strong style={{ fontSize: "1.5rem" }}>{data.automated_reports.active_schedules}</strong>
            <p className="muted-text">Active Schedules</p>
          </div>
          <div>
            <strong style={{ fontSize: "1.5rem" }}>{data.automated_reports.successful_runs_24h}</strong>
            <p className="muted-text">Successful (24h)</p>
          </div>
          <div>
            <strong style={{ fontSize: "1.5rem", color: data.automated_reports.failed_runs_24h > 0 ? "var(--error)" : "inherit" }}>
              {data.automated_reports.failed_runs_24h}
            </strong>
            <p className="muted-text">Failed (24h)</p>
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <div className="progress-bar">
            <div
              className="progress-fill success"
              style={{ width: `${data.automated_reports.success_rate}%` }}
            />
          </div>
          <p className="muted-text" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            {data.automated_reports.success_rate.toFixed(1)}% success rate
          </p>
        </div>
      </div>

      {data.compliance_exports.failed_exports > 0 && (
        <div className="platform-card error">
          <strong>Export Failures Detected</strong>
          <p className="muted-text">
            {data.compliance_exports.failed_exports} compliance exports failed - review export logs
          </p>
        </div>
      )}

      {data.dashboard_builder.most_used_widgets.length > 0 && (
        <>
          <div className="section-title">
            <strong>Most Used Dashboard Widgets</strong>
          </div>
          <div className="widgets-list">
            {data.dashboard_builder.most_used_widgets.slice(0, 5).map((widget, i) => (
              <div key={i} className="platform-card">
                <div className="widget-row">
                  <strong>{widget.widget}</strong>
                  <span className="muted-text">{widget.usage_count} uses</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data.data_exports.export_destinations.length > 0 && (
        <>
          <div className="section-title">
            <strong>Export Destinations</strong>
          </div>
          <div className="destinations-grid">
            {data.data_exports.export_destinations.map((dest, i) => (
              <div key={i} className="platform-card info">
                <div style={{ textAlign: "center" }}>
                  <strong style={{ fontSize: "1.25rem" }}>{dest.count}</strong>
                  <p className="muted-text" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    {dest.destination}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .status-text {
          font-size: 1.25rem;
          font-weight: 700;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }
        .automation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          text-align: center;
        }
        .destinations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }
        .section-title {
          margin: 1.5rem 0 0.75rem 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
        }
        .insights-list {
          margin: 0.5rem 0 0 0;
          padding-left: 1.25rem;
          list-style: disc;
        }
        .insights-list li {
          margin: 0.25rem 0;
          font-size: 0.9rem;
        }
        .widgets-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .widget-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--bg-secondary);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        .progress-fill.success {
          background: var(--success);
        }
        .muted-text {
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
      `}</style>
    </section>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  trend,
  status,
}: {
  title: string
  value: number | string
  subtitle: string
  trend: string
  status: string
}) {
  return (
    <article className={`platform-card ${status}`}>
      <div>
        <p className="muted-text" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          {title}
        </p>
        <strong style={{ fontSize: "1.75rem", fontWeight: 700 }}>{value}</strong>
        <p className="muted-text" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
          {subtitle}
        </p>
        <p className="muted-text" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
          {trend}
        </p>
      </div>
    </article>
  )
}
