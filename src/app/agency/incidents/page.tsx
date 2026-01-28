"use client"

import { useState } from "react"
import Link from "next/link"
import { AgencyNavigation, ClaimStatusBadge } from "@/components/agency"

interface Incident {
  id: string
  incidentId: string
  dateOfService: string
  pickupLocation: string
  destination: string
  transportType: string
  unit: string
  claimStatus: "Preparing Claim" | "Waiting on Documentation" | "Submitted to Payer" | "Payer Reviewing" | "Paid"
}

const mockIncidents: Incident[] = [
  {
    id: "1",
    incidentId: "INC-2024-001234",
    dateOfService: "2024-01-15",
    pickupLocation: "123 Main St, Madison, WI",
    destination: "UW Hospital",
    transportType: "Emergency",
    unit: "Medic 1",
    claimStatus: "Paid",
  },
  {
    id: "2",
    incidentId: "INC-2024-001235",
    dateOfService: "2024-01-16",
    pickupLocation: "456 Oak Ave, Madison, WI",
    destination: "St. Mary's Hospital",
    transportType: "Non-Emergency",
    unit: "Medic 2",
    claimStatus: "Payer Reviewing",
  },
  {
    id: "3",
    incidentId: "INC-2024-001236",
    dateOfService: "2024-01-17",
    pickupLocation: "789 Pine Dr, Madison, WI",
    destination: "UW Hospital",
    transportType: "Emergency",
    unit: "Medic 3",
    claimStatus: "Waiting on Documentation",
  },
]

export default function IncidentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredIncidents = mockIncidents.filter((incident) => {
    const matchesSearch =
      incident.incidentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.destination.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filterStatus === "all" || incident.claimStatus === filterStatus

    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex min-h-screen bg-black">
      <AgencyNavigation />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Incidents</h1>
            <p className="text-gray-400">
              View all incidents and their claim status
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by incident ID, location, or destination..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Preparing Claim">Preparing Claim</option>
                  <option value="Waiting on Documentation">Waiting on Documentation</option>
                  <option value="Submitted to Payer">Submitted to Payer</option>
                  <option value="Payer Reviewing">Payer Reviewing</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Incident ID
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Date of Service
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Pickup Location
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Transport Type
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Claim Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/agency/incidents/${incident.id}`}
                          className="text-orange-400 hover:text-orange-300 font-medium"
                        >
                          {incident.incidentId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(incident.dateOfService).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {incident.pickupLocation}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {incident.destination}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {incident.transportType}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {incident.unit}
                      </td>
                      <td className="px-6 py-4">
                        <ClaimStatusBadge status={incident.claimStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredIncidents.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No incidents found matching your criteria.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
