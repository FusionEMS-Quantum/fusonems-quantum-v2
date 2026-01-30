"use client";

import React, { useEffect, useState } from "react";
import { Widget } from "./dashboard-schema";

const glassmorphism = {
  background: "rgba(17, 17, 17, 0.8)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 107, 53, 0.2)",
};

interface WidgetProps {
  widget: Widget;
  data?: any;
  loading?: boolean;
  error?: string;
}

export const StatWidget: React.FC<WidgetProps> = ({ widget, data, loading }) => {
  return (
    <div
      style={{
        ...glassmorphism,
        padding: "1.5rem",
        gridColumn: `span ${widget.gridSize.width}`,
        gridRow: `span ${widget.gridSize.height}`,
      }}
    >
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "0.5rem", fontWeight: 600 }}>
        {widget.title}
      </div>
      <div
        style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          background: "linear-gradient(90deg, #ff6b35 0%, #c41e3a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {loading ? "..." : data?.value || "0"}
      </div>
      {data?.change && (
        <div
          style={{
            fontSize: "12px",
            color: data.change > 0 ? "#6fc96f" : "#ff6b7a",
            marginTop: "0.5rem",
          }}
        >
          {data.change > 0 ? "↑" : "↓"} {Math.abs(data.change)}%
        </div>
      )}
    </div>
  );
};

export const ChartWidget: React.FC<WidgetProps> = ({ widget, data, loading }) => {
  return (
    <div
      style={{
        ...glassmorphism,
        padding: "1.5rem",
        gridColumn: `span ${widget.gridSize.width}`,
        gridRow: `span ${widget.gridSize.height}`,
      }}
    >
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "1rem", fontWeight: 600 }}>
        {widget.title}
      </div>
      {loading ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading...
        </div>
      ) : (
        <div
          style={{
            height: "200px",
            background: "rgba(10, 10, 10, 0.5)",
            borderRadius: 0,
            display: "flex",
            alignItems: "flex-end",
            gap: "0.5rem",
            padding: "1rem",
          }}
        >
          {data?.chartData?.map((item: any, idx: number) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${(item.value / Math.max(...data.chartData.map((d: any) => d.value))) * 100}%`,
                background: `rgba(255, 107, 53, ${0.3 + idx * 0.1})`,
                minHeight: "20px",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TableWidget: React.FC<WidgetProps> = ({ widget, data, loading }) => {
  return (
    <div
      style={{
        ...glassmorphism,
        padding: "1.5rem",
        gridColumn: `span ${widget.gridSize.width}`,
        gridRow: `span ${widget.gridSize.height}`,
        overflow: "auto",
      }}
    >
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "1rem", fontWeight: 600 }}>
        {widget.title}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255, 107, 53, 0.2)" }}>
              {data?.columns?.map((col: string, idx: number) => (
                <th
                  key={idx}
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    color: "#ff6b35",
                    fontWeight: 600,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.rows?.map((row: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 107, 53, 0.1)" }}>
                {Object.values(row).map((cell: any, cidx: number) => (
                  <td key={cidx} style={{ padding: "8px 4px", color: "#f7f6f3" }}>
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export const ListWidget: React.FC<WidgetProps> = ({ widget, data, loading }) => {
  return (
    <div
      style={{
        ...glassmorphism,
        padding: "1.5rem",
        gridColumn: `span ${widget.gridSize.width}`,
        gridRow: `span ${widget.gridSize.height}`,
        overflow: "auto",
        maxHeight: "400px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "1rem", fontWeight: 600 }}>
        {widget.title}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data?.items?.map((item: any, idx: number) => (
            <div
              key={idx}
              style={{
                padding: "0.75rem",
                background: "rgba(255, 107, 53, 0.05)",
                border: "1px solid rgba(255, 107, 53, 0.1)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "13px" }}>{item.title}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                {item.subtitle}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface DashboardRendererProps {
  schema: any;
  title: string;
  description: string;
}

export const DashboardRenderer: React.FC<DashboardRendererProps> = ({ schema, title, description }) => {
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const getFallbackData = (widget: Widget) => {
    switch (widget.type) {
      case "stat":
        return { value: "—" };
      case "chart":
        return { chartData: [{ value: 20 }, { value: 40 }, { value: 30 }, { value: 50 }] };
      case "table":
        return { columns: ["Metric", "Value"], rows: [{ Metric: "No data", Value: "—" }] };
      case "list":
        return { items: [{ title: "No data yet", subtitle: "Waiting for feed" }] };
      default:
        return {};
    }
  };

  useEffect(() => {
    const baseUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";
    const fetchAllData = async () => {
      setLoading(true);
      const data: Record<string, any> = {};

      for (const widget of schema.widgets) {
        try {
          const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}${widget.dataSource}` : widget.dataSource;
          const response = await fetch(url, { credentials: "include" });
          if (response.ok) {
            data[widget.id] = await response.json();
          }
        } catch (err) {
          console.error(`Failed to fetch ${widget.id}:`, err);
        }
      }

      setWidgetData(data);
      setLoading(false);
    };

    fetchAllData();
  }, [schema]);

  const renderWidget = (widget: Widget) => {
    const data = widgetData[widget.id] ?? getFallbackData(widget);

    switch (widget.type) {
      case "stat":
        return <StatWidget key={widget.id} widget={widget} data={data} loading={loading} />;
      case "chart":
        return <ChartWidget key={widget.id} widget={widget} data={data} loading={loading} />;
      case "table":
        return <TableWidget key={widget.id} widget={widget} data={data} loading={loading} />;
      case "list":
        return <ListWidget key={widget.id} widget={widget} data={data} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
        color: "#f7f6f3",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "2.5rem",
              fontWeight: 800,
              background: "linear-gradient(90deg, #ff6b35 0%, #c41e3a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {title}
          </h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#888", fontSize: "14px" }}>
            {description}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
          }}
        >
          {schema.widgets.map((widget: Widget) => renderWidget(widget))}
        </div>
      </div>
    </div>
  );
};
