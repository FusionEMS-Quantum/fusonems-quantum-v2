"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
import { paramedic } from "@/lib/dashboards/dashboard-schema";
export default function CctDashboard() {
  const cctSchema = { ...paramedic, title: "CCT Dashboard", description: "Flight crew metrics" };
  return <DashboardRenderer schema={cctSchema} title={cctSchema.title} description={cctSchema.description} />;
}
