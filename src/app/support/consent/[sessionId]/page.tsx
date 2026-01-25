"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

import { apiFetch } from "@/lib/api"

export default function SupportConsentPage() {
  const params = useParams()
  const sessionId = params?.sessionId
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const handleDecision = async (approved: boolean) => {
    if (!sessionId) return
    setLoading(true)
    try {
      await apiFetch(`/api/support/sessions/${sessionId}/consent`, {
        method: "POST",
        body: JSON.stringify({ approved }),
      })
      setStatus(approved ? "Consent granted" : "Consent denied")
    } catch {
      setStatus("Unable to record decision")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="landing-shell">
      <div className="landing">
        <div className="positioning">
          <p className="eyebrow">Support session consent</p>
          <h2>Allow support to view your session for 15 minutes?</h2>
          <p>
            This session is tenant-scoped, audited, and expires automatically. Approve to let support view the stream; deny to stop all mirroring.
          </p>
          <div className="cta-row">
            <button
              className="cta-button cta-primary"
              type="button"
              onClick={() => handleDecision(true)}
              disabled={loading}
            >
              {loading ? "Processing..." : "Allow"}
            </button>
            <button
              className="cta-button cta-secondary"
              type="button"
              onClick={() => handleDecision(false)}
              disabled={loading}
            >
              {loading ? "Processing..." : "Deny"}
            </button>
          </div>
          {status && <p className="muted-text">{status}</p>}
        </div>
      </div>
    </main>
  )
}
