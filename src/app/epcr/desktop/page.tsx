"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EpcrRecord {
  id: number;
  record_number: string;
  incident_number: string;
  patient_name: string;
  chief_complaint: string;
  status: string;
  created_at: string;
  provider: string;
}

export default function EpcrDesktopDashboard() {
  const router = useRouter();
  const [records, setRecords] = useState<EpcrRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<EpcrRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, statusFilter, records]);

  const fetchRecords = async () => {
    try {
      const response = await fetch("/api/epcr/records");
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.record_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.incident_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRecords(filtered);
  };

  const toggleSelectRecord = (id: number) => {
    const newSet = new Set(selectedRecords);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRecords(newSet);
  };

  const bulkApprove = async () => {
    if (selectedRecords.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedRecords).map((id) =>
          fetch(`/api/epcr/records/${id}/approve`, { method: "POST" })
        )
      );
      fetchRecords();
      setSelectedRecords(new Set());
    } catch (err) {
      console.error("Bulk approve failed:", err);
    }
  };

  const bulkExport = async () => {
    if (selectedRecords.size === 0) return;
    
    try {
      const response = await fetch("/api/epcr/export/nemsis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_ids: Array.from(selectedRecords) }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nemsis_export_${new Date().toISOString()}.xml`;
        a.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
        color: "#f7f6f3",
        minHeight: "100vh",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "rgba(17, 17, 17, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 107, 53, 0.2)",
          padding: "1.5rem 2rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                margin: 0,
                background: "linear-gradient(90deg, #ff6b35 0%, #c41e3a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ePCR Management Console
            </h1>
            <p style={{ color: "#888", margin: "0.25rem 0 0 0", fontSize: "13px" }}>
              Desktop Interface • Advanced Operations
            </p>
          </div>
          <button
            onClick={() => router.push("/epcr/tablet")}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #ff6b35 0%, #ff4500 100%)",
              border: "none",
              color: "#000",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            + New ePCR
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            background: "rgba(17, 17, 17, 0.8)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 107, 53, 0.2)",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
            <input
              type="text"
              placeholder="Search by record #, incident #, patient name, or complaint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "12px",
                background: "rgba(10, 10, 10, 0.9)",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                color: "#f7f6f3",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "12px",
                background: "rgba(10, 10, 10, 0.9)",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                color: "#f7f6f3",
                fontSize: "14px",
                outline: "none",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="finalized">Finalized</option>
              <option value="submitted">Submitted</option>
            </select>
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              style={{
                padding: "12px",
                background: "rgba(255, 107, 53, 0.1)",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                color: "#ff6b35",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedRecords.size > 0 && (
          <div
            style={{
              background: "rgba(255, 107, 53, 0.1)",
              border: "1px solid rgba(255, 107, 53, 0.3)",
              padding: "1rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", color: "#ff6b35", fontWeight: 600 }}>
              {selectedRecords.size} record(s) selected
            </span>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={bulkApprove}
                style={{
                  padding: "8px 16px",
                  background: "rgba(111, 201, 111, 0.2)",
                  border: "1px solid rgba(111, 201, 111, 0.4)",
                  color: "#6fc96f",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                ✓ Approve All
              </button>
              <button
                onClick={bulkExport}
                style={{
                  padding: "8px 16px",
                  background: "rgba(255, 107, 53, 0.2)",
                  border: "1px solid rgba(255, 107, 53, 0.4)",
                  color: "#ff6b35",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                ↓ Export NEMSIS
              </button>
              <button
                onClick={() => setSelectedRecords(new Set())}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid rgba(255, 107, 53, 0.3)",
                  color: "#888",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div
          style={{
            background: "rgba(17, 17, 17, 0.8)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 107, 53, 0.2)",
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "50px 1fr 1fr 2fr 1fr 1fr 1fr 100px",
              padding: "1rem",
              background: "rgba(255, 107, 53, 0.1)",
              borderBottom: "1px solid rgba(255, 107, 53, 0.2)",
              fontSize: "12px",
              fontWeight: 700,
              color: "#888",
            }}
          >
            <div>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRecords(new Set(filteredRecords.map((r) => r.id)));
                  } else {
                    setSelectedRecords(new Set());
                  }
                }}
                checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
              />
            </div>
            <div>RECORD #</div>
            <div>INCIDENT #</div>
            <div>PATIENT / COMPLAINT</div>
            <div>PROVIDER</div>
            <div>STATUS</div>
            <div>DATE/TIME</div>
            <div>ACTIONS</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
              Loading records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
              No records found
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 1fr 2fr 1fr 1fr 1fr 100px",
                  padding: "1rem",
                  borderBottom: "1px solid rgba(255, 107, 53, 0.1)",
                  fontSize: "13px",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 107, 53, 0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedRecords.has(record.id)}
                    onChange={() => toggleSelectRecord(record.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div style={{ color: "#ff6b35", fontWeight: 600 }}>{record.record_number}</div>
                <div>{record.incident_number}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{record.patient_name}</div>
                  <div style={{ color: "#888", fontSize: "11px" }}>{record.chief_complaint}</div>
                </div>
                <div>{record.provider}</div>
                <div>
                  <span
                    style={{
                      padding: "4px 8px",
                      background:
                        record.status === "finalized"
                          ? "rgba(111, 201, 111, 0.2)"
                          : record.status === "draft"
                          ? "rgba(255, 107, 53, 0.2)"
                          : "rgba(255, 255, 255, 0.1)",
                      color:
                        record.status === "finalized"
                          ? "#6fc96f"
                          : record.status === "draft"
                          ? "#ff6b35"
                          : "#888",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {record.status}
                  </span>
                </div>
                <div style={{ color: "#888" }}>{new Date(record.created_at).toLocaleString()}</div>
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/epcr/desktop/ems/${record.id}`);
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(255, 107, 53, 0.1)",
                      border: "1px solid rgba(255, 107, 53, 0.3)",
                      color: "#ff6b35",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Footer */}
        <div
          style={{
            marginTop: "2rem",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          {[
            { label: "Total Records", value: records.length, color: "#ff6b35" },
            { label: "Draft", value: records.filter((r) => r.status === "draft").length, color: "#ff6b35" },
            { label: "Finalized", value: records.filter((r) => r.status === "finalized").length, color: "#6fc96f" },
            { label: "Submitted", value: records.filter((r) => r.status === "submitted").length, color: "#888" },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(17, 17, 17, 0.8)",
                border: "1px solid rgba(255, 107, 53, 0.2)",
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "0.5rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
