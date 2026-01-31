"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../lib/auth-context"
import { ProtectedRoute } from "../../lib/protected-route"

function DashboardContent() {
  const router = useRouter()
  const { user, logout } = useAuth()

  useEffect(() => {
    if (user?.role && ["founder", "admin", "superadmin"].includes(user.role)) {
      router.replace("/founder")
    }
  }, [user?.role, router])

  if (user?.role && ["founder", "admin", "superadmin"].includes(user.role)) {
    return (
      <main className="page-shell">
        <div className="page-container flex items-center justify-center">
          <p style={{ color: "rgba(247, 246, 243, 0.72)" }}>Redirecting to Founder Dashboard...</p>
        </div>
      </main>
    )
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <div className="glass-panel" style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "2rem", color: "#ff7c29" }}>Dashboard</h1>
            <button
              onClick={handleLogout}
              className="cta-button cta-secondary"
              style={{ padding: "8px 16px" }}
            >
              Sign Out
            </button>
          </div>

          {user && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
              <div style={{ padding: "16px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#ff7c29", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Name
                </p>
                <p style={{ fontSize: "1.125rem", color: "#f7f6f3" }}>{user.full_name || "N/A"}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#ff7c29", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Email
                </p>
                <p style={{ fontSize: "1.125rem", color: "#f7f6f3" }}>{user.email}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#ff7c29", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Organization
                </p>
                <p style={{ fontSize: "1.125rem", color: "#f7f6f3" }}>{user.organization_name || "N/A"}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#ff7c29", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Role
                </p>
                <p style={{ fontSize: "1.125rem", color: "#f7f6f3" }}>{user.role || "N/A"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "#ff7c29" }}>Available Modules</h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", listStyle: "none" }}>
            <li style={{ padding: "12px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "6px" }}>CAD</li>
            <li style={{ padding: "12px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "6px" }}>ePCR</li>
            <li style={{ padding: "12px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "6px" }}>Billing</li>
            <li style={{ padding: "12px", backgroundColor: "rgba(10, 10, 10, 0.3)", borderRadius: "6px" }}>Fire Incidents</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
