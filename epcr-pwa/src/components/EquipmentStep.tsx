import { useState } from 'react'
import type { EquipmentItem } from '../types'

interface Props {
  items: EquipmentItem[]
  onComplete: (items: EquipmentItem[]) => void
  onBack: () => void
}

export default function EquipmentStep({ items: initialItems, onComplete, onBack }: Props) {
  const [items, setItems] = useState(initialItems)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const categories = [...new Set(items.map((i) => i.category))]

  const updateStatus = (id: string, status: EquipmentItem['status']) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
    setChecked((prev) => new Set(prev).add(id))
  }

  const allChecked = checked.size === items.length
  const hasIssues = items.some((i) => i.status !== 'operational')

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Equipment Check</h2>
          <span className="text-sm text-gray-400">
            {checked.size} / {items.length} items verified
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div key={category} className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-blue-400 mb-3">{category}</h3>
              <div className="space-y-3">
                {items
                  .filter((i) => i.category === category)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg ${
                        checked.has(item.id)
                          ? item.status === 'operational'
                            ? 'bg-green-900/30 border border-green-700'
                            : item.status === 'needs_service'
                            ? 'bg-yellow-900/30 border border-yellow-700'
                            : 'bg-red-900/30 border border-red-700'
                          : 'bg-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-400">SN: {item.serialNumber}</p>
                          <p className="text-xs text-gray-400">{item.location}</p>
                        </div>
                        {item.batteryLevel !== undefined && (
                          <div className="text-right">
                            <div className="text-sm">
                              <span
                                className={
                                  item.batteryLevel > 50
                                    ? 'text-green-400'
                                    : item.batteryLevel > 20
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                                }
                              >
                                {item.batteryLevel}%
                              </span>
                            </div>
                            <div className="w-16 h-2 bg-gray-500 rounded-full mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  item.batteryLevel > 50
                                    ? 'bg-green-500'
                                    : item.batteryLevel > 20
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${item.batteryLevel}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateStatus(item.id, 'operational')}
                          className={`flex-1 py-2 rounded text-sm ${
                            checked.has(item.id) && item.status === 'operational'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-500 hover:bg-green-600'
                          }`}
                        >
                          OK
                        </button>
                        <button
                          onClick={() => updateStatus(item.id, 'needs_service')}
                          className={`flex-1 py-2 rounded text-sm ${
                            checked.has(item.id) && item.status === 'needs_service'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-500 hover:bg-yellow-600'
                          }`}
                        >
                          Service
                        </button>
                        <button
                          onClick={() => updateStatus(item.id, 'out_of_service')}
                          className={`flex-1 py-2 rounded text-sm ${
                            checked.has(item.id) && item.status === 'out_of_service'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-500 hover:bg-red-600'
                          }`}
                        >
                          OOS
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasIssues && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
          <h3 className="font-medium text-yellow-400 mb-2">Equipment Issues</h3>
          <ul className="list-disc list-inside text-sm text-yellow-200">
            {items
              .filter((i) => i.status !== 'operational')
              .map((item) => (
                <li key={item.id}>
                  {item.name} ({item.serialNumber}) -{' '}
                  {item.status === 'needs_service' ? 'Needs Service' : 'Out of Service'}
                </li>
              ))}
          </ul>
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
          onClick={() => onComplete(items)}
          disabled={!allChecked}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {allChecked ? 'Continue to Inventory' : `Verify All Equipment (${items.length - checked.size} remaining)`}
        </button>
      </div>
    </div>
  )
}
