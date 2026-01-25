"use client"

import { useEffect, useMemo, useState } from "react"

import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

const EVENT_TYPES = ["screen_state", "click", "route", "error", "ocr_capture", "log_line"]
const PURPOSES = [
  { label: "Mirror (consent required)", value: "mirror" },
  { label: "Workflow replay", value: "workflow_replay" },
  { label: "OCR troubleshooting", value: "ocr_troubleshoot" },
]

export default function SupportPage() {
  const [orgId, setOrgId] = useState<number | null>(null)
  const [users, setUsers] = useState<{ id: number; email: string; full_name: string }[]>([])
  const [session, setSession] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [status, setStatus] = useState<string>("")
  const [bundleMessage, setBundleMessage] = useState<string>("")
  const [form, setForm] = useState({
    userId: "",
    deviceId: "",
    purpose: "mirror",
    expiresMinutes: 15,
    recipient: "",
    message: "",
    eventType: EVENT_TYPES[0],
    eventPayload: JSON.stringify({ element: "button" }, null, 2),
  })

  const consentLink = useMemo(() => {
    if (!session) return ""
    return `/support/consent/${session.session_id}?token=${session.consent_token}`
  }, [session])

  useEffect(() => {
    let mounted = true
    apiFetch("/api/founder/overview")
      .then((data) => {
        if (!mounted) return
        if (data.orgs.length) {
          const id = data.orgs[0].id
          setOrgId(id)
          return apiFetch(`/api/founder/orgs/${id}/users`)
        }
        return Promise.resolve([])
      })
      .then((orgUsers) => {
        if (!mounted) return
        setUsers(orgUsers)
        if (orgUsers.length) {
          setForm((prev) => ({
            ...prev,
            userId: orgUsers[0].id.toString(),
            recipient: orgUsers[0].email,
          }))
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus("Unable to load org users")
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (session) {
      loadEvents()
    }
  }, [session])

  const handleCreateSession = async () => {
    if (!form.userId && !form.deviceId) {
      setStatus("Select a user or provide a device ID")
      return
    }
    try {
      const payload = {
        target_user_id: form.userId ? Number(form.userId) : undefined,
        target_device_id: form.deviceId || undefined,
        purpose: form.purpose,
        expires_minutes: form.expiresMinutes,
      }
      const response = await apiFetch("/api/support/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      setSession(response)
      setStatus("Session created")
      setEvents([])
    } catch (err) {
      setStatus("Unable to create session")
    }
  }

  const loadEvents = async () => {
    if (!session) return
    try {
      const data = await apiFetch(`/api/support/sessions/${session.session_id}/events`, {
        method: "GET",
      })
      setEvents(data.events)
    } catch (err) {
      setStatus("Failed to load events")
    }
  }

  const handleAppendEvent = async () => {
    if (!session) return
    try {
      const payload = JSON.parse(form.eventPayload)
      await apiFetch(`/api/support/sessions/${session.session_id}/events`, {
        method: "POST",
        headers: {
          "x-support-session-token": session.session_token,
        },
        body: JSON.stringify({ event_type: form.eventType, payload }),
      })
      setStatus("Event logged")
      loadEvents()
    } catch (err) {
      setStatus("Unable to append event")
    }
  }

  const copyBundle = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(events, null, 2))
      setBundleMessage("Troubleshooting bundle copied")
    } catch {
      setBundleMessage("Unable to copy bundle")
    }
  }

  const endSession = async () => {
    if (!session) return
    try {
      await apiFetch(`/api/support/sessions/${session.session_id}/end`, { method: "POST" })
      setStatus("Session ended")
    } catch {
      setStatus("Unable to end session")
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
              <p className="eyebrow">Ops support</p>
              <h2>Stretch support reach</h2>
              <p className="muted-text">Create opt-in sessions, stream events, and share troubleshooting bundles.</p>
            </header>

            <div className="data-grid">
              <section className="panel">
                <header>
                  <h3>Create session</h3>
                </header>
                <div className="panel-stack">
                  <label className="form-field">
                    <span>Target user</span>
                    <select
                      value={form.userId}
                      onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
                    >
                      <option value="">Select a user</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Device ID (optional)</span>
                    <input
                      value={form.deviceId}
                      onChange={(event) => setForm((prev) => ({ ...prev, deviceId: event.target.value }))}
                      placeholder="device-123"
                    />
                  </label>
                  <label className="form-field">
                    <span>Purpose</span>
                    <select
                      value={form.purpose}
                      onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                    >
                      {PURPOSES.map((purpose) => (
                        <option key={purpose.value} value={purpose.value}>
                          {purpose.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>TTL (minutes)</span>
                    <input
                      type="number"
                      value={form.expiresMinutes}
                      min={5}
                      max={120}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, expiresMinutes: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <button className="cta-button cta-primary" type="button" onClick={handleCreateSession}>
                    Create session
                  </button>
                  {session && (
                    <p className="muted-text">
                      Session ID: {session.session_id} • Consent link:{" "}
                      <code>{consentLink}</code>
                    </p>
                  )}
                </div>
              </section>

              <section className="panel">
                <header>
                  <h3>Event stream</h3>
                </header>
                <div className="panel-stack">
                  <label className="form-field">
                    <span>Event type</span>
                    <select
                      value={form.eventType}
                      onChange={(event) => setForm((prev) => ({ ...prev, eventType: event.target.value }))}
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Payload (JSON)</span>
                    <textarea
                      value={form.eventPayload}
                      onChange={(event) => setForm((prev) => ({ ...prev, eventPayload: event.target.value }))}
                      rows={4}
                    />
                  </label>
                  <button className="cta-button cta-secondary" type="button" onClick={handleAppendEvent}>
                    Append event
                  </button>
                  <button
                    className="cta-button cta-secondary"
                    type="button"
                    onClick={loadEvents}
                  >
                    Refresh
                  </button>
                  <button className="cta-button" type="button" onClick={copyBundle}>
                    Copy troubleshooting bundle
                  </button>
                  <button className="cta-button cta-secondary" type="button" onClick={endSession}>
                    End session
                  </button>
                  {status && <p className="muted-text">{status}</p>}
                  {bundleMessage && <p className="muted-text">{bundleMessage}</p>}
                </div>
                <div className="event-log">
                  {events.map((event) => (
                    <article key={event.id} className="panel-card">
                      <strong>{event.event_type}</strong>
                      <p className="muted-text">
                        {event.created_at ?? "pending"} • {JSON.stringify(event.payload)}
                      </p>
                    </article>
                  ))}
                  {!events.length && <p className="muted-text">No events yet</p>}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
