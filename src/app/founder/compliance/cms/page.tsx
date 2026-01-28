"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface CMSEnrollment {
  id: number
  provider_name: string
  npi_number: string
  enrollment_status: string
  pecos_enrollment_id: string | null
  enrollment_type: string
  effective_date: string
  revalidation_due_date: string
  medicare_id: string | null
  metadata_last_verified: string
}

export default function CMSPortal() {
  const [enrollments, setEnrollments] = useState<CMSEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [showDisclaimer, setShowDisclaimer] = useState(true)

  useEffect(() => {
    fetchCMSData()
  }, [])

  const fetchCMSData = async () => {
    try {
      const data = await apiFetch<CMSEnrollment[]>("/api/cms/enrollments")
      setEnrollments(data)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isRevalidationDueSoon = (revalidationDate: string) => {
    const revalidation = new Date(revalidationDate)
    const today = new Date()
    const daysUntilRevalidation = Math.floor((revalidation.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilRevalidation <= 90 && daysUntilRevalidation >= 0
  }

  const isOverdue = (revalidationDate: string) => {
    const revalidation = new Date(revalidationDate)
    const today = new Date()
    return revalidation < today
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-700 text-green-300",
      pending: "bg-yellow-700 text-yellow-300",
      deactivated: "bg-red-700 text-red-300",
      revalidation_due: "bg-orange-700 text-orange-300"
    }
    return colors[status] || colors.pending
  }

  if (showDisclaimer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <section className="space-y-6">
              <div className="max-w-3xl mx-auto mt-20">
                <div className="bg-gray-900 border-2 border-blue-700 rounded-lg p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center text-3xl">
                      🏥
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">CMS Enrollment Portal</h2>
                      <p className="text-blue-400 text-sm font-semibold">Medicare Provider Enrollment & Revalidation Tracking</p>
                    </div>
                  </div>

                  <div className="bg-gray-950 border border-gray-700 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4">⚠️ IMPORTANT COMPLIANCE DISCLAIMER ⚠️</h3>
                    <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
                      <p className="font-semibold text-white">
                        This portal is designed to ASSIST, never IMPERSONATE or AUTOMATE compliance activities.
                      </p>
                      <ul className="space-y-2 pl-5">
                        <li className="list-disc">
                          <strong className="text-orange-400">No Credential Storage:</strong> FusionEMS does NOT store CMS usernames, passwords, or PECOS credentials.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">No Automated Submission:</strong> This system cannot and will not submit CMS enrollment applications on your behalf.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">Metadata Only:</strong> We track NPI numbers, enrollment status, and revalidation due dates for monitoring purposes only.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">Human Verification Required:</strong> All CMS enrollment activities must be completed by authorized personnel directly through PECOS and CMS portals.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">Audit Trail:</strong> All portal access and metadata changes are logged with timestamps and user identity.
                        </li>
                      </ul>
                      <p className="font-semibold text-blue-400 mt-4">
                        By proceeding, you acknowledge that you are responsible for all CMS enrollment and revalidation activities and understand that this portal provides tracking assistance only.
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
                    <p className="text-green-300 text-sm">
                      <strong>Helpful Links:</strong>
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-green-400">
                      <li>• PECOS (Provider Enrollment, Chain and Ownership System): <a href="https://pecos.cms.hhs.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">PECOS Portal</a></li>
                      <li>• NPPES (National Plan and Provider Enumeration System): <a href="https://nppes.cms.hhs.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">NPPES Portal</a></li>
                      <li>• Medicare Provider Enrollment Guide: <a href="https://www.cms.gov/medicare/provider-enrollment-and-certification" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">Enrollment Guide</a></li>
                      <li>• Revalidation Requirements: <a href="https://www.cms.gov/medicare/provider-enrollment-and-certification/medicareprovidersupenroll/revalidation" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">Revalidation Info</a></li>
                    </ul>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowDisclaimer(false)}
                      className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition"
                    >
                      I Understand — Proceed to Portal
                    </button>
                    <button
                      onClick={() => window.history.back()}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <div className="flex items-center justify-center h-screen">
              <p className="text-xl text-gray-400">Loading CMS portal...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const revalidationDueSoon = enrollments.filter(e => isRevalidationDueSoon(e.revalidation_due_date))
  const overdue = enrollments.filter(e => isOverdue(e.revalidation_due_date))
  const active = enrollments.filter(e => e.enrollment_status === "active")

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-blue-500 font-semibold mb-2">
                CMS Enrollment Portal
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Medicare Provider Enrollment & Revalidation</h2>
              <p className="text-gray-400">
                Metadata tracking for CMS enrollments with revalidation monitoring. All actions must be completed through PECOS/NPPES portals.
              </p>
            </header>

            {/* Alerts */}
            {(revalidationDueSoon.length > 0 || overdue.length > 0) && (
              <div className="space-y-4 mb-6">
                {overdue.length > 0 && (
                  <div className="bg-red-900/20 border-2 border-red-700 rounded-lg p-4">
                    <p className="text-red-400 font-semibold">⚠️ {overdue.length} provider(s) revalidation overdue. Immediate action required.</p>
                  </div>
                )}
                {revalidationDueSoon.length > 0 && (
                  <div className="bg-yellow-900/20 border-2 border-yellow-700 rounded-lg p-4">
                    <p className="text-yellow-400 font-semibold">⚠️ {revalidationDueSoon.length} provider(s) revalidation due within 90 days.</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-blue-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Enrollments</p>
                <p className="text-white text-2xl font-bold">{enrollments.length}</p>
              </div>
              <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Active</p>
                <p className="text-white text-2xl font-bold">{active.length}</p>
              </div>
              <div className="bg-gray-900 border border-yellow-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Revalidation Due (90d)</p>
                <p className="text-white text-2xl font-bold">{revalidationDueSoon.length}</p>
              </div>
              <div className="bg-gray-900 border border-red-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Overdue</p>
                <p className="text-white text-2xl font-bold">{overdue.length}</p>
              </div>
            </div>

            {/* Enrollments Table */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">CMS Enrollment Tracking</h3>
                    <p className="text-gray-400 text-sm mt-1">Metadata only — no credentials stored</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href="https://pecos.cms.hhs.gov/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                    >
                      PECOS Portal →
                    </a>
                    <a
                      href="https://nppes.cms.hhs.gov/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
                    >
                      NPPES Portal →
                    </a>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Provider Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">NPI Number</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Enrollment Type</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Medicare ID</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Effective Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Revalidation Due</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Last Verified</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className={`border-b border-gray-800 hover:bg-gray-800 transition ${isOverdue(enrollment.revalidation_due_date) ? 'bg-red-900/10' : isRevalidationDueSoon(enrollment.revalidation_due_date) ? 'bg-yellow-900/10' : ''}`}>
                        <td className="p-4 text-white font-semibold">{enrollment.provider_name}</td>
                        <td className="p-4 text-white font-mono text-sm">{enrollment.npi_number}</td>
                        <td className="p-4 text-gray-400 text-sm">{enrollment.enrollment_type}</td>
                        <td className="p-4 text-white font-mono text-sm">{enrollment.medicare_id || "—"}</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(enrollment.effective_date)}</td>
                        <td className="p-4">
                          <span className={`text-sm font-semibold ${isOverdue(enrollment.revalidation_due_date) ? 'text-red-400' : isRevalidationDueSoon(enrollment.revalidation_due_date) ? 'text-yellow-400' : 'text-green-400'}`}>
                            {formatDate(enrollment.revalidation_due_date)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(enrollment.metadata_last_verified)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.enrollment_status)}`}>
                            {enrollment.enrollment_status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {enrollments.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No CMS enrollments tracked yet.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Compliance Notes */}
            <section className="bg-gray-900 border border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Compliance Guidance</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Medicare providers must revalidate enrollment every 5 years through PECOS.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>FusionEMS tracks revalidation due dates and sends reminders 90 days before the deadline.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>All credential management, enrollment, and revalidation must be completed through official CMS portals (PECOS/NPPES) by authorized personnel.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>NPI numbers are managed through NPPES and must be kept current.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Audit logs capture all portal access and metadata updates for compliance documentation.</span>
                </li>
              </ul>
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
