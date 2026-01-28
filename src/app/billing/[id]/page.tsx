"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Invoice = {
  id: number;
  invoice_number: string;
  patient_name: string;
  payer_name: string;
  status: string;
  total_amount: number;
  balance_due: number;
  created_at: string;
  updated_at: string;
  line_items?: Array<{
    id: number;
    description: string;
    cpt_code: string;
    amount: number;
    quantity: number;
  }>;
  claim_payload?: Record<string, any>;
};

type AuditEntry = {
  id: number;
  action: string;
  actor_email: string;
  timestamp: string;
  details: Record<string, any>;
};

type TimelineEvent = {
  id: number;
  event_type: string;
  timestamp: string;
  description: string;
  actor?: string;
};

type ValidationIssue = {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
};

export default function BillingDetail() {
  const params = useParams();
  const id = params?.id;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "audits">("details");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      apiFetch<Invoice>(`/billing/invoices/${id}`),
      apiFetch<{ audits: AuditEntry[] }>(`/billing/invoices/${id}/audits`).catch(() => ({ audits: [] })),
      apiFetch<{ timeline: TimelineEvent[] }>(`/billing/invoices/${id}/timeline`).catch(() => ({ timeline: [] })),
      apiFetch<{ issues: ValidationIssue[] }>(`/billing/invoices/${id}/validate`).catch(() => ({ issues: [] })),
    ])
      .then(([invoiceData, auditData, timelineData, validationData]) => {
        setInvoice(invoiceData);
        setAudits(auditData.audits || []);
        setTimeline(timelineData.timeline || []);
        setValidationIssues(validationData.issues || []);
      })
      .catch(() => setError("Failed to load invoice details."))
      .finally(() => setLoading(false));
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "#52c41a";
      case "submitted": return "#1890ff";
      case "ready": return "#faad14";
      case "draft": return "#8c8c8c";
      case "denied": return "#ff4d4f";
      default: return "#8c8c8c";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "#ff4d4f";
      case "warning": return "#faad14";
      case "info": return "#1890ff";
      default: return "#8c8c8c";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29", marginBottom: "1rem" }}>Billing Invoice Detail</h1>
      
      {loading && <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f", padding: "1rem", background: "#2a1515", borderRadius: 8 }}>{error}</div>}
      
      {validationIssues.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          {validationIssues.map((issue, idx) => (
            <div
              key={idx}
              style={{
                background: issue.severity === "error" ? "#2a1515" : issue.severity === "warning" ? "#2a2215" : "#15202a",
                border: `1px solid ${getSeverityColor(issue.severity)}`,
                borderRadius: 6,
                padding: "0.75rem 1rem",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: "50%", 
                background: getSeverityColor(issue.severity) 
              }} />
              <span style={{ color: getSeverityColor(issue.severity), fontWeight: 500 }}>
                {issue.severity.toUpperCase()}:
              </span>
              <span>{issue.message}</span>
              {issue.field && <span style={{ color: "#8c8c8c", marginLeft: "auto" }}>Field: {issue.field}</span>}
            </div>
          ))}
        </div>
      )}

      {invoice && (
        <>
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            marginBottom: "1.5rem",
            borderBottom: "1px solid #333",
            paddingBottom: "0.5rem"
          }}>
            {(["details", "timeline", "audits"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? "#ff7c29" : "transparent",
                  color: activeTab === tab ? "#010101" : "#f7f6f3",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: activeTab === tab ? 600 : 400,
                  textTransform: "capitalize"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "details" && (
            <>
              <div style={{ 
                background: "#181818", 
                borderRadius: 8, 
                padding: 24, 
                marginBottom: 24 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h2 style={{ color: "#ff7c29", margin: 0 }}>Invoice #{invoice.invoice_number}</h2>
                  <span style={{
                    background: getStatusColor(invoice.status),
                    color: "#fff",
                    padding: "0.25rem 0.75rem",
                    borderRadius: 4,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    fontSize: "0.875rem"
                  }}>
                    {invoice.status}
                  </span>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Patient Name</div>
                    <div style={{ fontSize: "1rem" }}>{invoice.patient_name || "N/A"}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Payer</div>
                    <div style={{ fontSize: "1rem" }}>{invoice.payer_name || "N/A"}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Total Amount</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatCurrency(invoice.total_amount)}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Balance Due</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 600, color: invoice.balance_due > 0 ? "#faad14" : "#52c41a" }}>
                      {formatCurrency(invoice.balance_due)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Created</div>
                    <div style={{ fontSize: "1rem" }}>{formatDate(invoice.created_at)}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>Last Updated</div>
                    <div style={{ fontSize: "1rem" }}>{formatDate(invoice.updated_at)}</div>
                  </div>
                </div>
              </div>

              {invoice.line_items && invoice.line_items.length > 0 && (
                <div style={{ 
                  background: "#181818", 
                  borderRadius: 8, 
                  padding: 24, 
                  marginBottom: 24 
                }}>
                  <h3 style={{ color: "#ff7c29", marginBottom: "1rem" }}>Line Items</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #333" }}>
                        <th style={{ textAlign: "left", padding: "0.5rem", color: "#8c8c8c" }}>CPT Code</th>
                        <th style={{ textAlign: "left", padding: "0.5rem", color: "#8c8c8c" }}>Description</th>
                        <th style={{ textAlign: "right", padding: "0.5rem", color: "#8c8c8c" }}>Qty</th>
                        <th style={{ textAlign: "right", padding: "0.5rem", color: "#8c8c8c" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid #222" }}>
                          <td style={{ padding: "0.5rem" }}>{item.cpt_code}</td>
                          <td style={{ padding: "0.5rem" }}>{item.description}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{item.quantity}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {invoice.claim_payload && (
                <div style={{ 
                  background: "#181818", 
                  borderRadius: 8, 
                  padding: 24 
                }}>
                  <h3 style={{ color: "#ff7c29", marginBottom: "1rem" }}>Claim Data</h3>
                  <pre style={{ 
                    color: "#f7f6f3", 
                    background: "#0a0a0a", 
                    padding: "1rem",
                    borderRadius: 4,
                    overflow: "auto",
                    fontSize: "0.875rem"
                  }}>
                    {JSON.stringify(invoice.claim_payload, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}

          {activeTab === "timeline" && (
            <div style={{ 
              background: "#181818", 
              borderRadius: 8, 
              padding: 24 
            }}>
              <h3 style={{ color: "#ff7c29", marginBottom: "1rem" }}>Timeline</h3>
              {timeline.length === 0 ? (
                <div style={{ color: "#8c8c8c", textAlign: "center", padding: "2rem" }}>
                  No timeline events recorded
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
                  <div style={{
                    position: "absolute",
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    background: "#333"
                  }} />
                  {timeline.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        position: "relative",
                        paddingBottom: "1.5rem",
                        paddingLeft: "1rem"
                      }}
                    >
                      <div style={{
                        position: "absolute",
                        left: -6,
                        top: 4,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#ff7c29",
                        border: "2px solid #181818"
                      }} />
                      <div style={{ color: "#8c8c8c", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        {formatDate(event.timestamp)}
                        {event.actor && <span> by {event.actor}</span>}
                      </div>
                      <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{event.event_type}</div>
                      <div style={{ color: "#bbb", fontSize: "0.875rem" }}>{event.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "audits" && (
            <div style={{ 
              background: "#181818", 
              borderRadius: 8, 
              padding: 24 
            }}>
              <h3 style={{ color: "#ff7c29", marginBottom: "1rem" }}>Audit Log</h3>
              {audits.length === 0 ? (
                <div style={{ color: "#8c8c8c", textAlign: "center", padding: "2rem" }}>
                  No audit entries found
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #333" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#8c8c8c" }}>Timestamp</th>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#8c8c8c" }}>Action</th>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#8c8c8c" }}>Actor</th>
                      <th style={{ textAlign: "left", padding: "0.5rem", color: "#8c8c8c" }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((audit) => (
                      <tr key={audit.id} style={{ borderBottom: "1px solid #222" }}>
                        <td style={{ padding: "0.5rem", fontSize: "0.875rem" }}>{formatDate(audit.timestamp)}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{
                            background: "#333",
                            padding: "0.125rem 0.5rem",
                            borderRadius: 4,
                            fontSize: "0.75rem"
                          }}>
                            {audit.action}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.875rem" }}>{audit.actor_email}</td>
                        <td style={{ padding: "0.5rem", fontSize: "0.75rem", color: "#8c8c8c" }}>
                          {JSON.stringify(audit.details).substring(0, 100)}
                          {JSON.stringify(audit.details).length > 100 && "..."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
