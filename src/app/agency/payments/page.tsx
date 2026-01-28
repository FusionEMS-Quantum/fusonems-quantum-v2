"use client"

import Link from "next/link"
import { AgencyNavigation } from "@/components/agency"

interface Payment {
  id: string
  date: string
  claimNumber: string
  incidentId: string
  paymentMethod: string
  amount: string
  checkNumber?: string
  eraNumber?: string
}

const mockPayments: Payment[] = [
  {
    id: "1",
    date: "2024-01-20",
    claimNumber: "CLM-2024-5676",
    incidentId: "INC-2024-001234",
    paymentMethod: "EFT",
    amount: "$1,500.00",
    eraNumber: "ERA-123456",
  },
  {
    id: "2",
    date: "2024-01-15",
    claimNumber: "CLM-2024-5675",
    incidentId: "INC-2024-001233",
    paymentMethod: "Check",
    amount: "$875.00",
    checkNumber: "CHK-789012",
  },
  {
    id: "3",
    date: "2024-01-10",
    claimNumber: "CLM-2024-5674",
    incidentId: "INC-2024-001232",
    paymentMethod: "EFT",
    amount: "$1,125.00",
    eraNumber: "ERA-123455",
  },
]

export default function PaymentsPage() {
  const totalPayments = mockPayments.reduce((sum, payment) => {
    return sum + parseFloat(payment.amount.replace(/[$,]/g, ""))
  }, 0)

  return (
    <div className="flex min-h-screen bg-black">
      <AgencyNavigation />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Payments</h1>
            <p className="text-gray-400">View your payment history</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="text-xs text-gray-500 uppercase mb-1">
                Total Payments (All Time)
              </div>
              <div className="text-3xl font-bold text-white">
                ${totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="text-xs text-gray-500 uppercase mb-1">
                Payments This Month
              </div>
              <div className="text-3xl font-bold text-white">
                ${totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="text-xs text-gray-500 uppercase mb-1">
                Number of Payments
              </div>
              <div className="text-3xl font-bold text-white">
                {mockPayments.length}
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Claim Number
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Incident ID
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(payment.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/agency/claims/${payment.id}`}
                          className="text-orange-400 hover:text-orange-300"
                        >
                          {payment.claimNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/agency/incidents/${payment.id}`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {payment.incidentId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {payment.paymentMethod}
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                        {payment.checkNumber || payment.eraNumber}
                      </td>
                      <td className="px-6 py-4 text-right text-white font-semibold">
                        {payment.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {mockPayments.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No payments found.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
