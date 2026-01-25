type AssistCard = {
  title: string
  summary: string
  footer?: string
}

type AIAssistPanelProps = {
  cards?: AssistCard[]
}

export default function AIAssistPanel({ cards = [] }: AIAssistPanelProps) {
  return (
    <section
      style={{
        padding: "1rem",
        borderRadius: 16,
        background: "rgba(17,17,17,0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <h3 style={{ color: "#ff7c29", margin: "0 0 0.75rem" }}>AI Assist</h3>
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {cards.map((card) => (
          <article
            key={card.title}
            style={{
              background: "#0d0d0d",
              borderRadius: 12,
              padding: "0.75rem 1rem",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#bbb" }}>{card.title}</p>
            <p style={{ margin: "0.2rem 0 0.5rem", color: "#f7f6f3", fontWeight: 600 }}>{card.summary}</p>
            {card.footer && (
              <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>{card.footer}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
