// Fire Dashboard (read-only)
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type FireDashboardData = {
  active_incidents: number;
  apparatus_ready: string;
  training_gap: string;
  risk_indicator: string;
};

export default function FireDashboard() {
  const [data, setData] = useState<FireDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<FireDashboardData>("/fire/dashboard")
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
      <h1 style={{ color: "#ff7c29" }}>Fire Dashboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {data && (
        <div style={{
          display: "flex",
          gap: "2rem",
          marginTop: "2rem"
        }}>
          <div style={{ background: "#181818", borderRadius: 8, padding: 24, minWidth: 200 }}>
            <div style={{ color: "#ff7c29", fontWeight: 700 }}>Active Incidents</div>
            <div style={{ fontSize: 32 }}>{data.active_incidents}</div>
          </div>
          <div style={{ background: "#181818", borderRadius: 8, padding: 24, minWidth: 200 }}>
            <div style={{ color: "#ff7c29", fontWeight: 700 }}>Apparatus Ready</div>
            <div style={{ fontSize: 32 }}>{data.apparatus_ready}</div>
          </div>
          <div style={{ background: "#181818", borderRadius: 8, padding: 24, minWidth: 200 }}>
            <div style={{ color: "#ff7c29", fontWeight: 700 }}>Training Gap</div>
            <div style={{ fontSize: 32 }}>{data.training_gap}</div>
          </div>
          <div style={{ background: "#181818", borderRadius: 8, padding: 24, minWidth: 200 }}>
            <div style={{ color: "#ff7c29", fontWeight: 700 }}>Risk Indicator</div>
            <div style={{ fontSize: 32 }}>{data.risk_indicator}</div>
          </div>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
