"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ComplianceAlert {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  due_date?: string;
  pilot_id?: number;
  aircraft_id?: number;
}

interface DashboardStats {
  total_aircraft: number;
  aircraft_available: number;
  aircraft_maintenance: number;
  total_pilots: number;
  pilots_current: number;
  pilots_due_currency: number;
  flights_today: number;
  flights_month: number;
  flight_hours_month: number;
  pending_frat: number;
  overdue_maintenance: number;
  ads_due: number;
}

export default function HemsAviationDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentFlights, setRecentFlights] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, flightsRes] = await Promise.all([
        fetch("/api/hems/aviation/dashboard/stats"),
        fetch("/api/hems/aviation/compliance-alerts"),
        fetch("/api/hems/aviation/flight-logs?limit=5"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
      if (flightsRes.ok) {
        const data = await flightsRes.json();
        setRecentFlights(data.flights || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { href: "/hems/aviation/flights", icon: "✈️", title: "Flight Logs", desc: "Record and track all flight operations", color: "blue" },
    { href: "/hems/aviation/maintenance", icon: "🔧", title: "Aircraft Maintenance", desc: "100-hour, annual, and AD tracking", color: "orange" },
    { href: "/hems/aviation/currency", icon: "👨‍✈️", title: "Pilot Currency", desc: "Medical, flight review, Part 135 checkrides", color: "green" },
    { href: "/hems/aviation/checklists", icon: "📋", title: "Checklists", desc: "Pre/post-flight and safety checklists", color: "purple" },
    { href: "/hems/aviation/frat", icon: "⚠️", title: "FRAT", desc: "Flight Risk Assessment Tool", color: "red" },
    { href: "/hems/aviation/weather", icon: "🌤️", title: "Weather", desc: "Weather minimums and decision logs", color: "cyan" },
  ];

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 border-red-300 text-red-800";
      case "warning": return "bg-yellow-100 border-yellow-300 text-yellow-800";
      default: return "bg-blue-100 border-blue-300 text-blue-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-sky-800 to-blue-700 text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🚁</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">HEMS Aviation Compliance</h1>
              <p className="text-sky-200 text-sm">FAA Part 135 Operations Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <div className="text-sky-200">Operations Status</div>
              <div className="font-bold text-lg">
                {stats?.aircraft_available || 0}/{stats?.total_aircraft || 0} Aircraft Ready
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full ${(stats?.aircraft_available || 0) > 0 ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          </div>
        </div>
      </div>

      <div className="p-6">
        {alerts.filter(a => a.severity === "critical").length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🚨</span>
              <span className="font-bold text-red-800 text-lg">Critical Compliance Alerts</span>
            </div>
            <div className="space-y-2">
              {alerts.filter(a => a.severity === "critical").map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <span className="font-medium text-red-700">{alert.message}</span>
                  {alert.due_date && (
                    <span className="text-sm text-red-600 font-mono">
                      Due: {new Date(alert.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-sky-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sky-500">🚁</span>
              <span className="text-xs text-gray-500 uppercase">Aircraft</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.aircraft_available || 0}</div>
            <div className="text-sm text-gray-500">of {stats?.total_aircraft || 0} available</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-500">👨‍✈️</span>
              <span className="text-xs text-gray-500 uppercase">Pilots Current</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.pilots_current || 0}</div>
            <div className="text-sm text-gray-500">of {stats?.total_pilots || 0} total</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-500">✈️</span>
              <span className="text-xs text-gray-500 uppercase">Flights Today</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.flights_today || 0}</div>
            <div className="text-sm text-gray-500">{stats?.flights_month || 0} this month</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-purple-500">⏱️</span>
              <span className="text-xs text-gray-500 uppercase">Flight Hours</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{(stats?.flight_hours_month || 0).toFixed(1)}</div>
            <div className="text-sm text-gray-500">this month</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-orange-500">🔧</span>
              <span className="text-xs text-gray-500 uppercase">Maintenance Due</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.overdue_maintenance || 0}</div>
            <div className="text-sm text-gray-500">{stats?.ads_due || 0} ADs due</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-500">⚠️</span>
              <span className="text-xs text-gray-500 uppercase">Pending FRAT</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.pending_frat || 0}</div>
            <div className="text-sm text-gray-500">assessments</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span>📊</span> Aviation Modules
                </h2>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {modules.map(mod => (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    className="p-4 border rounded-xl hover:shadow-md transition-all hover:border-sky-300 group"
                  >
                    <div className="text-3xl mb-2">{mod.icon}</div>
                    <div className="font-semibold text-gray-900 group-hover:text-sky-700">{mod.title}</div>
                    <div className="text-sm text-gray-500">{mod.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span>🔔</span> Compliance Alerts
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityStyle(alert.severity)}`}>
                    <div className="font-medium text-sm">{alert.message}</div>
                    {alert.due_date && (
                      <div className="text-xs mt-1 opacity-75">
                        Due: {new Date(alert.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <span className="text-3xl">✓</span>
                  <p className="mt-2">All compliance items current</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span>✈️</span> Recent Flights
              </h2>
              <Link href="/hems/aviation/flights" className="text-sm text-sky-600 hover:text-sky-800">
                View All →
              </Link>
            </div>
            <div className="divide-y">
              {recentFlights.length > 0 ? (
                recentFlights.map((flight, i) => (
                  <div key={i} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{flight.aircraft_tail || "N/A"}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(flight.flight_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>👨‍✈️ {flight.pic_name}</span>
                      <span>⏱️ {flight.flight_time?.toFixed(1)}h</span>
                      <span>🛬 {flight.landings} landings</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {flight.departure_airport} → {flight.arrival_airport}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No recent flights
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span>📜</span> Part 135 Quick Reference
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                <div className="font-medium text-sky-800">135.267 - Flight Time Limits</div>
                <div className="text-sm text-sky-600 mt-1">
                  • 8 hours flight time per 24 hours<br />
                  • 34 hours flight time per 7 days
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="font-medium text-green-800">135.293 - PIC Qualifications</div>
                <div className="text-sm text-green-600 mt-1">
                  • ATP or Commercial certificate<br />
                  • Current Part 135 checkride<br />
                  • Medical certificate current
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="font-medium text-orange-800">135.411 - Maintenance</div>
                <div className="text-sm text-orange-600 mt-1">
                  • 100-hour inspection required<br />
                  • Annual inspection required<br />
                  • AD compliance mandatory
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="font-medium text-purple-800">135.229 - Weather Minimums</div>
                <div className="text-sm text-purple-600 mt-1">
                  • VFR: 800ft ceiling, 2mi visibility<br />
                  • IFR: Per approach minimums
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
