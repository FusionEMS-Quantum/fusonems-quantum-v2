"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
export default function StationChiefDashboard() {
  const schema = {
    widgets: [
      { id: "calls", type: "stat", title: "Calls Today", dataSource: "/api/dashboards/station-chief/calls-today", gridSize: { width: 1, height: 1 } },
      { id: "crew", type: "stat", title: "Available Crew", dataSource: "/api/dashboards/station-chief/crew-available", gridSize: { width: 1, height: 1 } },
      { id: "response", type: "stat", title: "Avg Response Time", dataSource: "/api/dashboards/station-chief/response-time", gridSize: { width: 1, height: 1 } },
      { id: "roster", type: "table", title: "Crew Roster", dataSource: "/api/dashboards/station-chief/roster", gridSize: { width: 3, height: 2 } },
    ],
  };
  return <DashboardRenderer schema={schema} title="Station Chief Dashboard" description="Crew performance and operational metrics" />;
}
