"use client"

import { use } from "react"
import Link from "next/link"
import {
  AgencyNavigation,
  ClaimStatusBadge,
  DocumentationStatusBadge,
} from "@/components/agency"

interface ClaimDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ClaimDetailPage({ params }: ClaimDetailPageProps) {
  const { id } = use(params)

  const claim = {
    id,
    claimNumber: "CLM-2024-5678",
    incidentId: "INC-2024-001236",
    dateOfService: "2024-01-17",
    status: "Waiting on Documentation" as const,
    patientName: "John Doe",
    patientDOB: "1975-03-15",
    insurancePayer: "Medicare Part B",
    policyNumber: "1234567890A",
    billedAmount: "$1,250.00",
    expectedPayment: "$1,125.00",
    paidToDate: "$0.00",
    documentation: [
      { name: "Patient Care Report (PCR)", status: "Complete" as const },
      { name: "Medical Necessity Form", status: "Under Review" as const },
      {
        name: "Prior Authorization",
        status: "Waiting on Sender" as const,
        helper: "Requested from provider",
      },
      { name: "Hospital Destination Confirmation", status: "Complete" as const },
    ],
    paymentHistory: [
      {
        date: "2024-01-25",
        description: "Claim submitted to Medicare",
        amount: "$0.00",
      },
    ],
    timeline: [
      { date: "2024-01-17 15:45", event: "PCR completed" },
      { date: "2024-01-18 09:30", event: "Claim created" },
      { date: "2024-01-19 11:00", event: "Prior authorization requested" },
      { date: "2024-01-25 14:00", event: "Medical necessity under review" },
    ],
  }

  return (
    <div className="flex min-h-screen bg-black">
      <AgencyNavigation />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/agency/claims"
              className="text-orange-400 hover:text-orange-300 text-sm"
            >
              ← Back to Claims
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {claim.claimNumber}
            </h1>
            <div className="flex items-center gap-3">
              <ClaimStatusBadge status={claim.status} />
              <Link
                href={`/agency/incidents/${claim.id}`}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View Incident {claim.incidentId}
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Claim Information
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Patient Name
                  </div>
                  <div className="text-gray-300">{claim.patientName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Date of Birth
                  </div>
                  <div className="text-gray-300">
                    {new Date(claim.patientDOB).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Insurance Payer
                  </div>
                  <div className="text-gray-300">{claim.insurancePayer}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Policy Number
                  </div>
                  <div className="text-gray-300">{claim.policyNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Date of Service
                  </div>
                  <div className="text-gray-300">
                    {new Date(claim.dateOfService).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Incident ID
                  </div>
                  <div className="text-gray-300">{claim.incidentId}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Financial Summary
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Billed Amount
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {claim.billedAmount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Expected Payment
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {claim.expectedPayment}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Paid to Date
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {claim.paidToDate}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Documentation Completeness
              </h2>
              <div className="space-y-3">
                {claim.documentation.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-gray-300">{doc.name}</span>
                    <DocumentationStatusBadge
                      status={doc.status}
                      helperText={doc.helper}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Payment History
              </h2>
              <div className="space-y-2">
                {claim.paymentHistory.map((payment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                  >
                    <div>
                      <div className="text-gray-300">{payment.description}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(payment.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-white font-semibold">
                      {payment.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Status Timeline
              </h2>
              <div className="space-y-4">
                {claim.timeline.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      {idx < claim.timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-700 mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="text-gray-300">{item.event}</div>
                      <div className="text-xs text-gray-500">{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
