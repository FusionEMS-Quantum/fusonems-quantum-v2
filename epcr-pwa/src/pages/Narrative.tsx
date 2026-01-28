import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { epcr } from '../lib/api'
import type { Narrative, EpcrRecord } from '../types'

export default function NarrativePage() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<EpcrRecord | null>(null)
  const [narratives, setNarratives] = useState<Narrative[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSign, setShowSign] = useState(false)
  const [signature, setSignature] = useState('')

  useEffect(() => {
    if (recordId) loadData()
  }, [recordId])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await epcr.getRecord(recordId!)
      setRecord(res.data)
      setNarratives(res.data.narratives || [])
      const primary = res.data.narratives?.find((n) => n.type === 'primary')
      if (primary) setContent(primary.content)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveNarrative = async () => {
    if (!recordId || !content.trim()) return
    setSaving(true)
    try {
      await epcr.addNarrative(recordId, { content, type: 'primary' })
      await loadData()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const signAndSubmit = async () => {
    if (!recordId || !signature) return
    setSaving(true)
    try {
      await epcr.signRecord(recordId, { role: 'crew', signature })
      await epcr.submitRecord(recordId)
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to submit:', err)
    } finally {
      setSaving(false)
    }
  }

  const generateNarrative = () => {
    if (!record) return
    const parts: string[] = []
    
    parts.push(`Unit ${record.unitId} responded to ${record.dispatchInfo?.complaint || 'a call'}.`)
    
    if (record.patient) {
      const p = record.patient
      parts.push(`Patient is a ${p.age || 'unknown age'} year old ${p.gender || 'individual'}${p.lastName ? ` (${p.lastName}, ${p.firstName})` : ''}.`)
    }
    
    if (record.assessment?.chiefComplaint) {
      parts.push(`Chief complaint: ${record.assessment.chiefComplaint}.`)
      if (record.assessment.historyOfPresentIllness) {
        parts.push(record.assessment.historyOfPresentIllness)
      }
    }
    
    if (record.vitals && record.vitals.length > 0) {
      const v = record.vitals[0]
      const vitalsStr = []
      if (v.bloodPressureSystolic) vitalsStr.push(`BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`)
      if (v.heartRate) vitalsStr.push(`HR ${v.heartRate}`)
      if (v.respiratoryRate) vitalsStr.push(`RR ${v.respiratoryRate}`)
      if (v.pulseOximetry) vitalsStr.push(`SpO2 ${v.pulseOximetry}%`)
      if (vitalsStr.length > 0) {
        parts.push(`Initial vitals: ${vitalsStr.join(', ')}.`)
      }
    }
    
    if (record.interventions && record.interventions.length > 0) {
      const intList = record.interventions.map((i) => i.procedure).join(', ')
      parts.push(`Interventions performed: ${intList}.`)
    }
    
    if (record.medications && record.medications.length > 0) {
      const medList = record.medications.map((m) => `${m.medication} ${m.dose}${m.doseUnits} ${m.route}`).join('; ')
      parts.push(`Medications administered: ${medList}.`)
    }
    
    if (record.assessment?.providerPrimaryImpression) {
      parts.push(`Primary impression: ${record.assessment.providerPrimaryImpression}.`)
    }
    
    parts.push(`Patient transported to destination without incident. Care transferred to receiving facility staff.`)
    
    setContent(parts.join('\n\n'))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-white">&larr; Back</Link>
            <h1 className="text-xl font-bold">Narrative</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{record?.incidentNumber}</span>
            <button
              onClick={saveNarrative}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => setShowSign(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Sign & Submit
            </button>
          </div>
        </div>
        <nav className="flex mt-4 gap-2 overflow-x-auto">
          {['Patient', 'Vitals', 'Assessment', 'Interventions', 'Medications', 'Narrative'].map((tab, idx) => (
            <Link
              key={tab}
              to={`/${tab.toLowerCase()}/${recordId}`}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                idx === 5 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab}
            </Link>
          ))}
        </nav>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Patient Care Narrative</h2>
            <button
              onClick={generateNarrative}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
            >
              Auto-Generate
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
            placeholder="Document the patient encounter including assessment findings, treatment provided, and patient response..."
          />
          <p className="text-sm text-gray-400 mt-2">
            {content.length} characters | {content.split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        {narratives.length > 1 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Previous Entries</h3>
            <div className="space-y-3">
              {narratives
                .filter((n) => n.type !== 'primary')
                .map((n) => (
                  <div key={n.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>{n.type === 'addendum' ? 'Addendum' : 'Revision'}</span>
                      <span>{new Date(n.timestamp).toLocaleString()} by {n.author}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate(`/medications/${recordId}`)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
          >
            &larr; Medications
          </button>
          <button
            onClick={() => setShowSign(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Sign & Submit Record
          </button>
        </div>
      </main>

      {showSign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Sign and Submit Record</h2>
            <p className="text-sm text-gray-400 mb-4">
              By signing below, I certify that the information in this patient care report is accurate and complete
              to the best of my knowledge.
            </p>
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-sm">
                Once submitted, this record will be locked and cannot be edited. Any corrections will require an addendum.
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Electronic Signature *</label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowSign(false)}
                className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={signAndSubmit}
                disabled={!signature || saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Sign & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
