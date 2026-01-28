"use client";

import React, { useState } from "react";

interface ReportsDownloaderProps {
  className?: string;
}

type ReportType = 
  | "incident-summary"
  | "documentation-completeness"
  | "claim-status"
  | "payments"
  | "aging-summary";

type ExportFormat = "csv" | "pdf";

interface ReportOption {
  value: ReportType;
  label: string;
  description: string;
}

const reportOptions: ReportOption[] = [
  {
    value: "incident-summary",
    label: "Incident Summary",
    description: "Operational review and reconciliation",
  },
  {
    value: "documentation-completeness",
    label: "Documentation Completeness",
    description: "Identify documentation bottlenecks",
  },
  {
    value: "claim-status",
    label: "Claim Status",
    description: "Finance oversight and leadership reporting",
  },
  {
    value: "payments",
    label: "Payments & Adjustments",
    description: "Financial tracking and reconciliation",
  },
  {
    value: "aging-summary",
    label: "Aging Summary",
    description: "Executive overview of outstanding claims",
  },
];

export default function ReportsDownloader({ className = "" }: ReportsDownloaderProps) {
  const [reportType, setReportType] = useState<ReportType>("incident-summary");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.append("format", format);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      // Make API call
      const response = await fetch(
        `/api/agency/reports/${reportType}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate report");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `report_${reportType}_${Date.now()}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "An error occurred while downloading the report");
      console.error("Report download error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Set default date range (last 30 days)
  React.useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Download Agency Reports
      </h2>

      {/* Report Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          {reportOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {reportOptions.find((opt) => opt.value === reportType)?.description}
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
      </div>

      {/* Format Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Export Format
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="csv"
              checked={format === "csv"}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="mr-2"
              disabled={loading}
            />
            <span className="text-sm text-gray-700">CSV</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="pdf"
              checked={format === "pdf"}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="mr-2"
              disabled={loading}
            />
            <span className="text-sm text-gray-700">PDF</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={loading || !startDate || !endDate}
        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
          loading || !startDate || !endDate
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating Report...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Report
          </span>
        )}
      </button>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-700">
          <strong>Note:</strong> All report downloads are audit-logged. Reports
          are read-only and contain agency-visible data only.
        </p>
      </div>
    </div>
  );
}
