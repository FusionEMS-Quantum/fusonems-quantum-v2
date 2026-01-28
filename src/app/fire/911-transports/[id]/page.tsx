"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Fire911Transport = Record<string, any>;

export default function Fire911TransportDetail() {
  const router = useRouter();
  const params = useParams();
  const transport_id = params?.id as string;

  const [transport, setTransport] = useState<Fire911Transport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Fire911Transport>>({});
  const [narrative, setNarrative] = useState("");

  useEffect(() => {
    if (!transport_id) return;
    setLoading(true);
    apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}`)
      .then((data) => {
        setTransport(data);
        setFormData(data);
        setNarrative(data.narrative || "");
      })
      .catch(() => setError("Failed to load transport."))
      .finally(() => setLoading(false));
  }, [transport_id]);

  const handleSave = async () => {
    if (!transport_id) return;
    try {
      const updated = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      setTransport(updated);
      setEditing(false);
    } catch {
      setError("Failed to save changes.");
    }
  };

  const handleNarrativeSave = async () => {
    if (!transport_id) return;
    try {
      const updated = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}/narrative`, {
        method: "POST",
        body: JSON.stringify({ narrative }),
      });
      setTransport(updated);
    } catch {
      setError("Failed to save narrative.");
    }
  };

  const handleLock = async () => {
    if (!transport_id) return;
    try {
      const result = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}/lock`, {
        method: "POST",
        body: "{}",
      });
      if (result.status === "locked") {
        const updated = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}`);
        setTransport(updated);
      }
    } catch {
      setError("Failed to lock transport.");
    }
  };

  const handleUnlock = async () => {
    if (!transport_id) return;
    try {
      const result = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}/unlock`, {
        method: "POST",
        body: "{}",
      });
      if (result.status === "unlocked") {
        const updated = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}`);
        setTransport(updated);
      }
    } catch {
      setError("Failed to unlock transport.");
    }
  };

  const handleSubmit = async () => {
    if (!transport_id) return;
    try {
      const result = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}/submit`, {
        method: "POST",
        body: "{}",
      });
      if (result.status === "submitted") {
        const updated = await apiFetch<Fire911Transport>(`/fire/911-transports/${transport_id}`);
        setTransport(updated);
      }
    } catch {
      setError("Failed to submit transport.");
    }
  };

  if (loading) return <div style={{ color: "#f7f6f3" }}>Loading...</div>;
  if (error) return <div style={{ color: "#ff4d4f" }}>{error}</div>;
  if (!transport) return <div style={{ color: "#f7f6f3" }}>Not found</div>;

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "#ff7c29", margin: 0 }}>Transport {transport.transport_id}</h1>
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent",
            color: "#ff7c29",
            border: "1px solid #ff7c29",
            padding: "12px 24px",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
        <div style={{ background: "#181818", borderRadius: 8, padding: 24 }}>
          <h2 style={{ color: "#ff7c29", marginTop: 0 }}>Patient Information</h2>
          {editing ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>First Name</label>
                <input
                  type="text"
                  value={formData.first_name || ""}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#0d0d0d",
                    color: "#f7f6f3",
                    border: "1px solid #333",
                    borderRadius: 4
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name || ""}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#0d0d0d",
                    color: "#f7f6f3",
                    border: "1px solid #333",
                    borderRadius: 4
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>DOB</label>
                <input
                  type="text"
                  value={formData.date_of_birth || ""}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#0d0d0d",
                    color: "#f7f6f3",
                    border: "1px solid #333",
                    borderRadius: 4
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Chief Complaint</label>
                <input
                  type="text"
                  value={formData.chief_complaint || ""}
                  onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#0d0d0d",
                    color: "#f7f6f3",
                    border: "1px solid #333",
                    borderRadius: 4
                  }}
                />
              </div>
              <button
                onClick={handleSave}
                style={{
                  background: "#ff7c29",
                  color: "#010101",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Save
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#999" }}>First Name</div>
                <div style={{ fontSize: 16 }}>{transport.first_name}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#999" }}>Last Name</div>
                <div style={{ fontSize: 16 }}>{transport.last_name}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#999" }}>Date of Birth</div>
                <div style={{ fontSize: 16 }}>{transport.date_of_birth}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#999" }}>Chief Complaint</div>
                <div style={{ fontSize: 16 }}>{transport.chief_complaint}</div>
              </div>
              {transport.status === "Draft" && (
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: "transparent",
                    color: "#ff7c29",
                    border: "1px solid #ff7c29",
                    padding: "12px 24px",
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Edit
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ background: "#181818", borderRadius: 8, padding: 24 }}>
          <h2 style={{ color: "#ff7c29", marginTop: 0 }}>Transport Details</h2>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#999" }}>Status</div>
            <div style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              background: transport.status === "Draft" ? "#2d5a2d" : transport.status === "Locked" ? "#5a3a2d" : "#2d4a5a",
              color: transport.status === "Draft" ? "#6fc96f" : transport.status === "Locked" ? "#ff7c29" : "#6eb8ff",
              marginTop: 8
            }}>
              {transport.status}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#999" }}>Transport ID</div>
            <div style={{ fontSize: 14, fontFamily: "monospace" }}>{transport.transport_id}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#999" }}>Incident ID</div>
            <div style={{ fontSize: 14 }}>{transport.incident_id}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {transport.status === "Draft" && (
              <>
                <button
                  onClick={handleLock}
                  style={{
                    background: "#ff7c29",
                    color: "#010101",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 4,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Lock
                </button>
                <button
                  onClick={handleSubmit}
                  style={{
                    background: "#2d5a2d",
                    color: "#6fc96f",
                    border: "1px solid #6fc96f",
                    padding: "8px 16px",
                    borderRadius: 4,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Submit
                </button>
              </>
            )}
            {transport.status === "Locked" && (
              <button
                onClick={handleUnlock}
                style={{
                  background: "transparent",
                  color: "#ff7c29",
                  border: "1px solid #ff7c29",
                  padding: "8px 16px",
                  borderRadius: 4,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 12
                }}
              >
                Unlock
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: "2rem" }}>
        <h2 style={{ color: "#ff7c29", marginTop: 0 }}>Clinical Narrative</h2>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "12px",
            background: "#0d0d0d",
            color: "#f7f6f3",
            border: "1px solid #333",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 14,
            marginBottom: 12,
            resize: "vertical"
          }}
          placeholder="Clinical assessment and narrative..."
        />
        <button
          onClick={handleNarrativeSave}
          style={{
            background: "#ff7c29",
            color: "#010101",
            border: "none",
            padding: "12px 24px",
            borderRadius: 6,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Save Narrative
        </button>
      </div>

      <div style={{ background: "#181818", borderRadius: 8, padding: 24 }}>
        <h2 style={{ color: "#ff7c29", marginTop: 0 }}>Raw Data</h2>
        <pre style={{
          background: "#0d0d0d",
          color: "#f7f6f3",
          padding: 12,
          borderRadius: 4,
          overflow: "auto",
          fontSize: 12
        }}>
          {JSON.stringify(transport, null, 2)}
        </pre>
      </div>
    </div>
  );
}
