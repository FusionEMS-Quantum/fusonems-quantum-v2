"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

type OrgHealth = {
  org_id: number
  org_name: string
  module_health: {
    module_key: string
    health_state: string
    enabled: boolean
    kill_switch: boolean
    degraded: boolean
  }[]
  queue_summary: { total: number; queued: number; errors: number; error_rate: number }
  active_degradation: boolean
  last_event_at: string | null
  recent_events_last_hour: number
  upgrade: { status: string; issues: string[] }
}

type OrgUser = {
  id: number
  email: string
  full_name: string
  role: string
}

type FormState = {
  recipient: string
  message: string
  userId: string
  purpose: string
  deviceId: string
  expiresMinutes: number
}

export default function FounderOrgDetailPage() {
  const params = useParams()
  const orgId = params?.orgId
  const [health, setHealth] = useState<OrgHealth | null>(null)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [criticalAudits, setCriticalAudits] = useState<{ id: number; resource: string; action: string; created_at: string | null }[]>([])
  const [form, setForm] = useState<FormState>({
    recipient: "",
    message: "",
    userId: "",
    purpose: "mirror",
    deviceId: "",
    expiresMinutes: 15,
  })
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!orgId) return
    let mounted = true
    const fetchData = async () => {
      try {
        const [orgHealth, orgUsers, overview] = await Promise.all([
          apiFetch<OrgHealth>(`/api/founder/orgs/${orgId}/health`),
          apiFetch<OrgUser[]>(`/api/founder/orgs/${orgId}/users`),
          apiFetch<{ critical_audits: typeof criticalAudits }>("/api/founder/overview"),
        ])
        if (!mounted) return
        setHealth(orgHealth)
        setUsers(orgUsers)
        setForm((prev) => ({
          ...prev,
          userId: orgUsers[0]?.id.toString() ?? "",
          recipient: orgUsers[0]?.email ?? "",
        }))
        setCriticalAudits(overview.critical_audits.slice(0, 6))
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
    return () => {
      mounted = false
    }
  }, [orgId])

  const avgQueue = useMemo(() => {
    if (!health) return []
    return [
      { label: "Queue depth", value: health.queue_summary.total },
      { label: "Last event", value: health.last_event_at ?? "—" },
      { label: "Events/hr", value: health.recent_events_last_hour },
      { label: "Upgrade status", value: health.upgrade.status },
    ]
  }, [health])

  const handleSend = async () => {
    if (!form.recipient || !form.message) {
      setStatus({ type: "error", text: "Recipient and message are required" })
      return
    }
    try {
      await apiFetch("/api/founder/notify/sms", {
        method: "POST",
        body: JSON.stringify({
          recipient: form.recipient,
          message: form.message,
          context: health?.org_name,
        }),
      })
      setStatus({ type: "success", text: "SMS queued" })
    } catch (err) {
      setStatus({ type: "error", text: "Unable to queue SMS" })
    }
  }

  return (
    <div className="platform-shell">
      <Sidebar />
      <main className="platform-main">
        <Topbar />
        <div className="platform-content">
          <section className="platform-page">
            <header>
              <p className="eyebrow">Org detail</p>
              <h2>Diagnostics for {health?.org_name ?? "loading..."}</h2>
              <p className="muted-text">Queue depth, module readiness, and recent audits.</p>
            </header>

            <div className="data-grid">
              <section className="panel">
                <header>
                  <h3>Diagnostics snapshot</h3>
                </header>
                <div className="panel-stack">
                  {avgQueue.map((entry) => (
                    <article key={entry.label} className="panel-card">
                      <p className="muted-text">{entry.label}</p>
                      <strong>{entry.value}</strong>
                    </article>
                  ))}
                </div>
                <div className="panel-wrap">
                  {(health?.module_health ?? []).map((module) => (
                    <article
                      key={module.module_key}
                      className={`panel-card ${module.degraded ? "warning" : ""}`}
                    >
                      <strong>{module.module_key}</strong>
                      <p className="muted-text">
                        {module.health_state} • {module.enabled ? "Enabled" : "Disabled"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <header>
                  <h3>Send SMS</h3>
                </header>
                <div className="panel-stack">
                  <label className="form-field">
                    <span>Target user</span>
                    <select
                      value={form.userId}
                      onChange={(event) => {
                        const selected = users.find((user) => user.id === Number(event.target.value))
                        setForm((prev) => ({
                          ...prev,
                          userId: event.target.value,
                          recipient: selected?.email ?? prev.recipient,
                        }))
                      }}
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Recipient number</span>
                    <input
                      value={form.recipient}
                      onChange={(event) => setForm((prev) => ({ ...prev, recipient: event.target.value }))}
                      placeholder="+1..."
                    />
                  </label>
                  <label className="form-field">
                    <span>Message</span>
                    <textarea
                      value={form.message}
                      onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                      rows={3}
                    />
                  </label>
                  <button className="cta-button cta-primary" type="button" onClick={handleSend}>
                    Send SMS
                  </button>
                  {status && (
                    <p className={`muted-text ${status.type === "error" ? "warning-text" : ""}`}>
                      {status.text}
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="panel">
              <header>
                <h3>Critical audits</h3>
                <p className="muted-text">Recent auth, billing, and export actions.</p>
              </header>
              <ul className="audit-list">
                {criticalAudits.map((audit) => (
                  <li key={audit.id}>
                    <strong>{audit.action}</strong>
                    <p className="muted-text">
                      {audit.resource} • {audit.created_at ?? "pending"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
