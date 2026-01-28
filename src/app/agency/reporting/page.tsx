"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface KnowledgeArticle {
  id: number
  title: string
  topic_category: string
  content_summary: string
  view_count: number
  helpful_count: number
  last_updated: string
  created_at: string
}

interface FAQ {
  id: number
  question: string
  answer: string
  category: string
  view_count: number
  deflection_score: number
}

interface MonthlyReport {
  id: number
  report_month: string
  agency_id: number | null
  agency_name: string | null
  total_statements: number
  total_collected: number
  collection_rate: number
  avg_days_to_payment: number
  generated_at: string
}

export default function AgencyReportingDashboard() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTopic, setSelectedTopic] = useState("all")

  useEffect(() => {
    fetchReportingData()
  }, [])

  const fetchReportingData = async () => {
    try {
      const [articlesData, faqsData, reportsData] = await Promise.all([
        apiFetch<KnowledgeArticle[]>("/api/agency-reporting/knowledge-articles"),
        apiFetch<FAQ[]>("/api/agency-reporting/faqs"),
        apiFetch<MonthlyReport[]>("/api/agency-reporting/monthly-reports?limit=6")
      ])
      setArticles(articlesData)
      setFaqs(faqsData)
      setReports(reportsData)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const topics = ["all", "billing_basics", "payment_plans", "insurance", "collections", "portal_usage", "reporting", "compliance", "troubleshooting", "integration"]
  
  const filteredArticles = articles.filter(article => {
    const matchesTopic = selectedTopic === "all" || article.topic_category === selectedTopic
    const matchesSearch = searchQuery === "" || article.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTopic && matchesSearch
  })

  const filteredFAQs = faqs.filter(faq => {
    return searchQuery === "" || faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-6">
            <div className="flex items-center justify-center h-screen">
              <p className="text-xl text-gray-400">Loading agency reporting...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-64">
        <Topbar />
        <div className="p-6">
          <section className="space-y-6">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold mb-2">
                Agency Reporting & Documentation
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Self-Service Knowledge Center</h2>
              <p className="text-gray-400">
                9-topic knowledge center, searchable FAQs, monthly auto-generated reports, and AI-powered deflection.
              </p>
            </header>

            {/* Search Bar */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search articles, FAQs, or ask a question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
                <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition">
                  Search
                </button>
              </div>
            </section>

            {/* Topic Filter */}
            <section className="mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      selectedTopic === topic
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {topic.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </section>

            {/* Knowledge Articles */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Knowledge Center Articles</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Comprehensive documentation across 9 topics with AI-suggested next reads
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="bg-gray-950 border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-semibold text-lg">{article.title}</h4>
                      <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
                        {article.topic_category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{article.content_summary}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{article.view_count} views • {article.helpful_count} helpful</span>
                      <span>Updated {formatDate(article.last_updated)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {filteredArticles.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-gray-400">No articles found matching your search.</p>
                </div>
              )}
            </section>

            {/* FAQ Browser */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Frequently Asked Questions</h3>
                <p className="text-gray-400 text-sm mt-1">
                  6 categories with AI deflection scoring: Billing, Payment Plans, Insurance, Portal, Technical, Compliance
                </p>
              </div>
              <div className="divide-y divide-gray-800">
                {filteredFAQs.map((faq) => (
                  <details key={faq.id} className="group">
                    <summary className="p-4 cursor-pointer hover:bg-gray-800 transition flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{faq.question}</h4>
                        <span className="text-xs text-gray-500">{faq.category.replace('_', ' ')} • {faq.view_count} views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {faq.deflection_score >= 0.8 && (
                          <span className="px-2 py-1 bg-green-700 text-green-300 rounded text-xs font-medium">
                            High Deflection
                          </span>
                        )}
                        <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="p-4 bg-gray-950 border-t border-gray-800">
                      <p className="text-gray-300 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
              {filteredFAQs.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-gray-400">No FAQs found matching your search.</p>
                </div>
              )}
            </section>

            {/* Monthly Reports */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Monthly Billing Reports</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Auto-generated monthly performance reports with AI-written executive summaries
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Report Month</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Agency</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Statements Sent</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Total Collected</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Collection Rate</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Avg Days to Payment</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-gray-800 hover:bg-gray-800 transition cursor-pointer">
                        <td className="p-4 text-white font-semibold">{report.report_month}</td>
                        <td className="p-4 text-gray-400">{report.agency_name || "Founder"}</td>
                        <td className="p-4 text-white text-sm">{report.total_statements}</td>
                        <td className="p-4 text-white font-semibold">{formatCurrency(report.total_collected)}</td>
                        <td className="p-4">
                          <span className={`text-sm font-semibold ${report.collection_rate >= 80 ? 'text-green-400' : report.collection_rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {report.collection_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4 text-white text-sm">{report.avg_days_to_payment}d</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(report.generated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No monthly reports available yet.</p>
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
