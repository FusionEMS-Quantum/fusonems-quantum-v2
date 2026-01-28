"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface DEARegistrant {
  id: number
  provider_name: string
  dea_number: string
  registration_expiration: string
  schedule_authorization: string[]
  business_activity: string
  metadata_last_verified: string
  notes: string
}

export default function DEAPortal() {
  const [registrants, setRegistrants] = useState<DEARegistrant[]>([])
  const [loading, setLoading] = useState(true)
  const [showDisclaimer, setShowDisclaimer] = useState(true)

  useEffect(() => {
    fetchDEAData()
  }, [])

  const fetchDEAData = async () => {
    try {
      const data = await apiFetch<DEARegistrant[]>("/api/dea/registrants")
      setRegistrants(data)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isExpiringSoon = (expirationDate: string) => {
    const expiration = new Date(expirationDate)
    const today = new Date()
    const daysUntilExpiration = Math.floor((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiration <= 90 && daysUntilExpiration >= 0
  }

  const isExpired = (expirationDate: string) => {
    const expiration = new Date(expirationDate)
    const today = new Date()
    return expiration < today
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
                <div className="bg-gray-900 border-2 border-red-700 rounded-lg p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-red-700 rounded-full flex items-center justify-center text-3xl">
                      ⚠️
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">DEA Compliance Portal</h2>
                      <p className="text-red-400 text-sm font-semibold">Controlled Substance Registration Management</p>
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
                          <strong className="text-orange-400">No Credential Storage:</strong> FusionEMS does NOT store DEA usernames, passwords, or credentials.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">No Automated Submission:</strong> This system cannot and will not submit DEA applications on your behalf.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">Metadata Only:</strong> We track registration numbers, expiration dates, and schedules for monitoring purposes only.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">Human Verification Required:</strong> All DEA activities must be completed by authorized personnel directly on DEA.gov.
                        </li>
                        <li className="list-disc">
                          <strong className="text-orange-400">Audit Trail:</strong> All portal access and metadata changes are logged with timestamps and user identity.
                        </li>
                      </ul>
                      <p className="font-semibold text-red-400 mt-4">
                        By proceeding, you acknowledge that you are responsible for all DEA compliance activities and understand that this portal provides tracking assistance only.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
                    <p className="text-blue-300 text-sm">
                      <strong>Helpful Links:</strong>
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-blue-400">
                      <li>• DEA Registration Portal: <a href="https://www.deadiversion.usdoj.gov/drugreg/index.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">DEA.gov</a></li>
                      <li>• DEA Renewal Guide: <a href="https://www.dea.gov/registration-renewal" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Renewal Instructions</a></li>
                      <li>• Controlled Substance Schedules: <a href="https://www.dea.gov/drug-information/drug-scheduling" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Schedule Information</a></li>
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
              <p className="text-xl text-gray-400">Loading DEA portal...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const expiringSoon = registrants.filter(r => isExpiringSoon(r.registration_expiration))
  const expired = registrants.filter(r => isExpired(r.registration_expiration))

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-red-500 font-semibold mb-2">
                DEA Compliance Portal
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Controlled Substance Registration Tracking</h2>
              <p className="text-gray-400">
                Metadata tracking for DEA registrations with expiration monitoring. All actions must be completed on DEA.gov.
              </p>
            </header>

            {/* Alerts */}
            {(expiringSoon.length > 0 || expired.length > 0) && (
              <div className="space-y-4 mb-6">
                {expired.length > 0 && (
                  <div className="bg-red-900/20 border-2 border-red-700 rounded-lg p-4">
                    <p className="text-red-400 font-semibold">⚠️ {expired.length} DEA registration(s) expired. Immediate action required.</p>
                  </div>
                )}
                {expiringSoon.length > 0 && (
                  <div className="bg-yellow-900/20 border-2 border-yellow-700 rounded-lg p-4">
                    <p className="text-yellow-400 font-semibold">⚠️ {expiringSoon.length} DEA registration(s) expiring within 90 days.</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-blue-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Registrants</p>
                <p className="text-white text-2xl font-bold">{registrants.length}</p>
              </div>
              <div className="bg-gray-900 border border-yellow-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Expiring Soon (90d)</p>
                <p className="text-white text-2xl font-bold">{expiringSoon.length}</p>
              </div>
              <div className="bg-gray-900 border border-red-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Expired</p>
                <p className="text-white text-2xl font-bold">{expired.length}</p>
              </div>
              <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Active</p>
                <p className="text-white text-2xl font-bold">{registrants.filter(r => !isExpired(r.registration_expiration)).length}</p>
              </div>
            </div>

            {/* Registrants Table */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">DEA Registrant Tracking</h3>
                    <p className="text-gray-400 text-sm mt-1">Metadata only — no credentials stored</p>
                  </div>
                  <a
                    href="https://www.deadiversion.usdoj.gov/drugreg/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    Go to DEA.gov →
                  </a>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Provider Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">DEA Number</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Expiration Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Schedule Authorization</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Business Activity</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Last Verified</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrants.map((registrant) => (
                      <tr key={registrant.id} className={`border-b border-gray-800 hover:bg-gray-800 transition ${isExpired(registrant.registration_expiration) ? 'bg-red-900/10' : isExpiringSoon(registrant.registration_expiration) ? 'bg-yellow-900/10' : ''}`}>
                        <td className="p-4 text-white font-semibold">{registrant.provider_name}</td>
                        <td className="p-4 text-white font-mono text-sm">{registrant.dea_number}</td>
                        <td className="p-4">
                          <span className={`text-sm font-semibold ${isExpired(registrant.registration_expiration) ? 'text-red-400' : isExpiringSoon(registrant.registration_expiration) ? 'text-yellow-400' : 'text-green-400'}`}>
                            {formatDate(registrant.registration_expiration)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {registrant.schedule_authorization.map((schedule, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                                {schedule}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{registrant.business_activity}</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(registrant.metadata_last_verified)}</td>
                        <td className="p-4">
                          {isExpired(registrant.registration_expiration) ? (
                            <span className="px-2 py-1 bg-red-700 text-red-300 rounded text-xs font-medium">EXPIRED</span>
                          ) : isExpiringSoon(registrant.registration_expiration) ? (
                            <span className="px-2 py-1 bg-yellow-700 text-yellow-300 rounded text-xs font-medium">EXPIRING SOON</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-700 text-green-300 rounded text-xs font-medium">ACTIVE</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {registrants.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No DEA registrants tracked yet.</p>
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
                  <span>DEA registrations must be renewed every 3 years through the official DEA portal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>FusionEMS tracks expiration dates and sends reminders 90 days before expiration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>All credential management and application submission must be completed on DEA.gov by authorized personnel.</span>
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
