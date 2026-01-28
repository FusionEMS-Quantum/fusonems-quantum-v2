"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ControlledItem {
  id: number;
  name: string;
  dea_schedule: string;
  quantity_on_hand: number;
  par_level: number;
  sku: string;
}

interface ControlledLog {
  id: number;
  item_id: number;
  transaction_type: string;
  quantity: number;
  balance_before: number;
  balance_after: number;
  employee_name: string;
  witness_name: string;
  patient_id: number | null;
  incident_id: number | null;
  waste_amount: number;
  waste_reason: string;
  discrepancy_noted: boolean;
  notes: string;
  created_at: string;
}

const TRANSACTION_TYPES = [
  { value: "receive", label: "Receive", icon: "📥", color: "bg-green-100 text-green-800" },
  { value: "administer", label: "Administer", icon: "💉", color: "bg-blue-100 text-blue-800" },
  { value: "waste", label: "Waste", icon: "🗑️", color: "bg-yellow-100 text-yellow-800" },
  { value: "transfer_out", label: "Transfer Out", icon: "📤", color: "bg-orange-100 text-orange-800" },
  { value: "transfer_in", label: "Transfer In", icon: "📥", color: "bg-teal-100 text-teal-800" },
  { value: "count", label: "Count/Verify", icon: "📋", color: "bg-gray-100 text-gray-800" },
];

export default function ControlledSubstancesPage() {
  const [items, setItems] = useState<ControlledItem[]>([]);
  const [logs, setLogs] = useState<ControlledLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    item_id: 0,
    transaction_type: "administer",
    quantity: 1,
    patient_id: "",
    incident_id: "",
    witness_name: "",
    witness_signature: "",
    waste_amount: 0,
    waste_reason: "",
    notes: "",
    signature: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/controlled").then((r) => r.json()),
      fetch("/api/inventory/controlled/logs?limit=50").then((r) => r.json()),
    ])
      .then(([itemsData, logsData]) => {
        setItems(itemsData);
        setLogs(logsData);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadLogs = (itemId?: number) => {
    const url = itemId
      ? `/api/inventory/controlled/logs?item_id=${itemId}&limit=50`
      : "/api/inventory/controlled/logs?limit=50";
    fetch(url)
      .then((r) => r.json())
      .then(setLogs);
  };

  const getScheduleColor = (schedule: string) => {
    switch (schedule) {
      case "II":
        return "bg-red-100 text-red-800 border-red-300";
      case "III":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "IV":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "V":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openLogModal = (itemId: number, type: string) => {
    setLogForm({ ...logForm, item_id: itemId, transaction_type: type });
    setShowLogModal(true);
  };

  const handleSubmitLog = async () => {
    if (!logForm.signature) {
      alert("Signature required");
      return;
    }
    if (["administer", "waste"].includes(logForm.transaction_type) && !logForm.witness_signature) {
      const item = items.find((i) => i.id === logForm.item_id);
      if (item && ["II", "III"].includes(item.dea_schedule)) {
        alert("Witness signature required for Schedule II/III substances");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/controlled/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: logForm.item_id,
          transaction_type: logForm.transaction_type,
          quantity: logForm.quantity,
          patient_id: logForm.patient_id ? parseInt(logForm.patient_id) : null,
          incident_id: logForm.incident_id ? parseInt(logForm.incident_id) : null,
          witness_name: logForm.witness_name,
          witness_signature: logForm.witness_signature,
          waste_amount: logForm.waste_amount,
          waste_reason: logForm.waste_reason,
          notes: logForm.notes,
          signature: logForm.signature,
        }),
      });
      if (res.ok) {
        setShowLogModal(false);
        loadLogs(selectedItem || undefined);
        fetch("/api/inventory/controlled").then((r) => r.json()).then(setItems);
        setLogForm({
          item_id: 0,
          transaction_type: "administer",
          quantity: 1,
          patient_id: "",
          incident_id: "",
          witness_name: "",
          witness_signature: "",
          waste_amount: 0,
          waste_reason: "",
          notes: "",
          signature: "",
        });
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to record transaction");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getItemName = (itemId: number) => items.find((i) => i.id === itemId)?.name || `Item #${itemId}`;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/inventory" className="text-blue-600 hover:underline text-sm mb-1 block">
              ← Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Controlled Substance Management</h1>
            <p className="text-gray-600">DEA-Compliant Tracking and Documentation</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/inventory/controlled/report"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Generate Report
            </Link>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-purple-900">DEA Compliance Requirements</h3>
              <ul className="text-sm text-purple-800 mt-1 space-y-1">
                <li>• All transactions must be documented with employee signature</li>
                <li>• Schedule II/III administration and waste requires witness signature</li>
                <li>• Discrepancies must be reported to supervisor immediately</li>
                <li>• Dual count verification required at shift change</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Controlled Items</h2>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item.id === selectedItem ? null : item.id);
                      loadLogs(item.id === selectedItem ? undefined : item.id);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 ${selectedItem === item.id ? "bg-purple-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.sku}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded border text-xs font-bold ${getScheduleColor(item.dea_schedule)}`}>
                          C-{item.dea_schedule}
                        </span>
                        <div className="mt-1 text-lg font-bold">{item.quantity_on_hand}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {TRANSACTION_TYPES.slice(0, 3).map((t) => (
                        <button
                          key={t.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            openLogModal(item.id, t.value);
                          }}
                          className={`px-2 py-1 rounded text-xs ${t.color}`}
                        >
                          {t.icon}
                        </button>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">
                  Transaction Log {selectedItem && `- ${getItemName(selectedItem)}`}
                </h2>
                {selectedItem && (
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      loadLogs();
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Show All
                  </button>
                )}
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No transactions recorded</div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {logs.map((log) => {
                    const type = TRANSACTION_TYPES.find((t) => t.value === log.transaction_type);
                    return (
                      <div key={log.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${type?.color || "bg-gray-100"}`}>
                              {type?.icon} {type?.label || log.transaction_type}
                            </span>
                            <div>
                              <div className="font-medium">{getItemName(log.item_id)}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {["receive", "transfer_in"].includes(log.transaction_type) ? "+" : "-"}
                              {log.quantity}
                            </div>
                            <div className="text-sm text-gray-500">
                              Balance: {log.balance_after}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-400">By:</span> {log.employee_name}
                          </div>
                          {log.witness_name && (
                            <div>
                              <span className="text-gray-400">Witness:</span> {log.witness_name}
                            </div>
                          )}
                          {log.patient_id && (
                            <div>
                              <span className="text-gray-400">Patient:</span> #{log.patient_id}
                            </div>
                          )}
                          {log.incident_id && (
                            <div>
                              <span className="text-gray-400">Incident:</span> #{log.incident_id}
                            </div>
                          )}
                        </div>
                        {log.waste_reason && (
                          <div className="mt-2 text-sm bg-yellow-50 p-2 rounded">
                            <span className="font-medium">Waste:</span> {log.waste_amount}ml - {log.waste_reason}
                          </div>
                        )}
                        {log.discrepancy_noted && (
                          <div className="mt-2 text-sm bg-red-50 text-red-700 p-2 rounded font-medium">
                            ⚠️ Discrepancy Noted
                          </div>
                        )}
                        {log.notes && (
                          <div className="mt-2 text-sm text-gray-500">{log.notes}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {showLogModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Record Transaction</h3>
                <p className="text-sm text-gray-500">{getItemName(logForm.item_id)}</p>
              </div>
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                  <select
                    value={logForm.transaction_type}
                    onChange={(e) => setLogForm({ ...logForm, transaction_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={logForm.quantity}
                    onChange={(e) => setLogForm({ ...logForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                {logForm.transaction_type === "administer" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
                        <input
                          type="text"
                          value={logForm.patient_id}
                          onChange={(e) => setLogForm({ ...logForm, patient_id: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Incident ID</label>
                        <input
                          type="text"
                          value={logForm.incident_id}
                          onChange={(e) => setLogForm({ ...logForm, incident_id: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </>
                )}

                {logForm.transaction_type === "waste" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waste Amount (ml)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={logForm.waste_amount}
                        onChange={(e) => setLogForm({ ...logForm, waste_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waste Reason</label>
                      <select
                        value={logForm.waste_reason}
                        onChange={(e) => setLogForm({ ...logForm, waste_reason: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select reason...</option>
                        <option value="partial_dose">Partial dose administered</option>
                        <option value="patient_refused">Patient refused</option>
                        <option value="order_changed">Order changed/cancelled</option>
                        <option value="contaminated">Contaminated</option>
                        <option value="expired">Expired</option>
                        <option value="dropped">Dropped/broken</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Signature *</label>
                    <input
                      type="text"
                      value={logForm.signature}
                      onChange={(e) => setLogForm({ ...logForm, signature: e.target.value })}
                      placeholder="Type your full name"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {["administer", "waste"].includes(logForm.transaction_type) && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Witness Required</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Witness Name</label>
                        <input
                          type="text"
                          value={logForm.witness_name}
                          onChange={(e) => setLogForm({ ...logForm, witness_name: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Witness Signature</label>
                        <input
                          type="text"
                          value={logForm.witness_signature}
                          onChange={(e) => setLogForm({ ...logForm, witness_signature: e.target.value })}
                          placeholder="Witness types their full name"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitLog}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? "Recording..." : "Record Transaction"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
