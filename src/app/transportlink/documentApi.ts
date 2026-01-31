// TransportLink document extraction and apply (AOB, PCS, ABD, FACESHEET)

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const PREFIX = API_BASE ? `${API_BASE}/api/transport` : "/api/transport";

export type ExtractResponse = {
  extracted_fields: Record<string, string>;
  confidence: Record<string, number>;
  evidence: unknown[];
  warnings: string[];
  snapshot_id: string;
};

export async function extractUpload(
  tripId: number,
  docType: "AOB" | "ABD" | "PCS" | "FACESHEET",
  file: File
): Promise<ExtractResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${PREFIX}/trips/${tripId}/documents/${docType}/extract-upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Extract failed");
  }
  return res.json();
}

export async function applyDoc(
  tripId: number,
  docType: string,
  payload: { snapshot_id: string; accepted_fields: Record<string, unknown>; overrides?: Record<string, unknown> }
): Promise<{ trip: Record<string, unknown> }> {
  const res = await fetch(`${PREFIX}/trips/${tripId}/documents/${docType}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Apply failed");
  }
  return res.json();
}

/** Submit PCS (Patient Care Summary) */
export async function submitPCS(
  tripId: number,
  form: { summary: string; items: string }
): Promise<{ trip: Record<string, unknown> }> {
  return applyDoc(tripId, "PCS", {
    snapshot_id: "",
    accepted_fields: form as unknown as Record<string, unknown>,
  });
}

/** Submit AOB (Authorization of Benefits) */
export async function submitAOB(
  tripId: number,
  form: { insurance: string; signature: string }
): Promise<{ trip: Record<string, unknown> }> {
  return applyDoc(tripId, "AOB", {
    snapshot_id: "",
    accepted_fields: form as unknown as Record<string, unknown>,
  });
}

/** Submit ABD (Advance Beneficiary Notice) */
export async function submitABD(
  tripId: number,
  form: { accepted: boolean; signature: string }
): Promise<{ trip: Record<string, unknown> }> {
  return applyDoc(tripId, "ABD", {
    snapshot_id: "",
    accepted_fields: form as unknown as Record<string, unknown>,
  });
}

/** Upload facesheet */
export async function uploadFacesheet(tripId: number, file: File): Promise<{ trip: Record<string, unknown> }> {
  const extracted = await extractUpload(tripId, "FACESHEET", file);
  return applyDoc(tripId, "FACESHEET", {
    snapshot_id: extracted.snapshot_id,
    accepted_fields: extracted.extracted_fields as unknown as Record<string, unknown>,
  });
}
