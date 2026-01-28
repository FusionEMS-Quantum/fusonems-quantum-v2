"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"
import DenialRiskBadge from "@/components/billing/DenialRiskBadge"
import FacesheetStatus from "@/components/billing/FacesheetStatus"
import AIAssistPanel from "@/components/billing/AIAssistPanel"
import OfficeAllyTracker from "@/components/billing/OfficeAllyTracker"

export default function ClaimReviewPage() {
  const params = useParams()
  const claimId = params?.claim_id
  const [claim, setClaim] = useState<Record<string, any> | null>(null)
  const [facesheet, setFacesheet] = useState<{ present: boolean; missing_fields: string[] } | null>(null)

  useEffect(() => {
    if (!claimId) return
    apiFetch<Record<string, any>>(`/billing/claims/${claimId}`).then(setClaim).catch(console.error)
  }, [claimId])

  useEffect(() => {
    if (!claim?.patient?.id) return
    apiFetch<{ present: boolean; missing_fields: string[] }>(`/billing/facesheet/status/${claim.patient.id}`).then(setFacesheet).catch(console.error)
  }, [claim?.patient?.id])

  if (!claimId) {
    return <p>Claim not specified.</p>
  }

  return (
    <main className="page-shell">
      <section className="glass-panel" style={{ padding: "2rem" }}>
        <header>
          <p className="section-title" style={{ margin: 0 }}>Claim Review</p>
          <p style={{ margin: 0, color: "#bbb" }}>In-depth claim + AI insights.</p>
        </header>
        {!claim ? (
          <p style={{ marginTop: "1rem", color: "#bbb" }}>Loading claim…</p>
        ) : (
          <div style={{ display: "grid", gap: "1.2rem", marginTop: "1.2rem" }}>
            <div>
              <h3 style={{ margin: 0, color: "#f7f6f3" }}>Claim #{claim.id}</h3>
              <p style={{ margin: 0, color: "#bbb" }}>Payer: {claim.payer}</p>
              <p style={{ margin: 0, color: "#bbb" }}>Status: {claim.status}</p>
            </div>
            <DenialRiskBadge risks={claim.denial_risk_flags} />
            <FacesheetStatus present={facesheet?.present ?? false} missingFields={facesheet?.missing_fields} />
            <OfficeAllyTracker batchId={claim.office_ally_batch_id} status={claim.status} submittedAt={claim.created_at} />
            <AIAssistPanel
              cards={[
                { title: "Coding", summary: "Primary/secondary suggestions", footer: "Model: Mistral 7B" },
                { title: "Denial Risk", summary: "Watch medical necessity flags", footer: "Model: Dolphin" },
                { title: "Scrub", summary: "Field validations passed", footer: "Model: Neural-Chat" },
              ]}
            />
            <div style={{ padding: "1rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(12,12,12,0.8)" }}>
              <h4 style={{ margin: "0 0 0.5rem", color: "#ff7c29" }}>ePCR Snapshot</h4>
              <pre style={{ color: "#f7f6f3", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(claim.demographics, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
