import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FusionEMS Scheduling | Standalone Crew Scheduling for EMS Agencies",
  description:
    "EMS-focused crew scheduling. Manage shifts, availability, time off, and staffing visibility without CAD or billing. Standalone or integrated into FusionEMS Quantum.",
}

export default function SchedulingLandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
