import { useState } from 'react'
import type { InventoryItem } from '../types'

interface Props {
  items: InventoryItem[]
  onComplete: (items: InventoryItem[], discrepancies: string[]) => void
  onBack: () => void
}

export default function InventoryStep({ items: initialItems, onComplete, onBack }: Props) {
  const [items, setItems] = useState(initialItems)
  const [verified, setVerified] = useState<Set<string>>(new Set())
  const [discrepancies, setDiscrepancies] = useState<string[]>([])

  const categories = [...new Set(items.map((i) => i.category))]

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, currentQuantity: quantity }
        if (quantity !== item.parLevel && !discrepancies.includes(id)) {
          setDiscrepancies((d) => [...d, id])
        } else if (quantity === item.parLevel && discrepancies.includes(id)) {
          setDiscrepancies((d) => d.filter((i) => i !== id))
        }
        return updated
      })
    )
    setVerified((prev) => new Set(prev).add(id))
  }

  const confirmQuantity = (id: string) => {
    setVerified((prev) => new Set(prev).add(id))
  }

  const allVerified = verified.size === items.length

  const lowStock = items.filter((i) => i.currentQuantity <= i.reorderPoint)
  const belowPar = items.filter((i) => i.currentQuantity < i.parLevel)

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Inventory Count</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-400">
              {verified.size} / {items.length} verified
            </span>
            {belowPar.length > 0 && (
              <span className="text-yellow-400">{belowPar.length} below par</span>
            )}
            {lowStock.length > 0 && (
              <span className="text-red-400">{lowStock.length} need reorder</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div key={category} className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-blue-400 mb-3">{category}</h3>
              <div className="space-y-2">
                {items
                  .filter((i) => i.category === category)
                  .map((item) => {
                    const isLow = item.currentQuantity <= item.reorderPoint
                    const isBelowPar = item.currentQuantity < item.parLevel
                    const isVerified = verified.has(item.id)

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg ${
                          isVerified
                            ? isLow
                              ? 'bg-red-900/30 border border-red-700'
                              : isBelowPar
                              ? 'bg-yellow-900/30 border border-yellow-700'
                              : 'bg-green-900/30 border border-green-700'
                            : 'bg-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.location}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Par: {item.parLevel}</span>
                            <div className="flex items-center bg-gray-800 rounded">
                              <button
                                onClick={() => updateQuantity(item.id, Math.max(0, item.currentQuantity - 1))}
                                className="px-2 py-1 text-lg hover:bg-gray-700 rounded-l"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.currentQuantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                className="w-12 text-center bg-transparent border-0 text-white"
                              />
                              <button
                                onClick={() => updateQuantity(item.id, item.currentQuantity + 1)}
                                className="px-2 py-1 text-lg hover:bg-gray-700 rounded-r"
                              >
                                +
                              </button>
                            </div>
                            {!isVerified && (
                              <button
                                onClick={() => confirmQuantity(item.id)}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                OK
                              </button>
                            )}
                          </div>
                        </div>
                        {item.expirationDate && (
                          <p className="text-xs text-gray-400 mt-1">
                            Exp: {new Date(item.expirationDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(lowStock.length > 0 || belowPar.length > 0) && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
          <h3 className="font-medium text-yellow-400 mb-2">Inventory Discrepancies</h3>
          {lowStock.length > 0 && (
            <div className="mb-2">
              <p className="text-sm text-red-400 font-medium">Needs Reorder:</p>
              <ul className="list-disc list-inside text-sm text-red-200">
                {lowStock.map((item) => (
                  <li key={item.id}>
                    {item.name}: {item.currentQuantity} (reorder at {item.reorderPoint})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {belowPar.filter((i) => !lowStock.includes(i)).length > 0 && (
            <div>
              <p className="text-sm text-yellow-400 font-medium">Below Par Level:</p>
              <ul className="list-disc list-inside text-sm text-yellow-200">
                {belowPar
                  .filter((i) => !lowStock.includes(i))
                  .map((item) => (
                    <li key={item.id}>
                      {item.name}: {item.currentQuantity} / {item.parLevel}
                    </li>
                  ))}
              </ul>
            </div>
          )}
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
          onClick={() => onComplete(items, discrepancies)}
          disabled={!allVerified}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {allVerified
            ? 'Continue to Narcotics'
            : `Verify All Items (${items.length - verified.size} remaining)`}
        </button>
      </div>
    </div>
  )
}
