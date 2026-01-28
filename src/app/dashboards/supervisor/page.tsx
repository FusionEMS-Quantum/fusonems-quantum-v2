"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
import { supervisor } from "@/lib/dashboards/dashboard-schema";
export default function SupervisorDashboard() {
  return <DashboardRenderer schema={supervisor} title={supervisor.title} description={supervisor.description} />;
}
