type RCMChartProps = {
  data: { label: string; value: number; color?: string }[]
  title?: string
}

export default function RCMChart({ data = [], title = "" }: RCMChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0) || 1
  return (
    <section
      style={{
        padding: "1rem",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(12,12,12,0.85)",
      }}
    >
      {title && <h3 style={{ margin: "0 0 0.75rem", color: "#ff7c29" }}>{title}</h3>}
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end", minHeight: 120 }}>
        {data.map((item) => {
          const pct = (item.value / total) * 100
          return (
            <div
              key={item.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(pct, 8)}%`,
                  background: item.color || "rgba(255,255,255,0.3)",
                  borderRadius: 4,
                  transition: "height 0.3s ease",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "#bbb" }}>{item.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
