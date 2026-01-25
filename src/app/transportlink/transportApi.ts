// TransportLink API service for facility portal (Ground/IFT/CCT)
// Handles CRUD for transport trips and timeline

const API_BASE = "/api/transport/trips";

export async function listTransports() {
  const res = await fetch(API_BASE, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch transports");
  return res.json();
}

export async function getTransport(tripId) {
  const res = await fetch(`${API_BASE}/${tripId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch transport");
  return res.json();
}

export async function createTransport(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create transport");
  return res.json();
}

export async function updateTransport(tripId, data) {
  const res = await fetch(`${API_BASE}/${tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update transport");
  return res.json();
}

export async function getTransportTimeline(tripId) {
  const res = await fetch(`${API_BASE}/${tripId}/timeline`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json();
}
