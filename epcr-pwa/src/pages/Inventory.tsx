import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { inventory as invApi } from '../lib/api'
import type { InventoryItem } from '../types'

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showUseModal, setShowUseModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [useQuantity, setUseQuantity] = useState(1)
  const [useReason, setUseReason] = useState('')

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setLoading(true)
    try {
      setItems(generateMockInventory())
    } catch (err) {
      console.error('Failed to load inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  const openUseModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setUseQuantity(1)
    setUseReason('')
    setShowUseModal(true)
  }

  const confirmUse = async () => {
    if (!selectedItem) return
    try {
      await invApi.useItem(selectedItem.id, {
        quantity: useQuantity,
        reason: useReason,
      })
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? { ...i, currentQuantity: i.currentQuantity - useQuantity }
            : i
        )
      )
    } catch (err) {
      console.error('Failed to use item:', err)
    }
    setShowUseModal(false)
    setSelectedItem(null)
  }

  const categories = [...new Set(items.map((i) => i.category))]
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) ||
      item.sku.toLowerCase().includes(filter.toLowerCase())
    const matchesCategory = !categoryFilter || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const lowStock = items.filter((i) => i.currentQuantity <= i.reorderPoint)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-white">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold">Inventory Management</h1>
          </div>
          {lowStock.length > 0 && (
            <span className="px-3 py-1 bg-red-600 rounded-full text-sm">
              {lowStock.length} items need reorder
            </span>
          )}
        </div>
      </header>

      <main className="p-6">
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search items..."
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {lowStock.length > 0 && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-400 mb-2">Items Needing Reorder</h3>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item) => (
                <span key={item.id} className="px-3 py-1 bg-red-800 rounded text-sm">
                  {item.name}: {item.currentQuantity}/{item.parLevel}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isLow = item.currentQuantity <= item.reorderPoint
            const isBelowPar = item.currentQuantity < item.parLevel

            return (
              <div
                key={item.id}
                className={`bg-gray-800 rounded-lg p-4 border ${
                  isLow
                    ? 'border-red-600'
                    : isBelowPar
                    ? 'border-yellow-600'
                    : 'border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-xs text-gray-400">{item.sku}</p>
                  </div>
                  <span className="text-xs text-gray-500">{item.category}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className={`text-2xl font-bold ${
                      isLow ? 'text-red-400' : isBelowPar ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {item.currentQuantity}
                    </span>
                    <span className="text-gray-400 text-sm">/{item.parLevel}</span>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>Location: {item.location}</p>
                    {item.expirationDate && (
                      <p>Exp: {new Date(item.expirationDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openUseModal(item)}
                    disabled={item.currentQuantity === 0}
                    className="flex-1 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {showUseModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Use Item</h2>
            <p className="text-gray-400 mb-4">{selectedItem.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.currentQuantity}
                  value={useQuantity}
                  onChange={(e) => setUseQuantity(parseInt(e.target.value) || 1)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available: {selectedItem.currentQuantity}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                <select
                  value={useReason}
                  onChange={(e) => setUseReason(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select reason...</option>
                  <option value="patient_care">Patient Care</option>
                  <option value="expired">Expired</option>
                  <option value="damaged">Damaged</option>
                  <option value="training">Training</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowUseModal(false)}
                className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmUse}
                disabled={!useReason}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function generateMockInventory(): InventoryItem[] {
  return [
    { id: '1', name: 'Saline 1000ml', sku: 'SAL-1000', category: 'IV Fluids', location: 'IV Cabinet', parLevel: 6, currentQuantity: 6, reorderPoint: 2 },
    { id: '2', name: 'Saline 500ml', sku: 'SAL-500', category: 'IV Fluids', location: 'IV Cabinet', parLevel: 4, currentQuantity: 4, reorderPoint: 2 },
    { id: '3', name: 'Lactated Ringers 1000ml', sku: 'LR-1000', category: 'IV Fluids', location: 'IV Cabinet', parLevel: 4, currentQuantity: 3, reorderPoint: 2 },
    { id: '4', name: 'IV Start Kit', sku: 'IVK-001', category: 'IV Supplies', location: 'IV Cabinet', parLevel: 10, currentQuantity: 8, reorderPoint: 4 },
    { id: '5', name: '18ga IV Catheter', sku: 'IVC-18', category: 'IV Supplies', location: 'IV Cabinet', parLevel: 10, currentQuantity: 10, reorderPoint: 4 },
    { id: '6', name: '20ga IV Catheter', sku: 'IVC-20', category: 'IV Supplies', location: 'IV Cabinet', parLevel: 10, currentQuantity: 9, reorderPoint: 4 },
    { id: '7', name: '22ga IV Catheter', sku: 'IVC-22', category: 'IV Supplies', location: 'IV Cabinet', parLevel: 6, currentQuantity: 5, reorderPoint: 2 },
    { id: '8', name: 'NRB Mask Adult', sku: 'NRB-A', category: 'Oxygen', location: 'Airway Cabinet', parLevel: 4, currentQuantity: 4, reorderPoint: 2 },
    { id: '9', name: 'NRB Mask Pedi', sku: 'NRB-P', category: 'Oxygen', location: 'Airway Cabinet', parLevel: 2, currentQuantity: 2, reorderPoint: 1 },
    { id: '10', name: 'Nasal Cannula', sku: 'NC-001', category: 'Oxygen', location: 'Airway Cabinet', parLevel: 6, currentQuantity: 5, reorderPoint: 2 },
    { id: '11', name: 'BVM Adult', sku: 'BVM-A', category: 'Airway', location: 'Airway Bag', parLevel: 2, currentQuantity: 2, reorderPoint: 1 },
    { id: '12', name: 'BVM Pediatric', sku: 'BVM-P', category: 'Airway', location: 'Airway Bag', parLevel: 1, currentQuantity: 1, reorderPoint: 1 },
    { id: '13', name: 'OPA Set', sku: 'OPA-001', category: 'Airway', location: 'Airway Bag', parLevel: 2, currentQuantity: 2, reorderPoint: 1 },
    { id: '14', name: 'NPA Set', sku: 'NPA-001', category: 'Airway', location: 'Airway Bag', parLevel: 2, currentQuantity: 2, reorderPoint: 1 },
    { id: '15', name: 'King Airway Kit', sku: 'KING-001', category: 'Airway', location: 'Airway Bag', parLevel: 2, currentQuantity: 1, reorderPoint: 1 },
    { id: '16', name: 'Bandage 4x4', sku: 'BND-4X4', category: 'Trauma', location: 'Trauma Bag', parLevel: 20, currentQuantity: 18, reorderPoint: 8 },
    { id: '17', name: 'Trauma Dressing', sku: 'TRD-001', category: 'Trauma', location: 'Trauma Bag', parLevel: 4, currentQuantity: 4, reorderPoint: 2 },
    { id: '18', name: 'Tourniquet', sku: 'TQ-001', category: 'Trauma', location: 'Trauma Bag', parLevel: 4, currentQuantity: 4, reorderPoint: 2 },
    { id: '19', name: 'ECG Electrodes (pack)', sku: 'ECG-001', category: 'Monitoring', location: 'Monitor Cabinet', parLevel: 10, currentQuantity: 8, reorderPoint: 4 },
    { id: '20', name: 'BP Cuff Adult', sku: 'BP-A', category: 'Monitoring', location: 'Vitals Bag', parLevel: 2, currentQuantity: 2, reorderPoint: 1 },
  ]
}
