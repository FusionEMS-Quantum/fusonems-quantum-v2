"use client"

import { useEffect, useState } from "react"
import ClaimCard from "@/components/billing/ClaimCard"
import DenialRiskBadge from "@/components/billing/DenialRiskBadge"
import { apiFetch } from "@/lib/api"

type ClaimReady = {
  id: number
  payer: string
  status: string
  denial_risks: string[]
  created_at?: string
  office_ally_batch_id?: string
}

export default function ClaimsReadyPage() {
  const [claims, setClaims] = useState<ClaimReady[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<ClaimReady[]>("/billing/console/claims-ready")
      .then(setClaims)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="page-shell">
      <section className="glass-panel" style={{ padding: "2rem" }}>
        <header>
          <p className="section-title" style={{ margin: 0 }}>Claims Ready for Submission</p>
          <p style={{ margin: 0, color: "#bbb" }}>Filter and submit with one click.</p>
        </header>
        {loading ? (
          <p style={{ color: "#bbb", marginTop: "1rem" }}>Loading claims…</p>
        ) : claims.length === 0 ? (
          <p style={{ color: "#bbb", marginTop: "1rem" }}>No ready claims available.</p>
        ) : (
          <div style={{ marginTop: "1.2rem", display: "grid", gap: "1rem" }}>
            {claims.map((claim) => (
              <div key={claim.id}>
                <ClaimCard
                  id={claim.id}
                  payer={claim.payer}
                  status={claim.status}
                  denialRisks={claim.denial_risks}
                  createdAt={claim.created_at}
                  officeAllyBatch={claim.office_ally_batch_id}
                />
                <DenialRiskBadge risks={claim.denial_risks} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
