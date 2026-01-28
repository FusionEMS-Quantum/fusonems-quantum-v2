"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ReorderSuggestion {
  item_id: number;
  name: string;
  sku: string;
  category: string;
  current_qty: number;
  par_level: number;
  reorder_point: number;
  suggested_order_qty: number;
  unit_cost: number;
  estimated_cost: number;
  supplier: string;
  lead_time_days: number;
  is_critical: boolean;
  is_out_of_stock: boolean;
}

export default function ReorderPage() {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/inventory/reorder-suggestions")
      .then((r) => r.json())
      .then(setSuggestions)
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((s) => s.item_id)));
    }
  };

  const outOfStock = suggestions.filter((s) => s.is_out_of_stock);
  const critical = suggestions.filter((s) => s.is_critical && !s.is_out_of_stock);
  const regular = suggestions.filter((s) => !s.is_critical && !s.is_out_of_stock);

  const selectedTotal = suggestions
    .filter((s) => selected.has(s.item_id))
    .reduce((sum, s) => sum + s.estimated_cost, 0);

  const totalEstimated = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/inventory" className="text-blue-600 hover:underline text-sm mb-1 block">
              ← Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Smart Reorder Suggestions</h1>
            <p className="text-gray-600">Based on par levels, usage patterns, and lead times</p>
          </div>
          <button
            disabled={selected.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            Create PO ({selected.size} items)
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">{outOfStock.length}</div>
            <div className="text-sm text-red-700">Out of Stock</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-600">{critical.length}</div>
            <div className="text-sm text-orange-700">Critical Low</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-600">{regular.length}</div>
            <div className="text-sm text-yellow-700">Below Reorder Point</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-3xl font-bold text-gray-900">${totalEstimated.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Est. Reorder Cost</div>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div>
              <span className="font-medium text-blue-800">{selected.size} items selected</span>
              <span className="text-blue-600 ml-2">Total: ${selectedTotal.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-1 text-sm text-blue-600 hover:underline"
              >
                Clear
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Generate Purchase Order
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Reorder Suggestions</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === suggestions.length && suggestions.length > 0}
                onChange={selectAll}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </label>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">All items are adequately stocked</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-center">Current</th>
                    <th className="px-4 py-3 text-center">Par</th>
                    <th className="px-4 py-3 text-center">Order Qty</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-center">Lead Time</th>
                    <th className="px-4 py-3 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suggestions.map((item) => (
                    <tr
                      key={item.item_id}
                      className={`hover:bg-gray-50 ${item.is_out_of_stock ? "bg-red-50" : item.is_critical ? "bg-orange-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(item.item_id)}
                          onChange={() => toggleSelect(item.item_id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.is_out_of_stock && <span className="text-red-600" title="Out of Stock">🚨</span>}
                          {item.is_critical && !item.is_out_of_stock && <span className="text-orange-600" title="Critical">⚡</span>}
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${item.is_out_of_stock ? "text-red-600" : "text-gray-900"}`}>
                          {item.current_qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.par_level}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          defaultValue={item.suggested_order_qty}
                          min={1}
                          className="w-20 border rounded px-2 py-1 text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">{item.supplier || "—"}</td>
                      <td className="px-4 py-3 text-center text-sm">{item.lead_time_days}d</td>
                      <td className="px-4 py-3 text-right font-medium">${item.estimated_cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
