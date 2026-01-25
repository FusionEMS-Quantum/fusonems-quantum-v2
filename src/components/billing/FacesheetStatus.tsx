type FacesheetStatusProps = {
  present: boolean
  missingFields?: string[]
  onRequest?: () => void
}

export default function FacesheetStatus({ present, missingFields = [], onRequest }: FacesheetStatusProps) {
  return (
    <div
      style={{
        padding: "0.8rem",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.15)",
        background: present ? "rgba(76,175,80,0.12)" : "rgba(255,76,76,0.12)",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "#f7f6f3" }}>
        Facesheet {present ? "present" : "missing"}
      </p>
      {!present && missingFields.length > 0 && (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "#ffb347" }}>
          Missing: {missingFields.join(", ")}
        </p>
      )}
      {!present && onRequest && (
        <button
          type="button"
          onClick={onRequest}
          style={{
            marginTop: "0.6rem",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#f7f6f3",
            fontSize: "0.85rem",
            padding: "0.35rem 0.6rem",
            cursor: "pointer",
          }}
        >
          Request facesheet
        </button>
      )}
    </div>
  )
}
