// ePCR Dashboard (read-only)
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Patient = Record<string, any>;

export default function EPCRDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Patient[]>("/epcr/patients")
      .then(setPatients)
      .catch(() => setError("Failed to load ePCR patients."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>ePCR Dashboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {patients.length > 0 && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginTop: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Patients</h2>
          <ul>
            {patients.map((patient, i) => (
              <li key={i} style={{ marginBottom: 16 }}>
                <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(patient, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
