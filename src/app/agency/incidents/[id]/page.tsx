"use client"

import { use } from "react"
import Link from "next/link"
import {
  AgencyNavigation,
  ClaimStatusBadge,
  DocumentationStatusBadge,
  WhyNotPaidPanel,
} from "@/components/agency"

interface IncidentDetailPageProps {
  params: Promise<{ id: string }>
}

export default function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const { id } = use(params)

  const incident = {
    id,
    incidentId: "INC-2024-001236",
    dateOfService: "2024-01-17",
    pickupLocation: "789 Pine Dr, Madison, WI 53703",
    destination: "UW Hospital, 600 Highland Ave, Madison, WI 53792",
    transportType: "Emergency",
    unit: "Medic 3",
    claimStatus: "Waiting on Documentation" as const,
    patientName: "John Doe",
    chiefComplaint: "Chest pain",
    documentation: [
      { name: "Patient Care Report (PCR)", status: "Complete" as const },
      { name: "Medical Necessity Form", status: "Under Review" as const },
      { name: "Prior Authorization", status: "Waiting on Sender" as const, helper: "Requested from provider" },
      { name: "Hospital Destination Confirmation", status: "Complete" as const },
    ],
    payments: [
      { date: "2024-01-25", description: "Initial claim submission", amount: "$0.00" },
    ],
    timeline: [
      { date: "2024-01-17 14:23", event: "Incident occurred", status: "complete" },
      { date: "2024-01-17 15:45", event: "PCR completed", status: "complete" },
      { date: "2024-01-18 09:30", event: "Claim created", status: "complete" },
      { date: "2024-01-19 11:00", event: "Prior authorization requested", status: "current" },
      { date: "Pending", event: "Claim submission to payer", status: "pending" },
    ],
  }

  return (
    <div className="flex min-h-screen bg-black">
      <AgencyNavigation />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/agency/incidents"
              className="text-orange-400 hover:text-orange-300 text-sm"
            >
              ← Back to Incidents
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {incident.incidentId}
            </h1>
            <div className="flex items-center gap-3">
              <ClaimStatusBadge status={incident.claimStatus} />
              <span className="text-gray-400">
                {new Date(incident.dateOfService).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Incident Overview
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Patient
                    </div>
                    <div className="text-gray-300">{incident.patientName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Chief Complaint
                    </div>
                    <div className="text-gray-300">{incident.chiefComplaint}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Pickup Location
                    </div>
                    <div className="text-gray-300">{incident.pickupLocation}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Destination
                    </div>
                    <div className="text-gray-300">{incident.destination}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Transport Type
                    </div>
                    <div className="text-gray-300">{incident.transportType}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Unit
                    </div>
                    <div className="text-gray-300">{incident.unit}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Documentation Status
                </h2>
                <div className="space-y-3">
                  {incident.documentation.map((doc) => (
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
                  Claim Progress
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Claim Number:</span>
                    <span className="text-white font-mono">CLM-2024-5678</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Billed Amount:</span>
                    <span className="text-white">$1,250.00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Expected Payment:</span>
                    <span className="text-white">$1,125.00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Paid to Date:</span>
                    <span className="text-white">$0.00</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Payments & Adjustments
                </h2>
                <div className="space-y-2">
                  {incident.payments.map((payment, idx) => (
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
                <h2 className="text-2xl font-bold text-white mb-4">Timeline</h2>
                <div className="space-y-4">
                  {incident.timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            item.status === "complete"
                              ? "bg-green-500"
                              : item.status === "current"
                              ? "bg-orange-500"
                              : "bg-gray-600"
                          }`}
                        ></div>
                        {idx < incident.timeline.length - 1 && (
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

            <div className="lg:col-span-1">
              <WhyNotPaidPanel
                currentStep="Waiting for prior authorization from ordering physician"
                whatsNeeded="Prior authorization form must be completed and signed by the ordering physician"
                whoIsResponsible="FusionEMS billing team is actively following up with the provider's office"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
