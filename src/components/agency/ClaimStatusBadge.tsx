export type ClaimStatus =
  | "Preparing Claim"
  | "Waiting on Documentation"
  | "Submitted to Payer"
  | "Payer Reviewing"
  | "Additional Information Requested"
  | "Paid"
  | "Partially Paid"
  | "Denied – Under Review"
  | "Closed"

interface ClaimStatusBadgeProps {
  status: ClaimStatus
}

const statusConfig: Record<
  ClaimStatus,
  { color: string; bgColor: string; borderColor: string }
> = {
  "Preparing Claim": { color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  "Waiting on Documentation": { color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  "Submitted to Payer": { color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  "Payer Reviewing": { color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30" },
  "Additional Information Requested": { color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
  "Paid": { color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  "Partially Paid": { color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30" },
  "Denied – Under Review": { color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  "Closed": { color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
}

export default function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full border ${config.color} ${config.bgColor} ${config.borderColor}`}
    >
      {status}
    </span>
  )
}
