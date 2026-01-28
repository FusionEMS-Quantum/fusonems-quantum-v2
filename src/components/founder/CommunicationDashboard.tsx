"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import styles from "./communication-dashboard.module.css"

type PhoneSystemStats = {
  active_calls: number
  calls_today: number
  missed_calls: number
  voicemail_count: number
  ava_ai_responses_today: number
  hours_saved_today: number
  customer_satisfaction_score: number
  issue_resolution_rate: number
}

type RecentCall = {
  id: string
  caller_number: string
  direction: "inbound" | "outbound"
  started_at: string
  duration_seconds: number
  status: string
  ai_handled: boolean
  ivr_route: string
  transcription_status: string
}

type AIInsight = {
  type: "missed_opportunity" | "customer_issue" | "optimization"
  title: string
  description: string
  impact: "high" | "medium" | "low"
  recommended_action: string
  auto_routed: boolean
}

type MessageDashboard = {
  unread_count: number
  total_count: number
  recent_messages: {
    id: string
    sender: string
    subject: string
    received_at: string
    priority: "high" | "medium" | "low"
  }[]
}

type FaxDashboard = {
  pending_faxes: number
  successful_faxes: number
  failed_faxes: number
  recent_faxes: {
    id: string
    sender_number: string
    pages: number
    status: string
    received_at: string
  }[]
}

export default function CommunicationDashboard() {
  const [stats, setStats] = useState<PhoneSystemStats | null>()
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [messageData, setMessageData] = useState<MessageDashboard | null>()
  const [faxData, setFaxData] = useState<FaxDashboard | null>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [showDialPanel, setShowDialPanel] = useState(false)
  const [dialNumber, setDialNumber] = useState("")
  const [callStatus, setCallStatus] = useState<string>("")
  const [isCalling, setIsCalling] = useState(false)

  useEffect(() => {
    let mounted = true

    Promise.all([
      apiFetch<PhoneSystemStats>("/api/founder/phone/stats").catch(() => null),
      apiFetch<RecentCall[]>("/api/founder/phone/recent-calls").catch(() => []),
      apiFetch<AIInsight[]>("/api/founder/phone/ai-insights").catch(() => []),
      apiFetch<MessageDashboard>("/api/founder/email/stats").catch(() => null),
      apiFetch<FaxDashboard>("/api/founder/fax/dashboard").catch(() => null),
    ])
      .then(([statsData, callsData, insightsData, messageStats, faxStats]) => {
        if (!mounted) return
        setStats(statsData)
        setRecentCalls(callsData)
        setAiInsights(insightsData)
        setMessageData(messageStats)
        setFaxData(faxStats)
      })
      .catch(() => {
        if (mounted) setError("Failed to load communication systems")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor((seconds || 0) / 60)
    const secs = (seconds || 0) % 60
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const formatPhoneNumber = (number: string) => {
    if (!number) return "—"
    if (number.startsWith("+1") && number.length >= 12) {
      return `${number.slice(0, 2)} (${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8, 12)}`
    }
    return number
  }

  const dialPlaceholder = useMemo(() => {
    return "+15551234567"
  }, [])

  const handleMakeCall = async () => {
    const trimmed = dialNumber.trim()
    if (!trimmed) return

    const phoneRegex = /^\+?[1-9]\d{9,14}$/
    if (!phoneRegex.test(trimmed)) {
      setCallStatus("Invalid phone number. Use format: +15551234567")
      return
    }

    setIsCalling(true)
    setCallStatus("Initiating call...")

    try {
      await apiFetch<{ call_id: string; status: string }>("/api/founder/phone/make-call", {
        method: "POST",
        body: JSON.stringify({ to_number: trimmed, from_number: "+17152543027" }),
      })

      setCallStatus("Call request submitted")

      apiFetch<RecentCall[]>("/api/founder/phone/recent-calls")
        .then(setRecentCalls)
        .catch(() => {})
    } catch {
      setCallStatus("Voice calling temporarily unavailable")
    } finally {
      setTimeout(() => {
        setIsCalling(false)
      }, 1500)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading unified communication systems...</p>
      </div>
    )
  }

  if (error || (!stats && !messageData && !faxData)) {
    return (
      <div className={styles.error}>
        <p>{error || "Communication systems unavailable"}</p>
      </div>
    )
  }

  return (
    <section className={styles.communicationDashboard}>
      <div className={styles.dashboardHeader}>
        <h2 className={styles.dashboardTitle}>Communication Hub</h2>
        <p className={styles.dashboardSubtitle}>Voice, messaging, and fax operational visibility</p>
      </div>

      <div className={styles.metricsGrid}>
        {stats && (
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <h3>Phone System</h3>
              <button
                className={styles.dialTrigger}
                onClick={() => setShowDialPanel((v) => !v)}
                title="Make outbound call"
              >
                Dial
              </button>
            </div>
            <div className={styles.metricsList}>
              {[
                { key: "active_calls", label: "Active", value: stats.active_calls },
                { key: "calls_today", label: "Today", value: stats.calls_today },
                { key: "missed_calls", label: "Missed", value: stats.missed_calls },
                { key: "voicemail_count", label: "Voicemail", value: stats.voicemail_count },
              ].map((metric) => (
                <div key={metric.key} className={styles.metricItem}>
                  <span className={styles.metricLabel}>{metric.label}</span>
                  <span className={styles.metricValue}>{metric.value}</span>
                </div>
              ))}
            </div>
            <div className={styles.metricFooter}>
              <span>
                AI Satisfaction: {stats.customer_satisfaction_score}% | Resolution: {stats.issue_resolution_rate}%
              </span>
            </div>
          </div>
        )}

        {messageData && (
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <h3>Email & Messages</h3>
            </div>
            <div className={styles.metricsList}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Unread</span>
                <span className={styles.metricValue}>{messageData.unread_count}</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Total</span>
                <span className={styles.metricValue}>{messageData.total_count}</span>
              </div>
            </div>
          </div>
        )}

        {faxData && (
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <h3>Fax System</h3>
            </div>
            <div className={styles.metricsList}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Pending</span>
                <span className={styles.metricValue}>{faxData.pending_faxes}</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Successful</span>
                <span className={styles.metricValue}>{faxData.successful_faxes}</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Failed</span>
                <span className={styles.metricValue}>{faxData.failed_faxes}</span>
              </div>
            </div>

            {faxData.recent_faxes.length > 0 && (
              <div className={styles.recentCommunications}>
                <h4>Recent Faxes</h4>
                {faxData.recent_faxes.slice(0, 3).map((fax) => (
                  <div key={fax.id} className={styles.callItem}>
                    <div className={styles.callMeta}>
                      <span className={styles.callerNumber}>{formatPhoneNumber(fax.sender_number)}</span>
                      <span className={styles.callTime}>{fax.pages}p</span>
                    </div>
                    <div className={styles.callStatus}>
                      <span className={styles.statusBadge}>{fax.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showDialPanel && (
        <div className={styles.dialPanel}>
          <div className={styles.dialHeader}>
            <h3>Make Outbound Call</h3>
            <button
              className={styles.closeButton}
              onClick={() => setShowDialPanel(false)}
              disabled={isCalling}
              aria-label="Close dial panel"
            >
              ×
            </button>
          </div>

          <div className={styles.dialForm}>
            <div className={styles.formGroup}>
              <label>Dial Number *</label>
              <input
                type="tel"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder={dialPlaceholder}
                disabled={isCalling}
                className={styles.dialInput}
              />
            </div>

            {callStatus && <div className={styles.callStatus}>{callStatus}</div>}

            <div className={styles.dialActions}>
              <button
                className={styles.primaryButton}
                onClick={handleMakeCall}
                disabled={!dialNumber.trim() || isCalling}
              >
                {isCalling ? "Calling..." : "Make Call"}
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setDialNumber("")
                  setShowDialPanel(false)
                  setCallStatus("")
                }}
                disabled={isCalling}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {recentCalls.length > 0 && (
        <div className={styles.recentCommunications}>
          <h4>Recent Calls</h4>
          {recentCalls.slice(0, 5).map((call) => (
            <div key={call.id} className={styles.callItem}>
              <div className={styles.callMeta}>
                <span className={styles.callerNumber}>{formatPhoneNumber(call.caller_number)}</span>
                <span className={styles.callTime}>{formatDuration(call.duration_seconds)}</span>
                {call.ai_handled && <span className={styles.statusBadge}>AI</span>}
              </div>
              <div className={styles.callStatus}>
                <span className={styles.statusBadge}>{call.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {aiInsights.length > 0 && (
        <div className={styles.recentCommunications}>
          <h4>AI Communication Insights</h4>
          {aiInsights.slice(0, 3).map((insight, idx) => (
            <div key={idx} className={styles.callItem}>
              <div className={styles.callMeta}>
                <span className={styles.callerNumber}>{insight.title}</span>
              </div>
              <div className={styles.callStatus}>
                <span className={styles.statusBadge}>{insight.impact}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
