"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EpcrTabletShell() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    // Offline detection
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
        color: "#f7f6f3",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Status Bar */}
      <div
        style={{
          background: "rgba(17, 17, 17, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 107, 53, 0.2)",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: offline ? "#ff4d4f" : "#6fc96f",
            }}
          />
          <span style={{ color: offline ? "#ff4d4f" : "#6fc96f" }}>
            {offline ? "OFFLINE MODE" : "ONLINE"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "2rem 1rem", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              margin: "0 0 1rem 0",
              background: "linear-gradient(90deg, #ff6b35 0%, #c41e3a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            FusionEMS ePCR
          </h1>
          <p style={{ color: "#888", margin: "0 0 2rem 0", fontSize: "14px" }}>
            Select ePCR Type
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            {/* EMS Button */}
            <button
              onClick={() => router.push("/epcr/tablet/ems/create")}
              style={{
                background: "rgba(17, 17, 17, 0.8)",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                padding: "2rem 1.5rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "#f7f6f3",
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(25, 25, 25, 0.9)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 53, 0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(17, 17, 17, 0.8)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 53, 0.3)";
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "0.5rem", color: "#ff6b35" }}>
                EMS
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>Ground Ambulance</div>
            </button>

            {/* Fire Button */}
            <button
              onClick={() => router.push("/epcr/tablet/fire/create")}
              style={{
                background: "rgba(17, 17, 17, 0.8)",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                padding: "2rem 1.5rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "#f7f6f3",
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(25, 25, 25, 0.9)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 53, 0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(17, 17, 17, 0.8)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 53, 0.3)";
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "0.5rem", color: "#ff6b35" }}>
                FIRE
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>Fire Medic 911</div>
            </button>

            {/* HEMS Button */}
            <button
              onClick={() => router.push("/epcr/tablet/hems/create")}
              style={{
                background: "rgba(17, 17, 17, 0.8)",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                padding: "2rem 1.5rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "#f7f6f3",
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(25, 25, 25, 0.9)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 53, 0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(17, 17, 17, 0.8)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 53, 0.3)";
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "0.5rem", color: "#ff6b35" }}>
                HEMS
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>Air Medical</div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "rgba(17, 17, 17, 0.95)",
          borderTop: "1px solid rgba(255, 107, 53, 0.2)",
          padding: "1rem",
          textAlign: "center",
          fontSize: "11px",
          color: "#666",
        }}
      >
        FusionEMS Quantum v2.0 • Offline-First ePCR
      </div>
    </div>
  );
}
