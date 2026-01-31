import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing | FusionEMS Quantum",
  description:
    "Transparent, usage-aligned transport billing. Platform subscription, billing base fee, and per-transport usage. No percentage-of-revenue fees.",
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
