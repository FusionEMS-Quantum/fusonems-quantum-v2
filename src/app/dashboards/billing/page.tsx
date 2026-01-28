"use client";
import { DashboardRenderer } from "@/lib/dashboards/widgets";
import { billing } from "@/lib/dashboards/dashboard-schema";
export default function BillingDashboard() {
  return <DashboardRenderer schema={billing} title={billing.title} description={billing.description} />;
}
