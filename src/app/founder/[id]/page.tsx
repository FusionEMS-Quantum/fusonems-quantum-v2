"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type OrgHealth = Record<string, any>;

export default function FounderDetail() {
  const params = useParams();
  const id = params?.id;
  const [health, setHealth] = useState<OrgHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<OrgHealth>(`/founder/orgs/${id}/health`)
      .then(setHealth)
      .catch(() => setError("Failed to load org health."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>Founder Org Health</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {health && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Org Health</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(health, null, 2)}</pre>
        </div>
      )}
      {/* TODO: Audits, validation banners as available */}
    </div>
  );
}
