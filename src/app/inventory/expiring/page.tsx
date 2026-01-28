"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ExpiringLot {
  id: number;
  item_id: number;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  unit_cost: number;
  location_name: string;
  item_name: string;
  item_category: string;
  days_until_expiration: number;
  is_expired: boolean;
  value_at_risk: number;
}

export default function ExpiringPage() {
  const [lots, setLots] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    fetch(`/api/inventory/lots/expiring?days=${days}`)
      .then((r) => r.json())
      .then(setLots)
      .finally(() => setLoading(false));
  }, [days]);

  const expired = lots.filter((l) => l.is_expired);
  const expiring30 = lots.filter((l) => !l.is_expired && l.days_until_expiration <= 30);
  const expiring60 = lots.filter((l) => !l.is_expired && l.days_until_expiration > 30 && l.days_until_expiration <= 60);
  const expiring90 = lots.filter((l) => !l.is_expired && l.days_until_expiration > 60);

  const totalValue = lots.reduce((sum, l) => sum + l.value_at_risk, 0);

  const getStatusColor = (lot: ExpiringLot) => {
    if (lot.is_expired) return "bg-red-100 border-red-300";
    if (lot.days_until_expiration <= 30) return "bg-orange-100 border-orange-300";
    if (lot.days_until_expiration <= 60) return "bg-yellow-100 border-yellow-300";
    return "bg-blue-50 border-blue-200";
  };

  const getStatusText = (lot: ExpiringLot) => {
    if (lot.is_expired) return { text: "EXPIRED", color: "text-red-700" };
    if (lot.days_until_expiration <= 7) return { text: `${lot.days_until_expiration}d`, color: "text-red-600 font-bold" };
    if (lot.days_until_expiration <= 30) return { text: `${lot.days_until_expiration}d`, color: "text-orange-600" };
    return { text: `${lot.days_until_expiration}d`, color: "text-gray-600" };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/inventory" className="text-blue-600 hover:underline text-sm mb-1 block">
              ← Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Expiration Management</h1>
            <p className="text-gray-600">FEFO (First Expired, First Out) Tracking</p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="border rounded-lg px-3 py-2"
          >
            <option value={30}>Next 30 Days</option>
            <option value={60}>Next 60 Days</option>
            <option value={90}>Next 90 Days</option>
            <option value={180}>Next 180 Days</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">{expired.length}</div>
            <div className="text-sm text-red-700">Expired</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-600">{expiring30.length}</div>
            <div className="text-sm text-orange-700">Within 30 Days</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-600">{expiring60.length}</div>
            <div className="text-sm text-yellow-700">31-60 Days</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">{expiring90.length}</div>
            <div className="text-sm text-blue-700">61-90 Days</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-3xl font-bold text-gray-900">${totalValue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Value at Risk</div>
          </div>
        </div>

        {expired.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-red-800">EXPIRED - Immediate Action Required</h3>
            </div>
            <div className="space-y-2">
              {expired.map((lot) => (
                <div key={lot.id} className="bg-red-100 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium">{lot.item_name}</div>
                    <div className="text-sm text-red-700">
                      Lot: {lot.lot_number} | Qty: {lot.quantity} | Expired: {new Date(lot.expiration_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-700 font-bold">${lot.value_at_risk.toFixed(2)}</div>
                    <button className="text-xs text-red-600 hover:underline">Mark Disposed</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Expiring Inventory</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : lots.filter((l) => !l.is_expired).length === 0 ? (
            <div className="p-8 text-center text-gray-500">No items expiring in the selected timeframe</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Lot #</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3 text-center">Days Left</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lots.filter((l) => !l.is_expired).map((lot) => {
                    const status = getStatusText(lot);
                    return (
                      <tr key={lot.id} className={`${getStatusColor(lot)} hover:opacity-90`}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{lot.item_name}</div>
                          <div className="text-xs text-gray-500 capitalize">{lot.item_category}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{lot.lot_number}</td>
                        <td className="px-4 py-3 text-sm">{lot.location_name || "Main"}</td>
                        <td className="px-4 py-3 text-center font-bold">{lot.quantity}</td>
                        <td className="px-4 py-3 text-sm">{new Date(lot.expiration_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={status.color}>{status.text}</span>
                        </td>
                        <td className="px-4 py-3 text-right">${lot.value_at_risk.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button className="text-xs text-blue-600 hover:underline">Use First</button>
                            <button className="text-xs text-gray-600 hover:underline">Transfer</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
