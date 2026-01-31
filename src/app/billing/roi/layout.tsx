import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "EMS Transport Billing ROI Calculator | FusionEMS Quantum",
  description:
    "Estimate the financial impact of integrated EMS transport billing using conservative assumptions and ZIP-based service modeling. Built for EMS, Fire, and HEMS agencies.",
  keywords: [
    "EMS billing ROI",
    "transport billing EMS",
    "EMS reimbursement optimization",
    "Fire EMS billing",
    "EMS billing calculator",
    "ambulance billing workflow",
  ],
}

export default function ROILayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
