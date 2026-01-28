"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ReadyClaim = {
  id: number;
  claim_number: string;
  patient_name: string;
  payer_name: string;
  total_charge: number;
  service_date: string;
  readiness_score: number;
  issues: string[];
  selected?: boolean;
};

type BatchResult = {
  batch_id: string;
  submitted: number;
  failed: number;
  details: Array<{
    claim_id: number;
    status: string;
    error?: string;
  }>;
};

export default function BatchSubmit() {
  const [claims, setClaims] = useState<ReadyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    loadReadyClaims();
  }, []);

  const loadReadyClaims = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ claims: ReadyClaim[] }>("/billing/claims?status=ready");
      setClaims((data.claims || []).map((c) => ({ ...c, selected: false })));
    } catch (err) {
      console.error("Failed to load ready claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (claimId: number) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    setClaims((prev) => prev.map((c) => ({ ...c, selected: newValue })));
  };

  const selectedClaims = claims.filter((c) => c.selected);
  const selectedTotal = selectedClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0);

  const submitBatch = async () => {
    if (selectedClaims.length === 0) return;

    setSubmitting(true);
    setBatchResult(null);
    try {
      const result = await apiFetch<BatchResult>("/billing/claims/batch-submit", {
        method: "POST",
        body: JSON.stringify({ claim_ids: selectedClaims.map((c) => c.id) }),
      });
      setBatchResult(result);
      await loadReadyClaims();
    } catch (err) {
      console.error("Batch submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const getReadinessColor = (score: number) => {
    if (score >= 90) return "#52c41a";
    if (score >= 70) return "#faad14";
    return "#ff4d4f";
  };

  return (
    <div style={{ background: "#010101", color: "#f7f6f3", minHeight: "100vh", padding: "2rem" }}>
      <h1 style={{ color: "#ff7c29", marginBottom: "1.5rem" }}>Batch Claim Submission</h1>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#181818",
        padding: "1rem",
        borderRadius: 8,
        marginBottom: "1.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            Select All
          </label>
          <span style={{ color: "#8c8c8c" }}>
            {selectedClaims.length} of {claims.length} selected
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div>
            <div style={{ color: "#8c8c8c", fontSize: "0.75rem" }}>Selected Total</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatCurrency(selectedTotal)}</div>
          </div>
          <button
            onClick={submitBatch}
            disabled={selectedClaims.length === 0 || submitting}
            style={{
              background: selectedClaims.length === 0 ? "#333" : "#ff7c29",
              color: selectedClaims.length === 0 ? "#666" : "#010101",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: 4,
              cursor: selectedClaims.length === 0 ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            {submitting ? "Submitting..." : `Submit ${selectedClaims.length} Claims`}
          </button>
        </div>
      </div>

      {batchResult && (
        <div style={{
          background: batchResult.failed > 0 ? "#2a2215" : "#1a2a1a",
          border: `1px solid ${batchResult.failed > 0 ? "#faad14" : "#52c41a"}`,
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            Batch Submission Complete - {batchResult.batch_id}
          </div>
          <div style={{ display: "flex", gap: "2rem" }}>
            <div>
              <span style={{ color: "#52c41a" }}>{batchResult.submitted}</span> submitted successfully
            </div>
            {batchResult.failed > 0 && (
              <div>
                <span style={{ color: "#ff4d4f" }}>{batchResult.failed}</span> failed
              </div>
            )}
          </div>
          {batchResult.details.some((d) => d.error) && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#ff4d4f" }}>
              {batchResult.details
                .filter((d) => d.error)
                .map((d) => (
                  <div key={d.claim_id}>Claim #{d.claim_id}: {d.error}</div>
                ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading ready claims...</div>
      ) : claims.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#8c8c8c" }}>
          No claims ready for submission
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 1fr 120px 100px 100px 80px",
            gap: "1rem",
            padding: "0.75rem 1rem",
            background: "#111",
            borderRadius: 4,
            color: "#8c8c8c",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
          }}>
            <div></div>
            <div>Patient</div>
            <div>Payer</div>
            <div style={{ textAlign: "right" }}>Amount</div>
            <div>Service Date</div>
            <div>Readiness</div>
            <div>Issues</div>
          </div>

          {claims.map((claim) => (
            <div
              key={claim.id}
              onClick={() => toggleSelect(claim.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 120px 100px 100px 80px",
                gap: "1rem",
                padding: "1rem",
                background: claim.selected ? "#1a2a1a" : "#181818",
                border: claim.selected ? "1px solid #52c41a" : "1px solid #333",
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={claim.selected}
                  onChange={() => {}}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{claim.patient_name}</div>
                <div style={{ color: "#8c8c8c", fontSize: "0.75rem" }}>#{claim.claim_number}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>{claim.payer_name}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", fontWeight: 500 }}>
                {formatCurrency(claim.total_charge)}
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: "0.875rem" }}>
                {formatDate(claim.service_date)}
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  background: getReadinessColor(claim.readiness_score),
                  color: "#fff",
                  padding: "0.25rem 0.5rem",
                  borderRadius: 4,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}>
                  {claim.readiness_score}%
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                {claim.issues && claim.issues.length > 0 ? (
                  <span style={{
                    background: "#faad14",
                    color: "#010101",
                    padding: "0.25rem 0.5rem",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}>
                    {claim.issues.length}
                  </span>
                ) : (
                  <span style={{ color: "#52c41a", fontSize: "0.875rem" }}>None</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: "2rem",
        padding: "1rem",
        background: "#181818",
        borderRadius: 8,
      }}>
        <h3 style={{ color: "#ff7c29", marginBottom: "1rem" }}>Submission Guidelines</h3>
        <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "#8c8c8c", fontSize: "0.875rem" }}>
          <li>Claims with readiness score below 70% may be rejected by the payer</li>
          <li>Review and resolve any issues before submitting claims</li>
          <li>Batch submissions are processed through Office Ally EDI</li>
          <li>Submitted claims will move to "Submitted" status and await payer response</li>
          <li>Maximum 50 claims can be submitted per batch</li>
        </ul>
      </div>
    </div>
  );
}
