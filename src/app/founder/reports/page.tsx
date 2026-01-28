"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { apiFetch } from "@/lib/api"

interface ReportTemplate {
  id: number
  template_name: string
  description: string
  module_scope: string[]
  default_filters: any
  created_at: string
}

interface ReportExecution {
  id: number
  report_name: string
  query_text: string
  modules_queried: string[]
  execution_time_ms: number
  row_count: number
  generated_by: string
  created_at: string
}

export default function NaturalLanguageReportWriter() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [executions, setExecutions] = useState<ReportExecution[]>([])
  const [loading, setLoading] = useState(false)
  const [reportQuery, setReportQuery] = useState("")
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      const [templatesData, executionsData] = await Promise.all([
        apiFetch<ReportTemplate[]>("/api/reports/templates"),
        apiFetch<ReportExecution[]>("/api/reports/executions?limit=10")
      ])
      setTemplates(templatesData)
      setExecutions(executionsData)
    } catch (err) {
      console.error("Failed to fetch report data")
    }
  }

  const handleGenerateReport = async () => {
    if (!reportQuery.trim()) return
    
    setLoading(true)
    try {
      const response = await apiFetch<any>("/api/reports/generate", {
        method: "POST",
        body: JSON.stringify({ query: reportQuery })
      })
      setGeneratedReport(response)
      fetchReportData()
    } catch (err) {
      alert("Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  const useTemplate = (template: ReportTemplate) => {
    setReportQuery(`Generate ${template.template_name} report`)
    setShowTemplates(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
                Natural Language Report Writer
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">Cross-Module AI Report Generation</h2>
              <p className="text-gray-400">
                Ask questions in plain English across ePCR, CAD, Fire, HEMS, Operations, QA/QI, Training, Fleet, Inventory, and Billing modules.
              </p>
            </header>

            {/* Report Query Interface */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Ask a Question</h3>
              <div className="space-y-4">
                <textarea
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[120px]"
                  placeholder="Example questions:
• Show me all cardiac arrests in the last 30 days with response times over 10 minutes
• What is our average response time by station for the last quarter?
• List all refusal calls with QA flags from last month
• Generate a crew performance report for Paramedic Smith in January
• Show billing performance by insurance payer for Q4 2025"
                  value={reportQuery}
                  onChange={(e) => setReportQuery(e.target.value)}
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleGenerateReport}
                    disabled={loading || !reportQuery.trim()}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
                  >
                    {loading ? "Generating Report..." : "Generate Report"}
                  </button>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
                  >
                    {showTemplates ? "Hide Templates" : "Browse Templates"}
                  </button>
                  <button
                    onClick={() => setReportQuery("")}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </section>

            {/* Default Templates */}
            {showTemplates && (
              <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-800">
                  <h3 className="text-xl font-bold text-white">Default Report Templates</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    15+ pre-built report templates across all modules with QA-triggered auto-reports
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {templates.map((template) => (
                    <div key={template.id} className="bg-gray-950 border border-gray-700 rounded-lg p-4 hover:border-orange-500 transition">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-semibold">{template.template_name}</h4>
                        <button
                          onClick={() => useTemplate(template)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition"
                        >
                          Use
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.module_scope.map((module, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
                            {module}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Generated Report Display */}
            {generatedReport && (
              <section className="bg-gray-900 border border-green-800 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Generated Report</h3>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                      Export PDF
                    </button>
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition">
                      Export Excel
                    </button>
                  </div>
                </div>
                <div className="bg-gray-950 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Query: {generatedReport.query_text}</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Modules: {generatedReport.modules_queried.join(", ")} | 
                    Execution Time: {generatedReport.execution_time_ms}ms | 
                    Rows: {generatedReport.row_count}
                  </p>
                  <div className="bg-gray-900 rounded p-4">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap">
                      {JSON.stringify(generatedReport.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {/* Recent Report Executions */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">Recent Report Executions</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Full audit trail of all report generations with query text and performance metrics
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-950 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Report Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Query Text</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Modules</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Execution Time</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Rows</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Generated By</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-400">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((execution) => (
                      <tr key={execution.id} className="border-b border-gray-800 hover:bg-gray-800 transition cursor-pointer">
                        <td className="p-4 text-white font-medium">{execution.report_name}</td>
                        <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{execution.query_text}</td>
                        <td className="p-4 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {execution.modules_queried.slice(0, 2).map((module, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                                {module}
                              </span>
                            ))}
                            {execution.modules_queried.length > 2 && (
                              <span className="text-gray-500 text-xs">+{execution.modules_queried.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-white text-sm">{execution.execution_time_ms}ms</td>
                        <td className="p-4 text-white text-sm">{execution.row_count}</td>
                        <td className="p-4 text-gray-400 text-sm">{execution.generated_by}</td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(execution.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {executions.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No report executions yet. Generate your first report above.</p>
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
