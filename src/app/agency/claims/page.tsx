"use client"

import { useState } from "react"
import Link from "next/link"
import { AgencyNavigation, ClaimStatusBadge } from "@/components/agency"
import type { ClaimStatus } from "@/components/agency"

interface Claim {
  id: string
  claimNumber: string
  incidentId: string
  dateOfService: string
  patientName: string
  billedAmount: string
  paidAmount: string
  status: ClaimStatus
}

const mockClaims: Claim[] = [
  {
    id: "1",
    claimNumber: "CLM-2024-5678",
    incidentId: "INC-2024-001236",
    dateOfService: "2024-01-17",
    patientName: "John Doe",
    billedAmount: "$1,250.00",
    paidAmount: "$0.00",
    status: "Waiting on Documentation",
  },
  {
    id: "2",
    claimNumber: "CLM-2024-5677",
    incidentId: "INC-2024-001235",
    dateOfService: "2024-01-16",
    patientName: "Jane Smith",
    billedAmount: "$875.00",
    paidAmount: "$0.00",
    status: "Payer Reviewing",
  },
  {
    id: "3",
    claimNumber: "CLM-2024-5676",
    incidentId: "INC-2024-001234",
    dateOfService: "2024-01-15",
    patientName: "Bob Johnson",
    billedAmount: "$1,500.00",
    paidAmount: "$1,500.00",
    status: "Paid",
  },
]

export default function ClaimsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const filteredClaims = mockClaims.filter((claim) => {
    const matchesFilter =
      filterStatus === "all" || claim.status === filterStatus

    const matchesDateRange =
      (!startDate || claim.dateOfService >= startDate) &&
      (!endDate || claim.dateOfService <= endDate)

    return matchesFilter && matchesDateRange
  })

  return (
    <div className="flex min-h-screen bg-black">
      <AgencyNavigation />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Claims</h1>
            <p className="text-gray-400">
              Track all claims and their payment status
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Preparing Claim">Preparing Claim</option>
                  <option value="Waiting on Documentation">
                    Waiting on Documentation
                  </option>
                  <option value="Submitted to Payer">Submitted to Payer</option>
                  <option value="Payer Reviewing">Payer Reviewing</option>
                  <option value="Additional Information Requested">
                    Additional Information Requested
                  </option>
                  <option value="Paid">Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Denied – Under Review">
                    Denied – Under Review
                  </option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Claim Number
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Incident ID
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Date of Service
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Billed
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/agency/claims/${claim.id}`}
                          className="text-orange-400 hover:text-orange-300 font-medium"
                        >
                          {claim.claimNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/agency/incidents/${claim.id}`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {claim.incidentId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(claim.dateOfService).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {claim.patientName}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-300">
                        {claim.billedAmount}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-300">
                        {claim.paidAmount}
                      </td>
                      <td className="px-6 py-4">
                        <ClaimStatusBadge status={claim.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredClaims.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No claims found matching your criteria.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
