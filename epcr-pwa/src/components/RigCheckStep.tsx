import { useState } from 'react'
import type { RigCheckItem } from '../types'

interface Props {
  items: RigCheckItem[]
  onComplete: (items: RigCheckItem[], signature: string) => void
}

export default function RigCheckStep({ items: initialItems, onComplete }: Props) {
  const [items, setItems] = useState(initialItems)
  const [signature, setSignature] = useState('')
  const [showSignature, setShowSignature] = useState(false)

  const categories = [...new Set(items.map((i) => i.category))]

  const updateItemStatus = (id: string, status: RigCheckItem['status'], notes?: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, notes: notes ?? item.notes, lastChecked: new Date().toISOString() }
          : item
      )
    )
  }

  const allChecked = items.every((i) => i.status !== 'unchecked')
  const hasFailures = items.some((i) => i.status === 'fail' || i.status === 'needs_attention')

  const handleComplete = () => {
    if (!allChecked) return
    if (hasFailures && !signature) {
      setShowSignature(true)
      return
    }
    onComplete(items, signature)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Vehicle & Equipment Rig Check</h2>
          <span className="text-sm text-gray-400">
            {items.filter((i) => i.status !== 'unchecked').length} / {items.length} items checked
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div key={category} className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-blue-400 mb-3">{category}</h3>
              <div className="space-y-2">
                {items
                  .filter((i) => i.category === category)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        item.status === 'pass'
                          ? 'bg-green-900/30 border border-green-700'
                          : item.status === 'fail'
                          ? 'bg-red-900/30 border border-red-700'
                          : item.status === 'needs_attention'
                          ? 'bg-yellow-900/30 border border-yellow-700'
                          : 'bg-gray-600'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-400">{item.location}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateItemStatus(item.id, 'pass')}
                          className={`px-3 py-2 rounded ${
                            item.status === 'pass'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-500 hover:bg-green-600'
                          }`}
                        >
                          Pass
                        </button>
                        <button
                          onClick={() => updateItemStatus(item.id, 'fail')}
                          className={`px-3 py-2 rounded ${
                            item.status === 'fail'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-500 hover:bg-red-600'
                          }`}
                        >
                          Fail
                        </button>
                        <button
                          onClick={() => updateItemStatus(item.id, 'needs_attention')}
                          className={`px-3 py-2 rounded text-sm ${
                            item.status === 'needs_attention'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-500 hover:bg-yellow-600'
                          }`}
                        >
                          Attn
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasFailures && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
          <h3 className="font-medium text-yellow-400 mb-2">Issues Found</h3>
          <ul className="list-disc list-inside text-sm text-yellow-200">
            {items
              .filter((i) => i.status === 'fail' || i.status === 'needs_attention')
              .map((item) => (
                <li key={item.id}>
                  {item.name} - {item.status === 'fail' ? 'Failed' : 'Needs Attention'}
                </li>
              ))}
          </ul>
          <p className="text-sm text-yellow-400 mt-2">
            Signature required to acknowledge issues and continue.
          </p>
        </div>
      )}

      {showSignature && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium mb-3">Acknowledge Issues</h3>
          <p className="text-sm text-gray-400 mb-3">
            By signing below, you acknowledge the issues noted above and take responsibility for the unit.
          </p>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Type your full name to sign"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleComplete}
          disabled={!allChecked || (hasFailures && !signature)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {allChecked ? 'Continue to Equipment' : `Check All Items (${items.filter((i) => i.status === 'unchecked').length} remaining)`}
        </button>
      </div>
    </div>
  )
}
