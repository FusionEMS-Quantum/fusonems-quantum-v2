"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type MarketingData = {
  demo_requests: {
    total: number
    pending: number
    contacted: number
    converted: number
    conversion_rate: number
    recent_24h: number
  }
  lead_generation: {
    total_leads: number
    qualified_leads: number
    qualification_rate: number
    recent_24h: number
    top_sources: Array<{ source: string; count: number }>
  }
  campaigns: {
    active_campaigns: number
    total_campaigns: number
    avg_conversion_rate: number
    top_performing: Array<{ campaign: string; conversions: number; rate: number }>
  }
  pipeline: {
    stage_1_awareness: number
    stage_2_interest: number
    stage_3_consideration: number
    stage_4_decision: number
    total_pipeline_value: number
  }
  channels: {
    top_channels: Array<{ channel: string; leads: number; conversions: number; roi: number }>
  }
  roi_analysis: {
    total_spend: number
    total_revenue: number
    roi_percentage: number
    cost_per_lead: number
    cost_per_acquisition: number
  }
  ai_insights: string[]
  timestamp: string
}

export function MarketingAnalyticsWidget() {
  const [data, setData] = useState<MarketingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let mounted = true
    const fetchData = () => {
      apiFetch<MarketingData>("/api/founder/marketing/analytics")
        .then((result) => {
          if (mounted) {
            setData(result)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (mounted) {
            setError("Failed to load marketing analytics")
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
          <h3>Marketing Analytics</h3>
        </header>
        <div className="panel-card">
          <p className="muted-text">Loading marketing data...</p>
        </div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="panel">
        <header>
          <h3>Marketing Analytics</h3>
        </header>
        <div className="panel-card warning">
          <p>{error || "Unable to load marketing analytics"}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <header>
        <h3>Marketing Analytics</h3>
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

      <div className="metrics-grid">
        <MetricCard
          title="Demo Requests"
          value={data.demo_requests.total}
          subtitle={`${data.demo_requests.pending} pending • ${data.demo_requests.converted} converted`}
          trend={`${data.demo_requests.conversion_rate.toFixed(1)}% conversion rate`}
          status={data.demo_requests.conversion_rate > 30 ? "success" : data.demo_requests.conversion_rate > 15 ? "warning" : "muted"}
        />
        <MetricCard
          title="Lead Generation"
          value={data.lead_generation.total_leads}
          subtitle={`${data.lead_generation.qualified_leads} qualified`}
          trend={`${data.lead_generation.qualification_rate.toFixed(1)}% qualification rate`}
          status={data.lead_generation.qualification_rate > 50 ? "success" : "muted"}
        />
        <MetricCard
          title="Active Campaigns"
          value={data.campaigns.active_campaigns}
          subtitle={`${data.campaigns.total_campaigns} total campaigns`}
          trend={`${data.campaigns.avg_conversion_rate.toFixed(1)}% avg conversion`}
          status={data.campaigns.avg_conversion_rate > 20 ? "success" : "warning"}
        />
        <MetricCard
          title="Marketing ROI"
          value={`${data.roi_analysis.roi_percentage.toFixed(1)}%`}
          subtitle={`$${data.roi_analysis.total_spend.toLocaleString()} spend`}
          trend={`$${data.roi_analysis.cost_per_acquisition.toFixed(2)} CPA`}
          status={data.roi_analysis.roi_percentage > 100 ? "success" : data.roi_analysis.roi_percentage > 50 ? "warning" : "error"}
        />
      </div>

      <div className="section-title">
        <strong>Pipeline Status</strong>
      </div>
      <div className="pipeline-grid">
        <PipelineStage title="Awareness" count={data.pipeline.stage_1_awareness} color="info" />
        <PipelineStage title="Interest" count={data.pipeline.stage_2_interest} color="success" />
        <PipelineStage title="Consideration" count={data.pipeline.stage_3_consideration} color="warning" />
        <PipelineStage title="Decision" count={data.pipeline.stage_4_decision} color="error" />
      </div>

      <div className="section-title">
        <strong>Top Performing Channels</strong>
      </div>
      <div className="channels-list">
        {data.channels.top_channels.slice(0, 5).map((channel, i) => (
          <div key={i} className="platform-card">
            <div className="channel-row">
              <div>
                <strong>{channel.channel}</strong>
                <p className="muted-text">{channel.leads} leads • {channel.conversions} conversions</p>
              </div>
              <div className="channel-roi">
                <span className={channel.roi > 100 ? "success-text" : "muted-text"}>
                  {channel.roi.toFixed(0)}% ROI
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.campaigns.top_performing.length > 0 && (
        <>
          <div className="section-title">
            <strong>Top Campaigns</strong>
          </div>
          <div className="campaigns-list">
            {data.campaigns.top_performing.slice(0, 3).map((campaign, i) => (
              <div key={i} className="platform-card success">
                <div>
                  <strong>{campaign.campaign}</strong>
                  <p className="muted-text">
                    {campaign.conversions} conversions • {campaign.rate.toFixed(1)}% rate
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }
        .pipeline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
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
        .channels-list,
        .campaigns-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .channel-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .channel-roi {
          text-align: right;
          font-weight: 600;
          font-size: 1.1rem;
        }
        .success-text {
          color: var(--success);
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

function PipelineStage({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <article className={`platform-card ${color}`}>
      <div style={{ textAlign: "center" }}>
        <strong style={{ fontSize: "1.5rem", fontWeight: 700 }}>{count}</strong>
        <p className="muted-text" style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
          {title}
        </p>
      </div>
    </article>
  )
}
