type ClaimCardProps = {
  id: number
  payer: string
  status: string
  denialRisks: string[]
  createdAt?: string
  officeAllyBatch?: string
  onSubmit?: () => void
}

export default function ClaimCard({
  id,
  payer,
  status,
  denialRisks,
  createdAt,
  officeAllyBatch,
  onSubmit,
}: ClaimCardProps) {
  return (
    <article
      className="panel"
      style={{
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 12,
        padding: "1rem",
        background: "rgba(8,8,8,0.7)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "#f7f6f3", fontSize: "0.9rem", margin: 0 }}>Claim #{id}</p>
          <strong style={{ color: "#ff7c29" }}>{payer}</strong>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            padding: "0.35rem 0.75rem",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          {status}
        </span>
      </header>
      <div style={{ marginTop: "0.65rem" }}>
        <p style={{ color: "#f7f6f3", margin: 0 }}>{createdAt ? new Date(createdAt).toLocaleString() : "No timestamp"}</p>
        {officeAllyBatch && (
          <p style={{ color: "#bbb", fontSize: "0.75rem" }}>Batch {officeAllyBatch}</p>
        )}
      </div>
      {denialRisks.length > 0 && (
        <ul style={{ marginTop: "0.75rem", paddingLeft: "1rem" }}>
          {denialRisks.map((risk) => (
            <li key={risk} style={{ color: "#ffb347" }}>
              {risk}
            </li>
          ))}
        </ul>
      )}
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          style={{
            marginTop: "0.9rem",
            background: "#ff7c29",
            border: "none",
            borderRadius: 8,
            color: "#080808",
            fontWeight: 600,
            padding: "0.6rem 1.2rem",
            cursor: "pointer",
          }}
        >
          Submit to Office Ally
        </button>
      )}
    </article>
  )
}
