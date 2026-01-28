"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Vehicle {
  id: number;
  vehicle_id: string;
  call_sign: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: string;
  status: string;
}

interface DVIRStats {
  inspections_today: number;
  inspections_this_week: number;
  inspections_this_month: number;
  defects_pending_correction: number;
  vehicles_out_of_service: number;
}

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<DVIRStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/fleet/vehicles").then((r) => r.json()),
      fetch("/api/fleet/dvir/stats").then((r) => r.json()),
    ])
      .then(([vehicleData, statsData]) => {
        setVehicles(vehicleData);
        setStats(statsData);
      })
      .finally(() => setLoading(false));
  }, []);

  const inService = vehicles.filter((v) => v.status === "in_service").length;
  const outOfService = vehicles.filter((v) => v.status === "out_of_service").length;
  const maintenance = vehicles.filter((v) => v.status === "maintenance").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_service":
        return "bg-green-100 text-green-800";
      case "out_of_service":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "reserve":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.toLowerCase().includes("ambulance")) return "🚑";
    if (type.toLowerCase().includes("engine") || type.toLowerCase() === "als" || type.toLowerCase() === "bls") return "🚒";
    if (type.toLowerCase().includes("ladder")) return "🪜";
    if (type.toLowerCase().includes("rescue")) return "🛻";
    if (type.toLowerCase().includes("chief")) return "🚗";
    if (type.toLowerCase().includes("helicopter")) return "🚁";
    return "🚐";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-gray-600">Vehicle tracking, DVIR, and maintenance</p>
          </div>
          <Link
            href="/fleet/dvir"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Start DVIR Inspection
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-gray-900">{vehicles.length}</div>
            <div className="text-sm text-gray-600">Total Vehicles</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-green-600">{inService}</div>
            <div className="text-sm text-gray-600">In Service</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-red-600">{outOfService}</div>
            <div className="text-sm text-gray-600">Out of Service</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-yellow-600">{maintenance}</div>
            <div className="text-sm text-gray-600">In Maintenance</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-orange-600">{stats?.defects_pending_correction || 0}</div>
            <div className="text-sm text-gray-600">Pending Defects</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Link href="/fleet/dvir" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="font-semibold text-lg">DVIR Inspections</h3>
                <p className="text-gray-600 text-sm">Pre-trip and post-trip vehicle inspections</p>
                <div className="mt-2 text-sm">
                  <span className="text-blue-600 font-medium">{stats?.inspections_today || 0}</span> today
                  <span className="mx-2">|</span>
                  <span className="text-blue-600 font-medium">{stats?.inspections_this_week || 0}</span> this week
                </div>
              </div>
            </div>
          </Link>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🔧</div>
              <div>
                <h3 className="font-semibold text-lg">Maintenance</h3>
                <p className="text-gray-600 text-sm">Scheduled and preventive maintenance</p>
                <div className="mt-2 text-sm">
                  <span className="text-yellow-600 font-medium">{maintenance}</span> in shop
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">⛽</div>
              <div>
                <h3 className="font-semibold text-lg">Fuel Tracking</h3>
                <p className="text-gray-600 text-sm">Fuel consumption and costs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-lg">Fleet Vehicles</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : vehicles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No vehicles found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getTypeIcon(vehicle.vehicle_type)}</span>
                          <div>
                            <div className="font-medium">{vehicle.call_sign || vehicle.vehicle_id}</div>
                            <div className="text-xs text-gray-500">{vehicle.vehicle_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{vehicle.vehicle_type}</td>
                      <td className="px-4 py-3 text-sm">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                          {vehicle.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/fleet/dvir?vehicle=${vehicle.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Start DVIR
                        </Link>
                      </td>
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
