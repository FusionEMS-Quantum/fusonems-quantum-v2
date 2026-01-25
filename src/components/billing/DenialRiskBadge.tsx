type DenialRiskBadgeProps = {
  risks: string[]
}

const palette = ["#ff7c29", "#ffb347", "#ff4d4f"]

export default function DenialRiskBadge({ risks }: DenialRiskBadgeProps) {
  if (!risks?.length) {
    return <span style={{ color: "#4caf50" }}>Low risk</span>
  }
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
        color: "#f7f6f3",
      }}
    >
      {risks.slice(0, 2).map((risk, idx) => (
        <span
          key={risk}
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: 999,
            fontSize: "0.75rem",
            background: palette[idx % palette.length],
            color: "#080808",
            fontWeight: 600,
          }}
        >
          {risk}
        </span>
      ))}
    </span>
  )
}
