interface WhyNotPaidPanelProps {
  currentStep: string
  whatsNeeded: string
  whoIsResponsible: string
}

export default function WhyNotPaidPanel({
  currentStep,
  whatsNeeded,
  whoIsResponsible,
}: WhyNotPaidPanelProps) {
  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/30 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">
        Why isn&apos;t this paid yet?
      </h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-orange-400 mb-2">
            Current Step
          </h4>
          <p className="text-gray-300">{currentStep}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-orange-400 mb-2">
            What&apos;s Needed
          </h4>
          <p className="text-gray-300">{whatsNeeded}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-orange-400 mb-2">
            Who Is Responsible
          </h4>
          <p className="text-gray-300">{whoIsResponsible}</p>
        </div>
      </div>
    </div>
  )
}
