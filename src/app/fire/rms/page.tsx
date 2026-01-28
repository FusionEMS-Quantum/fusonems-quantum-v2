"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type DashboardData = {
  hydrants: { total: number; needs_repair: number };
  inspections: { total: number; failed: number; pending_reinspection: number };
  preplans: { total: number; with_hazmat: number };
  community_risk_reduction: { programs_count: number; smoke_alarms_installed: number };
  apparatus: { out_of_service: number };
};

export default function FireRMSDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardData>("/fire/rms/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const modules = [
    {
      title: "Hydrant Management",
      href: "/fire/rms/hydrants",
      icon: "🚒",
      stats: data ? [
        { label: "Total Hydrants", value: data.hydrants.total },
        { label: "Needs Repair", value: data.hydrants.needs_repair, alert: data.hydrants.needs_repair > 0 },
      ] : [],
      description: "Flow testing, inspections, and maintenance tracking",
    },
    {
      title: "Fire Inspections",
      href: "/fire/rms/inspections",
      icon: "📋",
      stats: data ? [
        { label: "Total Inspections", value: data.inspections.total },
        { label: "Failed", value: data.inspections.failed, alert: data.inspections.failed > 0 },
        { label: "Re-inspection Due", value: data.inspections.pending_reinspection, alert: data.inspections.pending_reinspection > 0 },
      ] : [],
      description: "Commercial and residential fire code compliance",
    },
    {
      title: "Pre-Fire Plans",
      href: "/fire/rms/preplans",
      icon: "🏢",
      stats: data ? [
        { label: "Total Plans", value: data.preplans.total },
        { label: "Hazmat Sites", value: data.preplans.with_hazmat, alert: data.preplans.with_hazmat > 0 },
      ] : [],
      description: "Target hazard identification and tactical planning",
    },
    {
      title: "Community Risk Reduction",
      href: "/fire/rms/crr",
      icon: "🏠",
      stats: data ? [
        { label: "Programs", value: data.community_risk_reduction.programs_count },
        { label: "Smoke Alarms Installed", value: data.community_risk_reduction.smoke_alarms_installed },
      ] : [],
      description: "Public education and prevention programs",
    },
    {
      title: "Apparatus Maintenance",
      href: "/fire/rms/maintenance",
      icon: "🔧",
      stats: data ? [
        { label: "Out of Service", value: data.apparatus.out_of_service, alert: data.apparatus.out_of_service > 0 },
      ] : [],
      description: "Daily checks, PM service, and repairs",
    },
  ];

  return (
    <div style={{ background: "#010101", color: "#f7f6f3", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ fontSize: "2.5rem" }}>🔥</div>
        <div>
          <h1 style={{ color: "#ff7c29", margin: 0 }}>Fire Records Management System</h1>
          <p style={{ color: "#8c8c8c", margin: 0 }}>Comprehensive fire department records and operations</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>Loading dashboard...</div>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}>
            {[
              { label: "Total Hydrants", value: data?.hydrants.total || 0, color: "#1890ff" },
              { label: "Active Inspections", value: data?.inspections.total || 0, color: "#52c41a" },
              { label: "Pre-Plans", value: data?.preplans.total || 0, color: "#722ed1" },
              { label: "CRR Programs", value: data?.community_risk_reduction.programs_count || 0, color: "#fa8c16" },
              { label: "Smoke Alarms", value: data?.community_risk_reduction.smoke_alarms_installed || 0, color: "#eb2f96" },
            ].map((stat, idx) => (
              <div key={idx} style={{
                background: "#181818",
                borderRadius: 8,
                padding: "1.5rem",
                textAlign: "center",
                borderTop: `3px solid ${stat.color}`,
              }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ color: "#8c8c8c", fontSize: "0.875rem" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>
            {modules.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{
                  background: "#181818",
                  borderRadius: 12,
                  padding: "1.5rem",
                  border: "1px solid #333",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#ff7c29";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "2rem" }}>{module.icon}</div>
                    <div>
                      <h3 style={{ color: "#ff7c29", margin: 0 }}>{module.title}</h3>
                      <p style={{ color: "#8c8c8c", margin: 0, fontSize: "0.875rem" }}>{module.description}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    {module.stats.map((stat, idx) => (
                      <div key={idx}>
                        <div style={{
                          fontSize: "1.5rem",
                          fontWeight: 600,
                          color: stat.alert ? "#ff4d4f" : "#f7f6f3",
                        }}>
                          {stat.value}
                        </div>
                        <div style={{ color: "#8c8c8c", fontSize: "0.75rem" }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{
            marginTop: "2rem",
            background: "#181818",
            borderRadius: 12,
            padding: "1.5rem",
          }}>
            <h3 style={{ color: "#ff7c29", marginBottom: "1rem" }}>Quick Actions</h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {[
                { label: "New Hydrant Inspection", href: "/fire/rms/hydrants?action=inspect" },
                { label: "Schedule Fire Inspection", href: "/fire/rms/inspections?action=new" },
                { label: "Create Pre-Plan", href: "/fire/rms/preplans?action=new" },
                { label: "Log CRR Event", href: "/fire/rms/crr?action=new" },
                { label: "Daily Apparatus Check", href: "/fire/rms/maintenance?action=daily" },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <button style={{
                    background: "#333",
                    color: "#f7f6f3",
                    border: "none",
                    padding: "0.75rem 1.25rem",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#ff7c29"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#333"}
                  >
                    {action.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
