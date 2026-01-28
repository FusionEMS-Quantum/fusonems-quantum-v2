"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type CadCall = Record<string, any>;
// Timeline endpoint for CAD is not clear; placeholder for future use

export default function CADDetail() {
  const params = useParams();
  const id = params?.id;
  const [call, setCall] = useState<CadCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<CadCall>(`/cad/calls/${id}`)
      .then(setCall)
      .catch(() => setError("Failed to load CAD call details."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>CAD (Interfacility) Detail</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {call && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Call Info</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(call, null, 2)}</pre>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
