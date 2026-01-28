"use client";

import { useState, useEffect } from "react";

interface FlightLog {
  id: number;
  aircraft_id: number;
  aircraft_tail: string;
  flight_date: string;
  pic_id: number;
  pic_name: string;
  sic_id?: number;
  sic_name?: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  hobbs_start: number;
  hobbs_end: number;
  tach_start: number;
  tach_end: number;
  flight_time: number;
  day_landings: number;
  night_landings: number;
  instrument_time?: number;
  night_time?: number;
  flight_type: string;
  mission_type: string;
  patient_transported: boolean;
  fuel_added?: number;
  oil_added?: number;
  squawks?: string;
  remarks?: string;
  frat_score?: number;
}

const MISSION_TYPES = [
  { id: "scene", name: "Scene Response", icon: "🚨" },
  { id: "interfacility", name: "Interfacility Transfer", icon: "🏥" },
  { id: "training", name: "Training Flight", icon: "📚" },
  { id: "maintenance", name: "Maintenance Flight", icon: "🔧" },
  { id: "positioning", name: "Positioning/Ferry", icon: "✈️" },
  { id: "sar", name: "Search & Rescue", icon: "🔍" },
  { id: "pr", name: "Public Relations", icon: "🎤" },
];

const FLIGHT_TYPES = [
  { id: "vfr_day", name: "VFR Day" },
  { id: "vfr_night", name: "VFR Night" },
  { id: "ifr", name: "IFR" },
  { id: "nvg", name: "NVG" },
];

export default function FlightLogsPage() {
  const [flights, setFlights] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlight, setSelectedFlight] = useState<FlightLog | null>(null);
  const [showNewFlight, setShowNewFlight] = useState(false);
  const [filterAircraft, setFilterAircraft] = useState("all");
  const [filterPilot, setFilterPilot] = useState("all");
  const [filterMission, setFilterMission] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    fetchFlights();
  }, [filterAircraft, filterPilot, filterMission]);

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAircraft !== "all") params.append("aircraft_id", filterAircraft);
      if (filterPilot !== "all") params.append("pic_id", filterPilot);
      if (filterMission !== "all") params.append("mission_type", filterMission);
      const res = await fetch(`/api/hems/aviation/flight-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFlights(data.flights || []);
      }
    } catch (err) {
      console.error("Failed to fetch flights:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalFlightTime = flights.reduce((sum, f) => sum + (f.flight_time || 0), 0);
  const totalLandings = flights.reduce((sum, f) => sum + (f.day_landings || 0) + (f.night_landings || 0), 0);
  const patientsTransported = flights.filter(f => f.patient_transported).length;

  const aircraft = [...new Set(flights.map(f => f.aircraft_tail))];
  const pilots = [...new Set(flights.map(f => f.pic_name))];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-sky-800 to-blue-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✈️</span>
            <div>
              <h1 className="text-2xl font-bold">Flight Logs</h1>
              <p className="text-sky-200 text-sm">Flight Time & Operations Tracking</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewFlight(true)}
            className="px-4 py-2 bg-white text-sky-700 rounded-lg font-medium hover:bg-sky-50 transition-colors"
          >
            + Log Flight
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-sky-500">
            <div className="text-2xl font-bold text-sky-600">{flights.length}</div>
            <div className="text-sm text-gray-600">Total Flights</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{totalFlightTime.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Flight Hours</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{totalLandings}</div>
            <div className="text-sm text-gray-600">Total Landings</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{patientsTransported}</div>
            <div className="text-sm text-gray-600">Patients Transported</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <select
                value={filterAircraft}
                onChange={(e) => setFilterAircraft(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Aircraft</option>
                {aircraft.map(tail => (
                  <option key={tail} value={tail}>{tail}</option>
                ))}
              </select>
              <select
                value={filterPilot}
                onChange={(e) => setFilterPilot(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Pilots</option>
                {pilots.map(pilot => (
                  <option key={pilot} value={pilot}>{pilot}</option>
                ))}
              </select>
              <select
                value={filterMission}
                onChange={(e) => setFilterMission(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Missions</option>
                {MISSION_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aircraft</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PIC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mission</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Flight Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Landings</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">FRAT</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {flights.map(flight => {
                  const mission = MISSION_TYPES.find(m => m.id === flight.mission_type);
                  return (
                    <tr
                      key={flight.id}
                      onClick={() => setSelectedFlight(flight)}
                      className={`hover:bg-sky-50 cursor-pointer ${selectedFlight?.id === flight.id ? "bg-sky-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{new Date(flight.flight_date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{flight.departure_time}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-sky-700">{flight.aircraft_tail}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{flight.pic_name}</div>
                        {flight.sic_name && <div className="text-xs text-gray-500">SIC: {flight.sic_name}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-mono">{flight.departure_airport}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-mono">{flight.arrival_airport}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <span>{mission?.icon}</span>
                          <span>{mission?.name || flight.mission_type}</span>
                        </span>
                        {flight.patient_transported && (
                          <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">PT</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded ${flight.flight_type === "ifr" ? "bg-purple-100 text-purple-700" : flight.flight_type === "vfr_night" || flight.flight_type === "nvg" ? "bg-indigo-100 text-indigo-700" : "bg-green-100 text-green-700"}`}>
                          {FLIGHT_TYPES.find(t => t.id === flight.flight_type)?.name || flight.flight_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{flight.flight_time?.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-sm">
                        <div>Day: {flight.day_landings}</div>
                        {flight.night_landings > 0 && <div className="text-indigo-600">Night: {flight.night_landings}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {flight.frat_score !== undefined && (
                          <span className={`px-2 py-1 rounded font-bold text-sm ${flight.frat_score <= 15 ? "bg-green-100 text-green-700" : flight.frat_score <= 25 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                            {flight.frat_score}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {flights.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-500">
                <span className="text-5xl">✈️</span>
                <p className="mt-4">No flight logs found</p>
              </div>
            )}
          </div>
        </div>

        {selectedFlight && (
          <div className="mt-6 bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-lg">Flight Details - {selectedFlight.aircraft_tail}</h3>
              <button onClick={() => setSelectedFlight(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Hobbs Time</div>
                  <div className="font-mono">
                    <span className="text-gray-500">{selectedFlight.hobbs_start?.toFixed(1)}</span>
                    <span className="mx-2">→</span>
                    <span className="font-bold">{selectedFlight.hobbs_end?.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Tach Time</div>
                  <div className="font-mono">
                    <span className="text-gray-500">{selectedFlight.tach_start?.toFixed(1)}</span>
                    <span className="mx-2">→</span>
                    <span className="font-bold">{selectedFlight.tach_end?.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Instrument Time</div>
                  <div className="font-bold">{selectedFlight.instrument_time?.toFixed(1) || "0.0"}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Night Time</div>
                  <div className="font-bold">{selectedFlight.night_time?.toFixed(1) || "0.0"}h</div>
                </div>
              </div>

              {(selectedFlight.fuel_added || selectedFlight.oil_added) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedFlight.fuel_added && (
                      <div>
                        <span className="text-gray-500">Fuel Added:</span>
                        <span className="ml-2 font-medium">{selectedFlight.fuel_added} gal</span>
                      </div>
                    )}
                    {selectedFlight.oil_added && (
                      <div>
                        <span className="text-gray-500">Oil Added:</span>
                        <span className="ml-2 font-medium">{selectedFlight.oil_added} qt</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedFlight.squawks && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-gray-500 uppercase mb-2">Squawks</div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                    {selectedFlight.squawks}
                  </div>
                </div>
              )}

              {selectedFlight.remarks && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-gray-500 uppercase mb-2">Remarks</div>
                  <div className="text-gray-700">{selectedFlight.remarks}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewFlight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-sky-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-sky-900">Log New Flight</h3>
              <button onClick={() => setShowNewFlight(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aircraft</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>N123HM</option>
                    <option>N456HM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flight Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flight Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {FLIGHT_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIC</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Select pilot...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIC (optional)</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option value="">None</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departure</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg font-mono" placeholder="ICAO" maxLength={4} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dept Time</label>
                  <input type="time" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrival</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg font-mono" placeholder="ICAO" maxLength={4} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arr Time</label>
                  <input type="time" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hobbs Start</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hobbs End</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tach Start</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tach End</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day Landings</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" min="0" defaultValue="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Night Landings</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" min="0" defaultValue="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instrument Time</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Night Time</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mission Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {MISSION_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-red-50 w-full">
                    <input type="checkbox" className="w-5 h-5 rounded" />
                    <span className="text-red-700 font-medium">Patient Transported</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Added (gal)</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Oil Added (qt)</label>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Squawks</label>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Aircraft discrepancies or maintenance items" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNewFlight(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium">
                  Save Flight Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
