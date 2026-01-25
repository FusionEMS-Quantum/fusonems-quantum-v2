// Billing Detail View (read-only)
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../lib/api";

type Invoice = Record<string, any>;

export default function BillingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Invoice>(`/billing/invoices/${id}`)
      .then(setInvoice)
      .catch(() => setError("Failed to load invoice details."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{
      background: "#010101",
      color: "#f7f6f3",
      minHeight: "100vh",
      padding: "2rem"
    }}>
      <h1 style={{ color: "#ff7c29" }}>Billing Invoice Detail</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "#ff4d4f" }}>{error}</div>}
      {invoice && (
        <div style={{ background: "#181818", borderRadius: 8, padding: 24, marginBottom: 32 }}>
          <h2 style={{ color: "#ff7c29" }}>Invoice Info</h2>
          <pre style={{ color: "#f7f6f3", background: "none" }}>{JSON.stringify(invoice, null, 2)}</pre>
        </div>
      )}
      {/* TODO: Timeline, audits, validation banners as available */}
    </div>
  );
}
