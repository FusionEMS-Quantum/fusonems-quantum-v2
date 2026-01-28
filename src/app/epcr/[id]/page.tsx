"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Patient = Record<string, any>;
type Validation = Record<string, any>;

export default function EPCRDetail() {
  const params = useParams();
  const id = params?.id;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch<Patient>(`/epcr/patients/${id}`),
      apiFetch<Validation>(`/epcr/patients/${id}/nemsis/validate`).catch(() => null),
    ])
      .then(([patient, validation]) => {
        setPatient(patient);
        setValidation(validation);
        setError(null);
      })
      .catch(() => setError("Failed to load patient details."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>ePCR Patient Detail</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {patient && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Patient Info</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(patient, null, 2)}</pre>
        </div>
      )}
      {validation && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32, border: "1px solid #ff7c29" }}>
          <h2 style={{ color: "#ff7c29" }}>Validation</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(validation, null, 2)}</pre>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
