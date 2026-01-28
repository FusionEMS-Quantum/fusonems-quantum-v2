"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type HemsDashboardData = Record<string, any>;

const hemsModules = [
  { href: "/hems/aviation", icon: "🚁", title: "Aviation Compliance", desc: "FAA Part 135 - flight logs, maintenance, pilot currency", color: "#0ea5e9" },
  { href: "/epcr/desktop/hems", icon: "📋", title: "HEMS ePCR", desc: "Air medical patient care documentation", color: "#10b981" },
];

const aviationQuickLinks = [
  { href: "/hems/aviation/flights", label: "Flight Logs", icon: "✈️" },
  { href: "/hems/aviation/maintenance", label: "Maintenance", icon: "🔧" },
  { href: "/hems/aviation/currency", label: "Pilot Currency", icon: "👨‍✈️" },
  { href: "/hems/aviation/checklists", label: "Checklists", icon: "📋" },
  { href: "/hems/aviation/frat", label: "FRAT", icon: "⚠️" },
];

export default function HEMSDashboard() {
  const [data, setData] = useState<HemsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<HemsDashboardData>("/hems/dashboard")
      .then(setData)
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100">
      <div className="bg-gradient-to-r from-sky-800 to-blue-700 px-6 py-5">
        <h1 className="text-3xl font-bold">HEMS Operations</h1>
        <p className="text-sky-200 mt-1">Helicopter Emergency Medical Services & Aviation Compliance</p>
      </div>

      <div className="p-6">
        {loading && <div className="text-gray-400">Loading dashboard...</div>}
        {error && <div className="text-red-400">{error}</div>}

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-sky-500">
              <div className="text-sky-400 text-sm font-medium">Aircraft Available</div>
              <div className="text-3xl font-bold mt-1">{data.aircraft_available || 0}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-green-500">
              <div className="text-green-400 text-sm font-medium">Pilots Current</div>
              <div className="text-3xl font-bold mt-1">{data.pilots_current || 0}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-blue-500">
              <div className="text-blue-400 text-sm font-medium">Flights Today</div>
              <div className="text-3xl font-bold mt-1">{data.flights_today || 0}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-purple-500">
              <div className="text-purple-400 text-sm font-medium">Hours This Month</div>
              <div className="text-3xl font-bold mt-1">{(data.flight_hours_month || 0).toFixed(1)}</div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-100">HEMS Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hemsModules.map(mod => (
              <Link
                key={mod.href}
                href={mod.href}
                className="bg-slate-800 rounded-xl p-6 hover:bg-slate-750 transition-colors border border-slate-700 hover:border-sky-500 group"
              >
                <div className="text-4xl mb-3">{mod.icon}</div>
                <div className="font-bold text-lg text-gray-100 group-hover:text-sky-400">{mod.title}</div>
                <div className="text-sm text-gray-400 mt-1">{mod.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-100">Quick Access - Aviation Compliance</h2>
          <div className="flex flex-wrap gap-3">
            {aviationQuickLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-sky-900/30 border border-slate-700 hover:border-sky-500 transition-colors"
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 bg-sky-900/20 border border-sky-700 rounded-xl">
          <h3 className="font-bold text-sky-400 mb-2">Part 135 Compliance Status</h3>
          <p className="text-sm text-gray-300">
            Aviation compliance tracking includes FAR 135.267 flight/duty time limits, 
            pilot currency requirements, aircraft maintenance intervals, and airworthiness 
            directive tracking. Access the Aviation Compliance module for full details.
          </p>
        </div>
      </div>
    </div>
  );
}
