"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Fire911Transport = {
  transport_id: string;
  incident_id: string;
  first_name: string;
  last_name: string;
  chief_complaint: string;
  status: string;
  created_at: string;
};

const glassmorphism = {
  background: "rgba(17, 17, 17, 0.8)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 107, 53, 0.2)",
};

const statusColor = (status: string) => {
  switch (status) {
    case "Draft":
      return { bg: "rgba(107, 201, 111, 0.15)", text: "#6fc96f", border: "rgba(107, 201, 111, 0.3)" };
    case "Locked":
      return { bg: "rgba(255, 107, 53, 0.15)", text: "#ff6b35", border: "rgba(255, 107, 53, 0.3)" };
    case "Submitted":
      return { bg: "rgba(196, 30, 58, 0.15)", text: "#c41e3a", border: "rgba(196, 30, 58, 0.3)" };
    default:
      return { bg: "rgba(99, 102, 241, 0.15)", text: "#6366f1", border: "rgba(99, 102, 241, 0.3)" };
  }
};

export default function Fire911Transports() {
  const router = useRouter();
  const [transports, setTransports] = useState<Fire911Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentFilter, setIncidentFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = incidentFilter
      ? `/fire/911-transports?incident_id=${incidentFilter}`
      : "/fire/911-transports";
    apiFetch<Fire911Transport[]>(url)
      .then(setTransports)
      .catch(() => setError("Failed to load transports."))
      .finally(() => setLoading(false));
  }, [incidentFilter]);

  return (
    <div style={{
      background: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "3rem 2rem",
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3rem" }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: "3rem", 
              fontWeight: 800, 
              letterSpacing: "-1px",
              background: "linear-gradient(90deg, #ff6b35 0%, #c41e3a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              Fire 911 Transports
            </h1>
            <p style={{ color: "#888", margin: "0.5rem 0 0 0", fontSize: "14px" }}>
              {transports.length} transports • Real-time dispatch integration
            </p>
          </div>
          <button
            onClick={() => router.push("/fire/911-transports/create")}
            style={{
              background: "linear-gradient(135deg, #ff6b35 0%, #ff4500 100%)",
              color: "#000",
              border: "none",
              padding: "14px 32px",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 10px 30px rgba(255, 107, 53, 0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 15px 45px rgba(255, 107, 53, 0.5)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 10px 30px rgba(255, 107, 53, 0.3)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            + New Transport
          </button>
        </div>

        <div style={{ marginBottom: "3rem" }}>
          <input
            type="text"
            placeholder="Search by incident ID..."
            value={incidentFilter}
            onChange={(e) => setIncidentFilter(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "12px 16px",
              ...glassmorphism,
              color: "#f7f6f3",
              fontSize: "14px",
              outline: "none",
              transition: "all 0.3s ease",
            } as React.CSSProperties}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255, 107, 53, 0.5)";
              (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 20px rgba(255, 107, 53, 0.2)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255, 107, 53, 0.2)";
              (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
            }}
          />
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
            <div style={{ fontSize: "14px" }}>Loading transports...</div>
          </div>
        )}

        {error && (
          <div style={{
            ...glassmorphism,
            borderColor: "rgba(196, 30, 58, 0.5)",
            padding: "1.5rem",
            marginBottom: "2rem",
            color: "#ff6b7a"
          }}>
            {error}
          </div>
        )}

        {transports.length === 0 && !loading && (
          <div style={{
            ...glassmorphism,
            padding: "3rem",
            textAlign: "center",
            color: "#666"
          }}>
            No transports found.
          </div>
        )}

        {transports.length > 0 && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {transports.map((t) => {
              const color = statusColor(t.status);
              return (
                <div
                  key={t.transport_id}
                  onClick={() => router.push(`/fire/911-transports/${t.transport_id}`)}
                  style={{
                    ...glassmorphism,
                    padding: "1.5rem",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "grid",
                    gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr",
                    gap: "1.5rem",
                    alignItems: "center"
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(25, 25, 25, 0.9)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255, 107, 53, 0.4)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateX(8px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 40px rgba(0, 0, 0, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(17, 17, 17, 0.8)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255, 107, 53, 0.2)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>TRANSPORT ID</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, fontFamily: "monospace", color: "#ff6b35" }}>
                      {t.transport_id}
                    </div>
                    <div style={{ fontSize: "13px", color: "#aaa", marginTop: "6px" }}>
                      {t.first_name} {t.last_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>CHIEF COMPLAINT</div>
                    <div style={{ fontSize: "14px", color: "#f7f6f3" }}>
                      {t.chief_complaint}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>INCIDENT</div>
                    <div style={{ fontSize: "14px", color: "#f7f6f3" }}>
                      {t.incident_id}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: color.bg,
                      color: color.text,
                      border: `1px solid ${color.border}`,
                    }}>
                      {t.status}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ff6b35",
                      border: "1px solid rgba(255, 107, 53, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 107, 53, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      }}
                    >
                      View →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
