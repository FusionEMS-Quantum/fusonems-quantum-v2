"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface QACase {
  id: number
  incident_id: number
  incident_number: string
  provider_name: string
  trigger_type: string
  trigger_category: string
  case_opened_date: string
  case_status: string
  qa_score: number | null
  peer_review_assigned: boolean
  education_required: boolean
}

interface QAScore {
  id: number
  case_id: number
  documentation_quality: number
  protocol_compliance: number
  patient_care_quality: number
  safety_adherence: number
  professionalism: number
  overall_score: number
}

interface PeerReview {
  id: number
  case_id: number
  reviewer_name: string
  review_status: string
  findings_summary: string
  education_recommended: boolean
  created_at: string
}

export default function QADashboard() {
  const [cases, setCases] = useState<QACase[]>([])
  const [scores, setScores] = useState<QAScore[]>([])
  const [peerReviews, setPeerReviews] = useState<PeerReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQAData()
    const interval = setInterval(fetchQAData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchQAData = async () => {
    try {
      const [casesData, scoresData, reviewsData] = await Promise.all([
        apiFetch<QACase[]>("/api/qa/cases"),
        apiFetch<QAScore[]>("/api/qa/scores"),
        apiFetch<PeerReview[]>("/api/qa/peer-reviews?limit=10")
      ])
      setCases(casesData)
      setScores(scoresData)
      setPeerReviews(reviewsData)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getTriggerColor = (type: string) => {
    return type === "mandatory" ? "bg-red-700 text-red-300" : "bg-blue-700 text-blue-300"
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-yellow-700 text-yellow-300",
      under_review: "bg-blue-700 text-blue-300",
      peer_review: "bg-purple-700 text-purple-300",
      education_pending: "bg-orange-700 text-orange-300",
      closed: "bg-green-700 text-green-300"
    }
    return colors[status] || colors.open
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400"
    if (score >= 80) return "text-yellow-400"
    return "text-red-400"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <div className="flex items-center justify-center h-screen">
              <p className="text-xl text-gray-400">Loading QA/QI dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const openCases = cases.filter(c => c.case_status === "open" || c.case_status === "under_review")
  const peerReviewCases = cases.filter(c => c.peer_review_assigned)
  const educationPending = cases.filter(c => c.education_required)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold mb-2">
                QA/QI Governance
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Quality Assurance & Peer Review</h2>
              <p className="text-gray-400">
                Non-punitive, improvement-focused QA system with mandatory/optional triggers, 5-component scoring, and peer review workflows.
              </p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-yellow-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Open Cases</p>
                <p className="text-white text-2xl font-bold">{openCases.length}</p>
              </div>
              <div className="bg-gray-900 border border-purple-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Peer Review</p>
                <p className="text-white text-2xl font-bold">{peerReviewCases.length}</p>
              </div>
              <div className="bg-gray-900 border border-orange-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Education Pending</p>
                <p className="text-white text-2xl font-bold">{educationPending.length}</p>
              </div>
              <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Cases</p>
                <p className="text-white text-2xl font-bold">{cases.length}</p>
              </div>
            </div>

            {/* QA Cases */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">QA Cases</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Mandatory triggers: Cardiac arrest, refusals, medication errors, protocols, significant patient complaints. Optional: Response time, transport decisions.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Incident #</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Provider</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Trigger Type</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Category</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">QA Score</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Peer Review</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Education</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((qaCase) => (
                      <tr key={qaCase.id} className="border-b border-gray-800 hover:bg-gray-800 transition cursor-pointer">
                        <td className="p-4 text-white font-mono text-sm">{qaCase.incident_number}</td>
                        <td className="p-4 text-white">{qaCase.provider_name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTriggerColor(qaCase.trigger_type)}`}>
                            {qaCase.trigger_type}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{qaCase.trigger_category.replace('_', ' ')}</td>
                        <td className="p-4">
                          {qaCase.qa_score !== null ? (
                            <span className={`text-sm font-semibold ${getScoreColor(qaCase.qa_score)}`}>
                              {qaCase.qa_score}%
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(qaCase.case_status)}`}>
                            {qaCase.case_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          {qaCase.peer_review_assigned ? (
                            <span className="text-purple-400 text-sm">✓ Assigned</span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {qaCase.education_required ? (
                            <span className="text-orange-400 text-sm">✓ Required</span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(qaCase.case_opened_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cases.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No QA cases found.</p>
                  </div>
                )}
              </div>
            </section>

            {/* QA Scoring Breakdown */}
            {scores.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">QA Scoring Model (5 Components)</h3>
                <div className="space-y-4">
                  {scores.slice(0, 3).map((score) => (
                    <div key={score.id} className="bg-gray-950 border border-gray-700 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 mb-1">Documentation</p>
                          <p className={`font-semibold ${getScoreColor(score.documentation_quality)}`}>
                            {score.documentation_quality}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Protocol</p>
                          <p className={`font-semibold ${getScoreColor(score.protocol_compliance)}`}>
                            {score.protocol_compliance}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Patient Care</p>
                          <p className={`font-semibold ${getScoreColor(score.patient_care_quality)}`}>
                            {score.patient_care_quality}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Safety</p>
                          <p className={`font-semibold ${getScoreColor(score.safety_adherence)}`}>
                            {score.safety_adherence}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Professionalism</p>
                          <p className={`font-semibold ${getScoreColor(score.professionalism)}`}>
                            {score.professionalism}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Overall Score</p>
                          <p className={`text-lg font-bold ${getScoreColor(score.overall_score)}`}>
                            {score.overall_score}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Peer Reviews */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Peer Review Workflow</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Case-specific peer review with outcomes tracking. Protected from reviewers reviewing own cases or immediate crew members.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Reviewer</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Findings Summary</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Education Recommended</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peerReviews.map((review) => (
                      <tr key={review.id} className="border-b border-gray-800">
                        <td className="p-4 text-white">{review.reviewer_name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(review.review_status)}`}>
                            {review.review_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300 text-sm">{review.findings_summary}</td>
                        <td className="p-4">
                          {review.education_recommended ? (
                            <span className="text-orange-400 text-sm">✓ Yes</span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(review.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {peerReviews.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No peer reviews completed yet.</p>
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
