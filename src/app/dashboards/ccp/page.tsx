"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
import { paramedic } from "@/lib/dashboards/dashboard-schema";
export default function CcpDashboard() {
  const ccpSchema = { ...paramedic, title: "CCP Dashboard", description: "Critical Care Paramedic metrics" };
  return <DashboardRenderer schema={ccpSchema} title={ccpSchema.title} description={ccpSchema.description} />;
}
