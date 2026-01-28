"use client";

import { useState, useEffect } from "react";

interface Aircraft {
  id: number;
  tail_number: string;
  make: string;
  model: string;
  year: number;
  serial_number: string;
  total_time: number;
  status: string;
}

interface MaintenanceRecord {
  id: number;
  aircraft_id: number;
  maintenance_type: string;
  description: string;
  performed_date: string;
  performed_by: string;
  hobbs_at_maintenance: number;
  tach_at_maintenance: number;
  next_due_hours?: number;
  next_due_date?: string;
  parts_replaced: string[];
  work_order_number: string;
  cost: number;
  status: string;
}

interface AirworthinessDirective {
  id: number;
  aircraft_id: number;
  ad_number: string;
  title: string;
  effective_date: string;
  compliance_method: string;
  compliance_due: string;
  compliance_status: string;
  last_complied_date?: string;
  next_due_date?: string;
  next_due_hours?: number;
  recurring: boolean;
  notes: string;
}

const MAINTENANCE_TYPES = [
  { id: "100_hour", name: "100-Hour Inspection", interval_hours: 100 },
  { id: "annual", name: "Annual Inspection", interval_days: 365 },
  { id: "progressive", name: "Progressive Inspection", interval_hours: 50 },
  { id: "engine_overhaul", name: "Engine Overhaul", interval_hours: 2000 },
  { id: "transmission", name: "Transmission Service", interval_hours: 500 },
  { id: "main_rotor", name: "Main Rotor Inspection", interval_hours: 100 },
  { id: "tail_rotor", name: "Tail Rotor Inspection", interval_hours: 100 },
  { id: "avionics", name: "Avionics Check", interval_days: 365 },
  { id: "elt_battery", name: "ELT Battery", interval_days: 365 },
  { id: "transponder", name: "Transponder/Altimeter", interval_days: 730 },
  { id: "unscheduled", name: "Unscheduled Maintenance", interval_hours: 0 },
];

export default function AircraftMaintenancePage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [ads, setAds] = useState<AirworthinessDirective[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [activeTab, setActiveTab] = useState<"status" | "maintenance" | "ads">("status");
  const [showNewMaintenance, setShowNewMaintenance] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aircraftRes, maintenanceRes, adsRes] = await Promise.all([
        fetch("/api/hems/aviation/aircraft"),
        fetch("/api/hems/aviation/maintenance"),
        fetch("/api/hems/aviation/airworthiness-directives"),
      ]);
      if (aircraftRes.ok) {
        const data = await aircraftRes.json();
        setAircraft(data.aircraft || []);
        if (data.aircraft?.length > 0) setSelectedAircraft(data.aircraft[0]);
      }
      if (maintenanceRes.ok) {
        const data = await maintenanceRes.json();
        setMaintenance(data.records || []);
      }
      if (adsRes.ok) {
        const data = await adsRes.json();
        setAds(data.ads || []);
      }
    } catch (err) {
      console.error("Failed to fetch maintenance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getHoursUntilDue = (currentHours: number, dueHours?: number) => {
    if (!dueHours) return null;
    return dueHours - currentHours;
  };

  const getDaysUntil = (date?: string) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyStyle = (value: number | null, threshold: number) => {
    if (value === null) return "text-gray-500";
    if (value < 0) return "text-red-600 bg-red-50 font-bold";
    if (value <= threshold) return "text-orange-600 bg-orange-50";
    if (value <= threshold * 2) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const selectedMaintenance = maintenance.filter(m => m.aircraft_id === selectedAircraft?.id);
  const selectedADs = ads.filter(ad => ad.aircraft_id === selectedAircraft?.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-orange-700 to-amber-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔧</span>
            <div>
              <h1 className="text-2xl font-bold">Aircraft Maintenance</h1>
              <p className="text-orange-100 text-sm">Inspections, ADs & Compliance Tracking</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewMaintenance(true)}
            className="px-4 py-2 bg-white text-orange-700 rounded-lg font-medium hover:bg-orange-50 transition-colors"
          >
            + Log Maintenance
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-6">
          <div className="w-64 shrink-0">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Aircraft Fleet</h2>
              </div>
              <div className="divide-y">
                {aircraft.map(ac => (
                  <div
                    key={ac.id}
                    onClick={() => setSelectedAircraft(ac)}
                    className={`p-4 cursor-pointer hover:bg-orange-50 transition-colors ${selectedAircraft?.id === ac.id ? "bg-orange-50 border-l-4 border-l-orange-500" : ""}`}
                  >
                    <div className="font-mono font-bold text-lg">{ac.tail_number}</div>
                    <div className="text-sm text-gray-600">{ac.make} {ac.model}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {ac.total_time?.toFixed(1)} hours
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${ac.status === "airworthy" ? "bg-green-100 text-green-700" : ac.status === "maintenance" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                      {ac.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1">
            {selectedAircraft ? (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{selectedAircraft.tail_number}</h2>
                      <p className="text-gray-600">{selectedAircraft.year} {selectedAircraft.make} {selectedAircraft.model}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total Time</div>
                      <div className="text-2xl font-mono font-bold">{selectedAircraft.total_time?.toFixed(1)}</div>
                    </div>
                  </div>
                </div>

                <div className="border-b">
                  <div className="flex">
                    {(["status", "maintenance", "ads"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium uppercase ${activeTab === tab ? "border-b-2 border-orange-500 text-orange-700 bg-orange-50" : "text-gray-600 hover:text-gray-900"}`}
                      >
                        {tab === "ads" ? "Airworthiness Directives" : tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === "status" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {MAINTENANCE_TYPES.slice(0, 8).map(type => {
                          const record = selectedMaintenance
                            .filter(m => m.maintenance_type === type.id)
                            .sort((a, b) => new Date(b.performed_date).getTime() - new Date(a.performed_date).getTime())[0];
                          const hoursRemaining = record?.next_due_hours ? getHoursUntilDue(selectedAircraft.total_time, record.next_due_hours) : null;
                          const daysRemaining = record?.next_due_date ? getDaysUntil(record.next_due_date) : null;

                          return (
                            <div key={type.id} className="border rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-700 mb-2">{type.name}</div>
                              {record ? (
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Last: {new Date(record.performed_date).toLocaleDateString()}
                                  </div>
                                  {hoursRemaining !== null && (
                                    <div className={`text-sm font-medium mt-1 px-2 py-0.5 rounded inline-block ${getUrgencyStyle(hoursRemaining, 10)}`}>
                                      {hoursRemaining < 0 ? `${Math.abs(hoursRemaining).toFixed(1)}h OVERDUE` : `${hoursRemaining.toFixed(1)}h remaining`}
                                    </div>
                                  )}
                                  {daysRemaining !== null && (
                                    <div className={`text-sm font-medium mt-1 px-2 py-0.5 rounded inline-block ${getUrgencyStyle(daysRemaining, 30)}`}>
                                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d OVERDUE` : `${daysRemaining}d remaining`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400">No records</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Upcoming Maintenance</h3>
                        <div className="space-y-2">
                          {selectedMaintenance
                            .filter(m => m.next_due_hours || m.next_due_date)
                            .sort((a, b) => {
                              const aUrgency = a.next_due_hours ? a.next_due_hours - selectedAircraft.total_time : (a.next_due_date ? getDaysUntil(a.next_due_date) || 999 : 999);
                              const bUrgency = b.next_due_hours ? b.next_due_hours - selectedAircraft.total_time : (b.next_due_date ? getDaysUntil(b.next_due_date) || 999 : 999);
                              return aUrgency - bUrgency;
                            })
                            .slice(0, 5)
                            .map(m => {
                              const type = MAINTENANCE_TYPES.find(t => t.id === m.maintenance_type);
                              const hoursRemaining = m.next_due_hours ? getHoursUntilDue(selectedAircraft.total_time, m.next_due_hours) : null;
                              const daysRemaining = m.next_due_date ? getDaysUntil(m.next_due_date) : null;
                              return (
                                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <div className="font-medium">{type?.name || m.maintenance_type}</div>
                                    <div className="text-sm text-gray-500">{m.description}</div>
                                  </div>
                                  <div className="text-right">
                                    {hoursRemaining !== null && (
                                      <div className={`text-sm font-medium px-2 py-0.5 rounded ${getUrgencyStyle(hoursRemaining, 10)}`}>
                                        {hoursRemaining < 0 ? "OVERDUE" : `${hoursRemaining.toFixed(1)}h`}
                                      </div>
                                    )}
                                    {daysRemaining !== null && (
                                      <div className={`text-sm font-medium px-2 py-0.5 rounded mt-1 ${getUrgencyStyle(daysRemaining, 30)}`}>
                                        {daysRemaining < 0 ? "OVERDUE" : `${daysRemaining}d`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "maintenance" && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Performed By</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Next Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedMaintenance.map(m => {
                            const type = MAINTENANCE_TYPES.find(t => t.id === m.maintenance_type);
                            return (
                              <tr key={m.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{new Date(m.performed_date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-sm font-medium">{type?.name || m.maintenance_type}</td>
                                <td className="px-4 py-3 text-sm">{m.description}</td>
                                <td className="px-4 py-3 text-sm">{m.performed_by}</td>
                                <td className="px-4 py-3 text-sm font-mono">{m.hobbs_at_maintenance?.toFixed(1)}</td>
                                <td className="px-4 py-3 text-sm">
                                  {m.next_due_hours && <div className="font-mono">{m.next_due_hours.toFixed(1)}h</div>}
                                  {m.next_due_date && <div>{new Date(m.next_due_date).toLocaleDateString()}</div>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {selectedMaintenance.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No maintenance records</div>
                      )}
                    </div>
                  )}

                  {activeTab === "ads" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <span className="text-xl">⚠️</span>
                          <span className="font-medium">Airworthiness Directives require mandatory compliance per FAR 39</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">AD Number</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Compliance</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Next Due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {selectedADs.map(ad => {
                              const daysRemaining = ad.next_due_date ? getDaysUntil(ad.next_due_date) : null;
                              const hoursRemaining = ad.next_due_hours ? getHoursUntilDue(selectedAircraft.total_time, ad.next_due_hours) : null;
                              return (
                                <tr key={ad.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="font-mono font-medium">{ad.ad_number}</div>
                                    {ad.recurring && (
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Recurring</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">{ad.title}</td>
                                  <td className="px-4 py-3 text-sm">{ad.compliance_method}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${ad.compliance_status === "complied" ? "bg-green-100 text-green-700" : ad.compliance_status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                      {ad.compliance_status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {hoursRemaining !== null && (
                                      <div className={`text-sm font-medium px-2 py-0.5 rounded inline-block ${getUrgencyStyle(hoursRemaining, 10)}`}>
                                        {hoursRemaining.toFixed(1)}h
                                      </div>
                                    )}
                                    {daysRemaining !== null && (
                                      <div className={`text-sm font-medium px-2 py-0.5 rounded inline-block ${getUrgencyStyle(daysRemaining, 30)}`}>
                                        {daysRemaining}d
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {selectedADs.length === 0 && (
                          <div className="p-8 text-center text-gray-500">No ADs on record</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <span className="text-6xl">🚁</span>
                <h3 className="text-xl font-bold text-gray-900 mt-4">Select an Aircraft</h3>
                <p className="text-gray-500 mt-2">Choose an aircraft from the list to view maintenance details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewMaintenance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-orange-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-orange-900">Log Maintenance</h3>
              <button onClick={() => setShowNewMaintenance(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aircraft</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {aircraft.map(ac => (
                      <option key={ac.id} value={ac.id}>{ac.tail_number} - {ac.make} {ac.model}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {MAINTENANCE_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Performed</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Order #</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hobbs at Service</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tach at Service</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Performed By</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="IA/A&P name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" placeholder="$" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parts Replaced</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Comma separated list" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Due (Hours)</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Due (Date)</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNewMaintenance(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
