import { useState } from 'react'
import type { ControlledSubstance } from '../types'

interface Props {
  substances: ControlledSubstance[]
  onComplete: (
    substances: ControlledSubstance[],
    primarySignature: string,
    witnessSignature: string,
    witnessName: string
  ) => void
  onBack: () => void
}

export default function NarcoticsStep({ substances: initial, onComplete, onBack }: Props) {
  const [substances, setSubstances] = useState(initial)
  const [verified, setVerified] = useState<Set<string>>(new Set())
  const [primarySignature, setPrimarySignature] = useState('')
  const [witnessName, setWitnessName] = useState('')
  const [witnessSignature, setWitnessSignature] = useState('')
  const [showSignatures, setShowSignatures] = useState(false)

  const updateSubstance = (id: string, updates: Partial<ControlledSubstance>) => {
    setSubstances((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, ...updates, lastVerified: new Date().toISOString() }
          : s
      )
    )
  }

  const verifySubstance = (id: string) => {
    const substance = substances.find((s) => s.id === id)
    if (!substance) return
    if (substance.quantity === substance.expectedQuantity && substance.sealIntact) {
      setVerified((prev) => new Set(prev).add(id))
    }
  }

  const allVerified = verified.size === substances.length
  const hasDiscrepancies = substances.some(
    (s) => s.quantity !== s.expectedQuantity || !s.sealIntact
  )

  const handleContinue = () => {
    if (!allVerified && !hasDiscrepancies) return
    if (!showSignatures) {
      setShowSignatures(true)
      return
    }
    if (!primarySignature || !witnessName || !witnessSignature) return
    onComplete(substances, primarySignature, witnessSignature, witnessName)
  }

  const scheduleColor = (schedule: string) => {
    switch (schedule) {
      case 'II':
        return 'text-red-400 bg-red-900/30 border-red-700'
      case 'III':
        return 'text-orange-400 bg-orange-900/30 border-orange-700'
      case 'IV':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-700'
      case 'V':
        return 'text-green-400 bg-green-900/30 border-green-700'
      default:
        return 'text-gray-400 bg-gray-700 border-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">Controlled Substance Verification</h2>
            <p className="text-sm text-gray-400">
              DEA-regulated medications require dual verification
            </p>
          </div>
          <span className="text-sm text-gray-400">
            {verified.size} / {substances.length} verified
          </span>
        </div>

        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">
            <strong>NOTICE:</strong> Controlled substance counts must be verified by two personnel.
            Any discrepancies must be reported immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {substances.map((substance) => {
            const isVerified = verified.has(substance.id)
            const hasIssue =
              substance.quantity !== substance.expectedQuantity || !substance.sealIntact

            return (
              <div
                key={substance.id}
                className={`p-4 rounded-lg border ${
                  isVerified
                    ? 'bg-green-900/30 border-green-700'
                    : hasIssue
                    ? 'bg-red-900/30 border-red-700'
                    : 'bg-gray-700 border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{substance.name}</h3>
                    <p className="text-sm text-gray-400">{substance.concentration}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold border ${scheduleColor(substance.deaSchedule)}`}
                  >
                    Schedule {substance.deaSchedule}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-400">Lot Number</p>
                    <p className="font-mono">{substance.lotNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Expiration</p>
                    <p>{new Date(substance.expirationDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">
                      Count (Expected: {substance.expectedQuantity})
                    </p>
                    <div className="flex items-center bg-gray-800 rounded">
                      <button
                        onClick={() =>
                          updateSubstance(substance.id, {
                            quantity: Math.max(0, substance.quantity - 1),
                          })
                        }
                        disabled={isVerified}
                        className="px-3 py-2 text-lg hover:bg-gray-700 rounded-l disabled:opacity-50"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={substance.quantity}
                        onChange={(e) =>
                          updateSubstance(substance.id, {
                            quantity: parseInt(e.target.value) || 0,
                          })
                        }
                        disabled={isVerified}
                        className="w-16 text-center bg-transparent border-0 text-white text-lg font-bold disabled:opacity-50"
                      />
                      <button
                        onClick={() =>
                          updateSubstance(substance.id, { quantity: substance.quantity + 1 })
                        }
                        disabled={isVerified}
                        className="px-3 py-2 text-lg hover:bg-gray-700 rounded-r disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Seal Intact</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSubstance(substance.id, { sealIntact: true })}
                        disabled={isVerified}
                        className={`px-3 py-2 rounded ${
                          substance.sealIntact
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 hover:bg-green-600'
                        } disabled:opacity-50`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => updateSubstance(substance.id, { sealIntact: false })}
                        disabled={isVerified}
                        className={`px-3 py-2 rounded ${
                          !substance.sealIntact
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-600 hover:bg-red-600'
                        } disabled:opacity-50`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>

                {!isVerified && !hasIssue && (
                  <button
                    onClick={() => verifySubstance(substance.id)}
                    className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                  >
                    Verify Count
                  </button>
                )}
                {isVerified && (
                  <div className="text-center py-2 text-green-400 font-medium">Verified</div>
                )}
                {hasIssue && !isVerified && (
                  <div className="text-center py-2 text-red-400 font-medium">
                    Discrepancy - Must Report
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {hasDiscrepancies && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
          <h3 className="font-medium text-red-400 mb-2">Controlled Substance Discrepancies</h3>
          <ul className="list-disc list-inside text-sm text-red-200">
            {substances
              .filter((s) => s.quantity !== s.expectedQuantity || !s.sealIntact)
              .map((s) => (
                <li key={s.id}>
                  {s.name}: {s.quantity !== s.expectedQuantity && `Count ${s.quantity} (expected ${s.expectedQuantity})`}
                  {!s.sealIntact && ' Seal broken/tampered'}
                </li>
              ))}
          </ul>
          <p className="text-sm text-red-300 mt-2 font-medium">
            These discrepancies will be reported to supervision. Both signatures are still required.
          </p>
        </div>
      )}

      {showSignatures && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-lg">Dual Verification Signatures</h3>
          <p className="text-sm text-gray-400">
            Both crew members must sign to verify the controlled substance count.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Primary Crew Signature</label>
              <input
                type="text"
                value={primarySignature}
                onChange={(e) => setPrimarySignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Witness Name</label>
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Partner's full name"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Witness Signature</label>
            <input
              type="text"
              value={witnessSignature}
              onChange={(e) => setWitnessSignature(e.target.value)}
              placeholder="Partner types their full name to sign"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={
            (!allVerified && !hasDiscrepancies) ||
            (showSignatures && (!primarySignature || !witnessName || !witnessSignature))
          }
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {!showSignatures
            ? 'Continue to Sign'
            : 'Complete Checkout'}
        </button>
      </div>
    </div>
  )
}
