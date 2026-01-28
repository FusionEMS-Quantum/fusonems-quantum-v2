"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
import { paramedic } from "@/lib/dashboards/dashboard-schema";
export default function EmtDashboard() {
  const emtSchema = { ...paramedic, title: "EMT Dashboard", description: "EMT performance metrics" };
  return <DashboardRenderer schema={emtSchema} title={emtSchema.title} description={emtSchema.description} />;
}
