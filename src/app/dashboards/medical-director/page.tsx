"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
export default function MedicalDirectorDashboard() {
  const schema = {
    widgets: [
      { id: "protocol", type: "stat", title: "Protocol Adherence %", dataSource: "/api/dashboards/medical-director/protocol-adherence", gridSize: { width: 1, height: 1 } },
      { id: "outliers", type: "stat", title: "Outlier Cases", dataSource: "/api/dashboards/medical-director/outliers", gridSize: { width: 1, height: 1 } },
      { id: "ai_accept", type: "stat", title: "AI Suggestions Accepted", dataSource: "/api/dashboards/medical-director/ai-acceptance", gridSize: { width: 1, height: 1 } },
      { id: "cases", type: "table", title: "Recent Cases", dataSource: "/api/dashboards/medical-director/cases", gridSize: { width: 3, height: 2 } },
    ],
  };
  return <DashboardRenderer schema={schema} title="Medical Director Dashboard" description="Clinical outcomes and protocol adherence" />;
}
