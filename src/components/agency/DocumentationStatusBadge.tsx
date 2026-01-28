export type DocumentationStatus =
  | "Required"
  | "Not Required"
  | "Requested"
  | "Waiting on Sender"
  | "Received"
  | "Under Review"
  | "Complete"

interface DocumentationStatusBadgeProps {
  status: DocumentationStatus
  helperText?: string
}

const statusConfig: Record<
  DocumentationStatus,
  { color: string; bgColor: string; borderColor: string }
> = {
  "Required": { color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  "Not Required": { color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
  "Requested": { color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  "Waiting on Sender": { color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
  "Received": { color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  "Under Review": { color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  "Complete": { color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
}

export default function DocumentationStatusBadge({ status, helperText }: DocumentationStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full border ${config.color} ${config.bgColor} ${config.borderColor}`}
      >
        {status}
      </span>
      {helperText && (
        <span className="text-xs text-gray-400 italic">{helperText}</span>
      )}
    </div>
  )
}
