"use client";

import { useState, useEffect } from "react";

interface Pilot {
  id: number;
  name: string;
  employee_id: string;
  certificate_number: string;
  certificate_type: string;
  ratings: string[];
  base_assigned: string;
  status: string;
}

interface CurrencyItem {
  id: number;
  pilot_id: number;
  currency_type: string;
  issue_date: string;
  expiration_date: string;
  status: string;
  notes?: string;
}

interface FlightDutyRecord {
  pilot_id: number;
  date: string;
  flight_time: number;
  duty_time: number;
  rest_time: number;
  rolling_7_day: number;
  rolling_30_day: number;
}

const CURRENCY_TYPES = [
  { id: "medical_first", name: "First Class Medical", icon: "🏥", interval_months: 6 },
  { id: "medical_second", name: "Second Class Medical", icon: "🏥", interval_months: 12 },
  { id: "flight_review", name: "Flight Review (BFR)", icon: "✈️", interval_months: 24 },
  { id: "instrument_proficiency", name: "Instrument Proficiency Check", icon: "🎯", interval_months: 6 },
  { id: "part135_checkride", name: "Part 135 Checkride", icon: "📋", interval_months: 12 },
  { id: "nvg_currency", name: "NVG Currency", icon: "🌙", interval_months: 4 },
  { id: "currency_day", name: "Day Currency (3 T/O)", icon: "☀️", interval_days: 90 },
  { id: "currency_night", name: "Night Currency (3 T/O)", icon: "🌙", interval_days: 90 },
  { id: "hems_training", name: "HEMS Training", icon: "🚁", interval_months: 12 },
  { id: "line_check", name: "Line Check", icon: "✓", interval_months: 12 },
  { id: "recurrent_training", name: "Recurrent Training", icon: "📚", interval_months: 12 },
  { id: "dangerous_goods", name: "Dangerous Goods", icon: "☣️", interval_months: 24 },
];

const CERTIFICATE_TYPES = [
  { id: "atp", name: "Airline Transport Pilot" },
  { id: "commercial", name: "Commercial Pilot" },
  { id: "cfi", name: "Certified Flight Instructor" },
  { id: "cfii", name: "CFI-Instrument" },
];

export default function PilotCurrencyPage() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [currencyItems, setCurrencyItems] = useState<CurrencyItem[]>([]);
  const [dutyRecords, setDutyRecords] = useState<FlightDutyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);
  const [activeTab, setActiveTab] = useState<"currency" | "duty" | "qualifications">("currency");
  const [showAddCurrency, setShowAddCurrency] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pilotsRes, currencyRes] = await Promise.all([
        fetch("/api/hems/aviation/pilots"),
        fetch("/api/hems/aviation/pilot-currency"),
      ]);
      if (pilotsRes.ok) {
        const data = await pilotsRes.json();
        setPilots(data.pilots || []);
        if (data.pilots?.length > 0) {
          setSelectedPilot(data.pilots[0]);
          fetchDutyRecords(data.pilots[0].id);
        }
      }
      if (currencyRes.ok) {
        const data = await currencyRes.json();
        setCurrencyItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch pilot data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDutyRecords = async (pilotId: number) => {
    try {
      const res = await fetch(`/api/hems/aviation/flight-duty/${pilotId}`);
      if (res.ok) {
        const data = await res.json();
        setDutyRecords(data.records || []);
      }
    } catch (err) {
      console.error("Failed to fetch duty records:", err);
    }
  };

  const handleSelectPilot = (pilot: Pilot) => {
    setSelectedPilot(pilot);
    fetchDutyRecords(pilot.id);
  };

  const getDaysUntil = (date: string) => {
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getStatusStyle = (days: number) => {
    if (days < 0) return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "EXPIRED" };
    if (days <= 30) return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", label: `${days}d` };
    if (days <= 60) return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", label: `${days}d` };
    return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", label: `${days}d` };
  };

  const pilotCurrency = currencyItems.filter(c => c.pilot_id === selectedPilot?.id);
  const latestDuty = dutyRecords[0];

  const isPilotCurrent = (pilotId: number) => {
    const items = currencyItems.filter(c => c.pilot_id === pilotId);
    const criticalItems = ["medical_first", "medical_second", "part135_checkride", "flight_review"];
    return criticalItems.every(type => {
      const item = items.find(i => i.currency_type === type);
      return item && getDaysUntil(item.expiration_date) > 0;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👨‍✈️</span>
            <div>
              <h1 className="text-2xl font-bold">Pilot Currency</h1>
              <p className="text-green-100 text-sm">Medical, Checkrides & FAR 135.267 Compliance</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddCurrency(true)}
            className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
          >
            + Add Currency Item
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{pilots.filter(p => isPilotCurrent(p.id)).length}</div>
            <div className="text-sm text-gray-600">Pilots Current</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{pilots.filter(p => !isPilotCurrent(p.id)).length}</div>
            <div className="text-sm text-gray-600">Not Current</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">
              {currencyItems.filter(c => {
                const days = getDaysUntil(c.expiration_date);
                return days > 0 && days <= 30;
              }).length}
            </div>
            <div className="text-sm text-gray-600">Expiring Soon (30d)</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{pilots.length}</div>
            <div className="text-sm text-gray-600">Total Pilots</div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-72 shrink-0">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Flight Crew</h2>
              </div>
              <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                {pilots.map(pilot => {
                  const isCurrent = isPilotCurrent(pilot.id);
                  return (
                    <div
                      key={pilot.id}
                      onClick={() => handleSelectPilot(pilot)}
                      className={`p-4 cursor-pointer hover:bg-green-50 transition-colors ${selectedPilot?.id === pilot.id ? "bg-green-50 border-l-4 border-l-green-500" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{pilot.name}</div>
                          <div className="text-sm text-gray-500">{pilot.employee_id}</div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isCurrent ? "bg-green-500" : "bg-red-500"}`} />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                          {CERTIFICATE_TYPES.find(c => c.id === pilot.certificate_type)?.name || pilot.certificate_type}
                        </span>
                        <span className="text-xs text-gray-500">{pilot.base_assigned}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1">
            {selectedPilot ? (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{selectedPilot.name}</h2>
                      <p className="text-gray-600">
                        {CERTIFICATE_TYPES.find(c => c.id === selectedPilot.certificate_type)?.name} - 
                        {selectedPilot.certificate_number}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold ${isPilotCurrent(selectedPilot.id) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {isPilotCurrent(selectedPilot.id) ? "✓ CURRENT" : "✗ NOT CURRENT"}
                    </div>
                  </div>
                </div>

                <div className="border-b">
                  <div className="flex">
                    {(["currency", "duty", "qualifications"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium capitalize ${activeTab === tab ? "border-b-2 border-green-500 text-green-700 bg-green-50" : "text-gray-600 hover:text-gray-900"}`}
                      >
                        {tab === "duty" ? "Flight/Duty Time" : tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === "currency" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {CURRENCY_TYPES.map(type => {
                        const item = pilotCurrency.find(c => c.currency_type === type.id);
                        const days = item ? getDaysUntil(item.expiration_date) : null;
                        const status = days !== null ? getStatusStyle(days) : null;

                        return (
                          <div
                            key={type.id}
                            className={`p-4 rounded-lg border ${status ? status.border : "border-gray-200"} ${status ? status.bg : "bg-gray-50"}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{type.icon}</span>
                                <span className="font-medium text-gray-900">{type.name}</span>
                              </div>
                              {status && (
                                <span className={`px-2 py-1 rounded text-sm font-bold ${status.text}`}>
                                  {status.label}
                                </span>
                              )}
                            </div>
                            {item ? (
                              <div className="text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Issued:</span>
                                  <span>{new Date(item.issue_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Expires:</span>
                                  <span className="font-medium">{new Date(item.expiration_date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No record</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === "duty" && (
                    <div className="space-y-6">
                      <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                        <h3 className="font-semibold text-sky-900 mb-3">FAR 135.267 Flight Time Limits</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-sm text-gray-500">7-Day Rolling</div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-sky-700">{latestDuty?.rolling_7_day?.toFixed(1) || "0.0"}</span>
                              <span className="text-gray-500">/ 34.0 hrs</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${(latestDuty?.rolling_7_day || 0) > 30 ? "bg-red-500" : (latestDuty?.rolling_7_day || 0) > 25 ? "bg-yellow-500" : "bg-green-500"}`}
                                style={{ width: `${Math.min(((latestDuty?.rolling_7_day || 0) / 34) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-sm text-gray-500">30-Day Rolling</div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-sky-700">{latestDuty?.rolling_30_day?.toFixed(1) || "0.0"}</span>
                              <span className="text-gray-500">/ 120.0 hrs</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${(latestDuty?.rolling_30_day || 0) > 110 ? "bg-red-500" : (latestDuty?.rolling_30_day || 0) > 100 ? "bg-yellow-500" : "bg-green-500"}`}
                                style={{ width: `${Math.min(((latestDuty?.rolling_30_day || 0) / 120) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Recent Flight/Duty Records</h3>
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Flight Time</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Duty Time</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rest</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">7-Day</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">30-Day</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {dutyRecords.slice(0, 14).map((record, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 text-sm font-mono">{record.flight_time?.toFixed(1)}h</td>
                                <td className="px-4 py-2 text-sm font-mono">{record.duty_time?.toFixed(1)}h</td>
                                <td className="px-4 py-2 text-sm font-mono">{record.rest_time?.toFixed(1)}h</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded text-sm font-mono ${record.rolling_7_day > 30 ? "bg-red-100 text-red-700" : "text-gray-700"}`}>
                                    {record.rolling_7_day?.toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded text-sm font-mono ${record.rolling_30_day > 110 ? "bg-red-100 text-red-700" : "text-gray-700"}`}>
                                    {record.rolling_30_day?.toFixed(1)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {dutyRecords.length === 0 && (
                          <div className="p-8 text-center text-gray-500">No duty records</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "qualifications" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Certificate Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-500">Certificate Type</div>
                            <div className="font-medium">{CERTIFICATE_TYPES.find(c => c.id === selectedPilot.certificate_type)?.name}</div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-500">Certificate Number</div>
                            <div className="font-mono font-medium">{selectedPilot.certificate_number}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Ratings & Endorsements</h3>
                        <div className="flex flex-wrap gap-2">
                          {(selectedPilot.ratings || []).map((rating, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {rating}
                            </span>
                          ))}
                          {(!selectedPilot.ratings || selectedPilot.ratings.length === 0) && (
                            <span className="text-gray-500">No ratings on file</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Base Assignment</h3>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="font-medium">{selectedPilot.base_assigned}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <span className="text-6xl">👨‍✈️</span>
                <h3 className="text-xl font-bold text-gray-900 mt-4">Select a Pilot</h3>
                <p className="text-gray-500 mt-2">Choose a pilot from the list to view currency details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddCurrency && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-4 border-b bg-green-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-green-900">Add Currency Item</h3>
              <button onClick={() => setShowAddCurrency(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilot</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  {pilots.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.employee_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Type</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  {CURRENCY_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowAddCurrency(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
