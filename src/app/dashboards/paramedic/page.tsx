"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
import { paramedic } from "@/lib/dashboards/dashboard-schema";
export default function ParamedicDashboard() {
  return <DashboardRenderer schema={paramedic} title={paramedic.title} description={paramedic.description} />;
}
