"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Denial = {
  id: number;
  claim_id: number;
  invoice_number: string;
  patient_name: string;
  payer_name: string;
  denial_code: string;
  denial_reason: string;
  denied_amount: number;
  denial_date: string;
  appeal_deadline: string;
  appeal_status: string | null;
  ai_recommended_action: string | null;
};

type AppealDraft = {
  claim_id: number;
  appeal_text: string;
  supporting_documents: string[];
};

export default function DenialWorkflow() {
  const [denials, setDenials] = useState<Denial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDenial, setSelectedDenial] = useState<Denial | null>(null);
  const [appealDraft, setAppealDraft] = useState<AppealDraft | null>(null);
  const [appealLoading, setAppealLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "appealed" | "resolved">("all");

  useEffect(() => {
    loadDenials();
  }, []);

  const loadDenials = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ denials: Denial[] }>("/billing/denials");
      setDenials(data.denials || []);
    } catch (err) {
      console.error("Failed to load denials:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateAppealDraft = async (denial: Denial) => {
    setAppealLoading(true);
    try {
      const draft = await apiFetch<AppealDraft>(`/billing/assist/${denial.claim_id}/appeal-draft`, {
        method: "POST",
        body: JSON.stringify({ denial_code: denial.denial_code, denial_reason: denial.denial_reason }),
      });
      setAppealDraft(draft);
    } catch (err) {
      console.error("Failed to generate appeal draft:", err);
    } finally {
      setAppealLoading(false);
    }
  };

  const submitAppeal = async (denial: Denial, appealText: string) => {
    try {
      await apiFetch(`/billing/claims/${denial.claim_id}/appeal`, {
        method: "POST",
        body: JSON.stringify({ appeal_text: appealText }),
      });
      await loadDenials();
      setSelectedDenial(null);
      setAppealDraft(null);
    } catch (err) {
      console.error("Failed to submit appeal:", err);
    }
  };

  const filteredDenials = denials.filter((d) => {
    if (filter === "all") return true;
    if (filter === "pending") return !d.appeal_status;
    if (filter === "appealed") return d.appeal_status === "submitted";
    if (filter === "resolved") return d.appeal_status === "resolved" || d.appeal_status === "won" || d.appeal_status === "lost";
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const getDaysUntilDeadline = (deadline: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div style={{ background: "#010101", color: "#f7f6f3", minHeight: "100vh", padding: "2rem" }}>
      <h1 style={{ color: "#ff7c29", marginBottom: "1.5rem" }}>Denial Management</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {(["all", "pending", "appealed", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#ff7c29" : "#222",
              color: filter === f ? "#010101" : "#f7f6f3",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: 4,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
        <div style={{ marginLeft: "auto", color: "#8c8c8c" }}>
          Total Denied: {formatCurrency(denials.reduce((sum, d) => sum + (d.denied_amount || 0), 0))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading denials...</div>
      ) : filteredDenials.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#8c8c8c" }}>No denials found</div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredDenials.map((denial) => {
            const daysLeft = getDaysUntilDeadline(denial.appeal_deadline);
            const isUrgent = daysLeft !== null && daysLeft <= 7;
            const isOverdue = daysLeft !== null && daysLeft < 0;

            return (
              <div
                key={denial.id}
                style={{
                  background: "#181818",
                  borderRadius: 8,
                  padding: "1.5rem",
                  border: isOverdue ? "1px solid #ff4d4f" : isUrgent ? "1px solid #faad14" : "1px solid #333",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>{denial.patient_name}</div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Invoice #{denial.invoice_number}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#ff4d4f" }}>
                      {formatCurrency(denial.denied_amount)}
                    </div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.75rem" }}>
                      Denied: {formatDate(denial.denial_date)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.75rem" }}>Payer</div>
                    <div>{denial.payer_name}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.75rem" }}>Denial Code</div>
                    <div style={{ fontFamily: "monospace", background: "#333", padding: "0.25rem 0.5rem", borderRadius: 4, display: "inline-block" }}>
                      {denial.denial_code}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.75rem" }}>Appeal Status</div>
                    <div style={{
                      color: denial.appeal_status === "won" ? "#52c41a" : denial.appeal_status === "lost" ? "#ff4d4f" : "#faad14",
                    }}>
                      {denial.appeal_status || "Not Appealed"}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#0a0a0a", borderRadius: 4, padding: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ color: "#8c8c8c", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Denial Reason</div>
                  <div style={{ fontSize: "0.875rem" }}>{denial.denial_reason}</div>
                </div>

                {denial.ai_recommended_action && (
                  <div style={{ background: "#1a2a1a", border: "1px solid #52c41a", borderRadius: 4, padding: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{ color: "#52c41a", fontSize: "0.75rem", marginBottom: "0.25rem" }}>AI Recommendation</div>
                    <div style={{ fontSize: "0.875rem" }}>{denial.ai_recommended_action}</div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    {daysLeft !== null && (
                      <span style={{
                        color: isOverdue ? "#ff4d4f" : isUrgent ? "#faad14" : "#8c8c8c",
                        fontSize: "0.875rem",
                      }}>
                        {isOverdue
                          ? `Appeal deadline passed (${Math.abs(daysLeft)} days ago)`
                          : `${daysLeft} days until appeal deadline`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {!denial.appeal_status && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedDenial(denial);
                            generateAppealDraft(denial);
                          }}
                          style={{
                            background: "#ff7c29",
                            color: "#010101",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          Generate Appeal
                        </button>
                        <button
                          onClick={() => setSelectedDenial(denial)}
                          style={{
                            background: "#333",
                            color: "#f7f6f3",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          Manual Appeal
                        </button>
                      </>
                    )}
                    {denial.appeal_status === "submitted" && (
                      <button
                        style={{
                          background: "#1890ff",
                          color: "#fff",
                          border: "none",
                          padding: "0.5rem 1rem",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        Check Status
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDenial && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#181818",
            borderRadius: 8,
            padding: "2rem",
            width: "90%",
            maxWidth: 800,
            maxHeight: "90vh",
            overflow: "auto",
          }}>
            <h2 style={{ color: "#ff7c29", marginBottom: "1rem" }}>
              Appeal for {selectedDenial.patient_name}
            </h2>
            
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Denial Code: {selectedDenial.denial_code}</div>
              <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Reason: {selectedDenial.denial_reason}</div>
            </div>

            {appealLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>Generating AI appeal draft...</div>
            ) : (
              <textarea
                defaultValue={appealDraft?.appeal_text || ""}
                style={{
                  width: "100%",
                  minHeight: 300,
                  background: "#0a0a0a",
                  color: "#f7f6f3",
                  border: "1px solid #333",
                  borderRadius: 4,
                  padding: "1rem",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                  resize: "vertical",
                }}
                placeholder="Enter appeal text..."
              />
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={() => {
                  setSelectedDenial(null);
                  setAppealDraft(null);
                }}
                style={{
                  background: "#333",
                  color: "#f7f6f3",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
                  if (textarea?.value) {
                    submitAppeal(selectedDenial, textarea.value);
                  }
                }}
                style={{
                  background: "#ff7c29",
                  color: "#010101",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Submit Appeal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
