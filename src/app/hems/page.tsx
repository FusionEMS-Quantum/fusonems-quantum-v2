// HEMS Dashboard (read-only)
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type HemsDashboardData = Record<string, any>;

export default function HEMSDashboard() {
  const [data, setData] = useState<HemsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<HemsDashboardData>("/hems/dashboard")
      .then(setData)
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>HEMS Dashboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {data && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginTop: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Dashboard Data</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
