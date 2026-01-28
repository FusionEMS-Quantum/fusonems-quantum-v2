// Dashboard schema for all provider roles

export type WidgetType = "stat" | "chart" | "table" | "list" | "timeline" | "heatmap";

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: string;
  config?: Record<string, any>;
  gridSize: { width: number; height: number };
}

export interface DashboardSchema {
  role: string;
  title: string;
  description: string;
  widgets: Widget[];
}

export const paramedic: DashboardSchema = {
  role: "paramedic",
  title: "Paramedic Dashboard",
  description: "Personal performance metrics",
  widgets: [
    {
      id: "calls_month",
      type: "stat",
      title: "Calls This Month",
      dataSource: "/api/dashboards/paramedic/calls-count",
      gridSize: { width: 1, height: 1 },
    },
    {
      id: "quality_score",
      type: "stat",
      title: "Quality Score",
      dataSource: "/api/dashboards/paramedic/quality-score",
      gridSize: { width: 1, height: 1 },
    },
    {
      id: "recent_calls",
      type: "list",
      title: "Recent Calls",
      dataSource: "/api/dashboards/paramedic/recent-calls",
      gridSize: { width: 3, height: 2 },
    },
  ],
};

export const supervisor: DashboardSchema = {
  role: "supervisor",
  title: "Supervisor/QA Dashboard",
  description: "Review queue and quality metrics",
  widgets: [
    {
      id: "pending_reviews",
      type: "stat",
      title: "Pending Reviews",
      dataSource: "/api/dashboards/supervisor/pending-count",
      gridSize: { width: 1, height: 1 },
    },
    {
      id: "review_queue",
      type: "table",
      title: "Review Queue",
      dataSource: "/api/dashboards/supervisor/review-queue",
      gridSize: { width: 3, height: 2 },
    },
  ],
};

export const billing: DashboardSchema = {
  role: "billing",
  title: "Billing & Revenue Dashboard",
  description: "Claims and revenue tracking",
  widgets: [
    {
      id: "claims_submitted",
      type: "stat",
      title: "Claims Submitted",
      dataSource: "/api/dashboards/billing/submitted-claims",
      gridSize: { width: 1, height: 1 },
    },
    {
      id: "denial_rate",
      type: "stat",
      title: "Denial Rate",
      dataSource: "/api/dashboards/billing/denial-rate",
      gridSize: { width: 1, height: 1 },
    },
  ],
};
