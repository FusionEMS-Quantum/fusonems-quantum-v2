"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type CadCall = Record<string, any>;

export default function CADDashboard() {
  const [calls, setCalls] = useState<CadCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CadCall[]>("/api/cad/calls")
      .then(setCalls)
      .catch(() => setError("Failed to load CAD calls."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>CAD (Interfacility) Dashboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {calls.length > 0 && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginTop: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Active Calls</h2>
          <ul>
            {calls.map((call, i) => (
              <li key={i} style={{ marginBottom: 16 }}>
                <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(call, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
