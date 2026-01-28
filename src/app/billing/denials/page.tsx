"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

type DeniedClaim = {
  id: number
  payer: string
  denial_reason: string
  created_at?: string
  office_ally_batch_id?: string
}

export default function DenialsPage() {
  const [denials, setDenials] = useState<DeniedClaim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<DeniedClaim[]>("/billing/console/denials")
      .then(setDenials)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="page-shell">
      <section className="glass-panel" style={{ padding: "2rem" }}>
        <header>
          <p className="section-title" style={{ margin: 0 }}>Denied Claims</p>
          <p style={{ margin: 0, color: "#bbb" }}>Track AI appeal drafts and statuses.</p>
        </header>
        {loading ? (
          <p style={{ color: "#bbb", marginTop: "1rem" }}>Loading denials…</p>
        ) : (
          <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#bbb" }}>Claim</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#bbb" }}>Denial Reason</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#bbb" }}>Payer</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#bbb" }}>Office Ally</th>
              </tr>
            </thead>
            <tbody>
              {denials.map((claim) => (
                <tr key={claim.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.65rem", color: "#f7f6f3" }}>
                    <Link href={`/billing/review/${claim.id}`} style={{ color: "#ff7c29" }}>
                      Claim #{claim.id}
                    </Link>
                  </td>
                  <td style={{ padding: "0.65rem", color: "#f7f6f3" }}>{claim.denial_reason}</td>
                  <td style={{ padding: "0.65rem", color: "#f7f6f3" }}>{claim.payer}</td>
                  <td style={{ padding: "0.65rem", color: "#f7f6f3" }}>{claim.office_ally_batch_id || "not submitted"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
