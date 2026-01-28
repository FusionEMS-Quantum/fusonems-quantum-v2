"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SupplyKit {
  id: number;
  name: string;
  kit_type: string;
  description: string;
  is_template: boolean;
  total_items: number;
  items_stocked: number;
  items: KitItem[];
}

interface KitItem {
  id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  quantity_required: number;
  quantity_available: number;
  is_critical: boolean;
  is_stocked: boolean;
}

const KIT_TYPES = [
  { value: "airway", label: "Airway Kit", icon: "🫁" },
  { value: "cardiac", label: "Cardiac Kit", icon: "❤️" },
  { value: "trauma", label: "Trauma Kit", icon: "🩸" },
  { value: "iv", label: "IV Kit", icon: "💉" },
  { value: "pediatric", label: "Pediatric Kit", icon: "👶" },
  { value: "obstetric", label: "OB Kit", icon: "🤰" },
  { value: "burn", label: "Burn Kit", icon: "🔥" },
  { value: "respiratory", label: "Respiratory Kit", icon: "💨" },
  { value: "custom", label: "Custom Kit", icon: "📦" },
];

export default function SupplyKitsPage() {
  const [kits, setKits] = useState<SupplyKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKit, setSelectedKit] = useState<SupplyKit | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKit, setNewKit] = useState({ name: "", kit_type: "custom", description: "" });

  useEffect(() => {
    fetch("/api/inventory/supply-kits")
      .then((r) => r.json())
      .then(setKits)
      .finally(() => setLoading(false));
  }, []);

  const loadKitDetails = (kitId: number) => {
    fetch(`/api/inventory/supply-kits/${kitId}`)
      .then((r) => r.json())
      .then(setSelectedKit);
  };

  const getKitIcon = (type: string) => KIT_TYPES.find((t) => t.value === type)?.icon || "📦";

  const getStockStatus = (kit: SupplyKit) => {
    if (!kit.total_items) return { label: "Empty", color: "bg-gray-100 text-gray-800" };
    const pct = (kit.items_stocked / kit.total_items) * 100;
    if (pct === 100) return { label: "Complete", color: "bg-green-100 text-green-800" };
    if (pct >= 80) return { label: "Partial", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Incomplete", color: "bg-red-100 text-red-800" };
  };

  const handleCreateKit = async () => {
    const res = await fetch("/api/inventory/supply-kits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newKit),
    });
    if (res.ok) {
      const created = await res.json();
      setKits([...kits, created]);
      setShowCreateModal(false);
      setNewKit({ name: "", kit_type: "custom", description: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/inventory" className="text-blue-600 hover:underline text-sm mb-1 block">
              ← Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Supply Kit Management</h1>
            <p className="text-gray-600">Pre-configured equipment sets for rapid deployment</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Create Kit
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Supply Kits</h2>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : kits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No kits configured</div>
              ) : (
                <div className="divide-y">
                  {kits.map((kit) => {
                    const status = getStockStatus(kit);
                    return (
                      <button
                        key={kit.id}
                        onClick={() => loadKitDetails(kit.id)}
                        className={`w-full p-4 text-left hover:bg-gray-50 ${selectedKit?.id === kit.id ? "bg-blue-50" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getKitIcon(kit.kit_type)}</span>
                            <div>
                              <div className="font-medium">{kit.name}</div>
                              <div className="text-sm text-gray-500 capitalize">{kit.kit_type.replace("_", " ")}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        {kit.total_items > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>{kit.items_stocked} / {kit.total_items} items</span>
                              <span>{Math.round((kit.items_stocked / kit.total_items) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${kit.items_stocked === kit.total_items ? "bg-green-500" : "bg-yellow-500"}`}
                                style={{ width: `${(kit.items_stocked / kit.total_items) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Quick Create Templates</h3>
              <div className="grid grid-cols-2 gap-2">
                {KIT_TYPES.filter((t) => t.value !== "custom").map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setNewKit({ name: type.label, kit_type: type.value, description: `Standard ${type.label.toLowerCase()}` });
                      setShowCreateModal(true);
                    }}
                    className="p-2 border rounded-lg hover:bg-gray-50 text-left"
                  >
                    <span className="text-xl">{type.icon}</span>
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {selectedKit ? (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getKitIcon(selectedKit.kit_type)}</span>
                      <div>
                        <h2 className="font-semibold text-lg">{selectedKit.name}</h2>
                        <p className="text-sm text-gray-500">{selectedKit.description || "No description"}</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 text-sm text-blue-600 hover:underline">
                      + Add Item
                    </button>
                  </div>
                </div>
                {!selectedKit.items || selectedKit.items.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No items in this kit. Add items to get started.
                  </div>
                ) : (
                  <div className="divide-y">
                    {selectedKit.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 flex items-center justify-between ${!item.is_stocked ? "bg-red-50" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          {item.is_critical && <span className="text-orange-500" title="Critical">⚡</span>}
                          <div>
                            <div className="font-medium">{item.item_name}</div>
                            <div className="text-sm text-gray-500">{item.item_sku}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${item.is_stocked ? "text-green-600" : "text-red-600"}`}>
                            {item.quantity_available} / {item.quantity_required}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.is_stocked ? "In Stock" : "Needs Restock"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex justify-between">
                    <button className="text-sm text-blue-600 hover:underline">Print Checklist</button>
                    <button className="text-sm text-blue-600 hover:underline">Restock All Missing</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select a kit to view details
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Create Supply Kit</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kit Name</label>
                  <input
                    type="text"
                    value={newKit.name}
                    onChange={(e) => setNewKit({ ...newKit, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., ALS Trauma Kit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kit Type</label>
                  <select
                    value={newKit.kit_type}
                    onChange={(e) => setNewKit({ ...newKit, kit_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {KIT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newKit.description}
                    onChange={(e) => setNewKit({ ...newKit, description: e.target.value })}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateKit}
                  disabled={!newKit.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Kit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
