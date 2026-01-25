// HEMS Detail View (read-only)
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../lib/api";

type Mission = Record<string, any>;
type TimelineEntry = Record<string, any>;

export default function HEMSDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [mission, setMission] = useState<Mission | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch<Mission>(`/hems/missions/${id}`),
      // If a timeline endpoint exists, fetch it here. Placeholder for now.
    ])
      .then(([mission]) => {
        setMission(mission);
        setError(null);
      })
      .catch(() => setError("Failed to load mission details."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>HEMS Mission Detail</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {mission && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Mission Info</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(mission, null, 2)}</pre>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
