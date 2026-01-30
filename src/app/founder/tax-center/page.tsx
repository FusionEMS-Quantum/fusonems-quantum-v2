
"use client";
import React, { useState } from "react"
import dynamic from "next/dynamic"
import PersonalTaxForm from "./PersonalTaxForm"
const BankCardImportWidget = dynamic(() => import("@/components/founder/BankCardImportWidget"), { ssr: false })
const SpacesUploadWidget = dynamic(() => import("@/components/founder/SpacesUploadWidget"), { ssr: false })
const TaxWorkflowProgress = dynamic(() => import("@/components/founder/TaxWorkflowProgress"), { ssr: false })

export default function TaxCenter() {
  const [personalTaxData, setPersonalTaxData] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [importedTransactions, setImportedTransactions] = useState<any[]>([])

  const handleTransactionsImported = (txns: any[]) => {
    setImportedTransactions(txns)
    setStep(2)
  }

  const handlePersonalSubmit = (data: any) => {
    setPersonalTaxData(data)
    setStep(3)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-900 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-2xl p-8 border border-blue-800">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">Tax Center</h1>
        <p className="mb-6 text-gray-700">Guided Wisconsin EMS/Fire business and personal tax workflow. Review, generate, and e-file your required forms with confidence.</p>
        <TaxWorkflowProgress step={step} />
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Upload Tax Documents</h2>
          <div className="flex gap-4">
            <SpacesUploadWidget orgId="demo-org" bucket="business" />
            <SpacesUploadWidget orgId="demo-org" bucket="personal" />
            <SpacesUploadWidget orgId="demo-org" bucket="family" />
          </div>
        </div>
        {step === 1 && (
          <BankCardImportWidget onTransactionsImported={handleTransactionsImported} />
        )}
        {step === 2 && (
          <PersonalTaxForm onSubmit={handlePersonalSubmit} />
        )}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-green-700 font-bold text-xl">All data saved.</div>
            <p className="text-gray-600">Next: review tax summary and e-file quarterly estimated, 1099, or W-2 from the Founder dashboard Accounting widget, or use the links below.</p>
            <div className="flex flex-wrap gap-3">
              <a href="/founder" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Founder Dashboard</a>
              <a href="/founder#accounting" className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200">Accounting & E-File</a>
            </div>
            <p className="text-sm text-gray-500">E-file API: GET /api/founder/accounting/efile-status, POST /api/founder/accounting/efile/quarterly, /efile/1099-prep, /efile/w2-prep, /efile/file</p>
          </div>
        )}
      </div>
    </div>
  )
}
