/**
 * Portals layout: cohesive dark theme, subtle gradient, no homepage hero.
 * Shared styling for dispatch, EMS, fire, scheduling portals.
 */
export default function PortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] relative bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#080808]"
      style={{ isolation: "isolate" }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:48px_48px]"
        aria-hidden
      />
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
}
