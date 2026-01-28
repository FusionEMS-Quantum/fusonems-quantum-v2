"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Incident = Record<string, any>;
type TimelineEntry = Record<string, any>;
type Assignment = Record<string, any>;

export default function FireDetail() {
  const params = useParams();
  const id = params?.id;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch<Incident>(`/fire/incidents/${id}`),
      apiFetch<TimelineEntry[]>(`/fire/incidents/${id}/timeline`),
      apiFetch<Assignment[]>(`/fire/incidents/${id}/assignments`),
    ])
      .then(([incident, timeline, assignments]) => {
        setIncident(incident);
        setTimeline(timeline);
        setAssignments(assignments);
        setError(null);
      })
      .catch(() => setError("Failed to load incident details."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>Fire Incident Detail</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {incident && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Incident Info</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(incident, null, 2)}</pre>
        </div>
      )}
      {timeline.length > 0 && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Timeline</h2>
          <ul>
            {timeline.map((entry, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(entry, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}
      {assignments.length > 0 && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24 }}>
          <h2 style={{ color: "#ff7c29" }}>Assignments</h2>
          <ul>
            {assignments.map((a, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(a, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* TODO: Render audits, validation banners if available */}
    </div>
  );
}
