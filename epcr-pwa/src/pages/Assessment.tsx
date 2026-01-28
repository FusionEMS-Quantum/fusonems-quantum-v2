import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { epcr } from '../lib/api'
import type { Assessment, EpcrRecord } from '../types'

const CHIEF_COMPLAINTS = [
  'Abdominal Pain', 'Allergic Reaction', 'Altered Mental Status', 'Back Pain', 'Behavioral Emergency',
  'Breathing Problem', 'Cardiac Arrest', 'Chest Pain', 'Diabetic Emergency', 'Fall', 'Headache',
  'Hemorrhage/Bleeding', 'Injury', 'Overdose/Poisoning', 'Seizure', 'Stroke', 'Syncope', 'Trauma',
  'Weakness', 'Other'
]
const LOR_OPTIONS = ['alert', 'verbal', 'painful', 'unresponsive']
const MENTAL_STATUS = ['Oriented', 'Confused', 'Combative', 'Anxious', 'Depressed', 'Hallucinating']
const BODY_REGIONS = ['Head', 'Face', 'Neck', 'Chest', 'Abdomen', 'Pelvis', 'Back', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
const FINDINGS = ['Normal', 'Pain', 'Tenderness', 'Swelling', 'Deformity', 'Laceration', 'Contusion', 'Abrasion', 'Burn', 'Crepitus']

export default function AssessmentPage() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<EpcrRecord | null>(null)
  const [assessment, setAssessment] = useState<Partial<Assessment>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (recordId) loadData()
  }, [recordId])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await epcr.getRecord(recordId!)
      setRecord(res.data)
      setAssessment(res.data.assessment || {
        assessmentTime: new Date().toISOString(),
        assessedBy: localStorage.getItem('userName') || 'Provider',
      })
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveAssessment = async () => {
    if (!recordId) return
    setSaving(true)
    try {
      await epcr.updateAssessment(recordId, assessment)
    } catch (err) {
      console.error('Failed to save assessment:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof Assessment, value: any) => {
    setAssessment((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: keyof Assessment, item: string) => {
    const current = (assessment[field] as string[]) || []
    if (current.includes(item)) {
      updateField(field, current.filter((i) => i !== item))
    } else {
      updateField(field, [...current, item])
    }
  }

  const updateAnatomical = (region: string, findings: string[]) => {
    const current = assessment.anatomicalFindings || []
    const existing = current.findIndex((a) => a.region === region)
    if (existing >= 0) {
      if (findings.length === 0) {
        updateField('anatomicalFindings', current.filter((_, i) => i !== existing))
      } else {
        const updated = [...current]
        updated[existing] = { region, findings }
        updateField('anatomicalFindings', updated)
      }
    } else if (findings.length > 0) {
      updateField('anatomicalFindings', [...current, { region, findings }])
    }
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
            <h1 className="text-xl font-bold">Assessment</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{record?.incidentNumber}</span>
            <button
              onClick={saveAssessment}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <nav className="flex mt-4 gap-2 overflow-x-auto">
          {['Patient', 'Vitals', 'Assessment', 'Interventions', 'Medications', 'Narrative'].map((tab, idx) => (
            <Link
              key={tab}
              to={`/${tab.toLowerCase()}/${recordId}`}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                idx === 2 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab}
            </Link>
          ))}
        </nav>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Chief Complaint</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Primary Complaint *</label>
              <select
                value={assessment.chiefComplaint || ''}
                onChange={(e) => updateField('chiefComplaint', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="">Select...</option>
                {CHIEF_COMPLAINTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {assessment.chiefComplaint === 'Other' && (
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-1">Specify</label>
                <input
                  type="text"
                  value={assessment.chiefComplaintOther || ''}
                  onChange={(e) => updateField('chiefComplaintOther', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-1">History of Present Illness</label>
              <textarea
                value={assessment.historyOfPresentIllness || ''}
                onChange={(e) => updateField('historyOfPresentIllness', e.target.value)}
                rows={4}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="Onset, provocation, quality, radiation, severity, time..."
              />
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Clinical Impression</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Primary Impression</label>
              <input
                type="text"
                value={assessment.providerPrimaryImpression || ''}
                onChange={(e) => updateField('providerPrimaryImpression', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="e.g., STEMI, CVA, Hypoglycemia"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-1">Secondary Impressions</label>
              <input
                type="text"
                value={(assessment.providerSecondaryImpression || []).join(', ')}
                onChange={(e) => updateField('providerSecondaryImpression', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="Separate with commas"
              />
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Mental Status</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Level of Responsiveness</label>
              <div className="flex gap-2">
                {LOR_OPTIONS.map((lor) => (
                  <button
                    key={lor}
                    onClick={() => updateField('levelOfResponsiveness', lor)}
                    className={`flex-1 py-2 px-3 rounded ${
                      assessment.levelOfResponsiveness === lor
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {lor.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="text-center text-sm text-gray-400 mt-1">
                {assessment.levelOfResponsiveness?.toUpperCase() || 'Select AVPU'}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">Mental Status Findings</label>
              <div className="flex flex-wrap gap-2">
                {MENTAL_STATUS.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleArrayItem('mentalStatus', status)}
                    className={`px-3 py-1 rounded text-sm ${
                      (assessment.mentalStatus || []).includes(status)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Barriers to Care</h2>
            <div className="flex flex-wrap gap-2">
              {['Language', 'Hearing Impaired', 'Visually Impaired', 'Developmental', 'Physical', 'Psychiatric', 'Uncooperative', 'None'].map((barrier) => (
                <button
                  key={barrier}
                  onClick={() => toggleArrayItem('barriers', barrier)}
                  className={`px-3 py-1 rounded text-sm ${
                    (assessment.barriers || []).includes(barrier)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {barrier}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Physical Exam</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {BODY_REGIONS.map((region) => {
                const regionFindings = assessment.anatomicalFindings?.find((a) => a.region === region)?.findings || []
                return (
                  <div key={region} className="bg-gray-700 rounded-lg p-3">
                    <h3 className="font-medium mb-2">{region}</h3>
                    <div className="flex flex-wrap gap-1">
                      {FINDINGS.map((finding) => (
                        <button
                          key={finding}
                          onClick={() => {
                            const current = regionFindings.includes(finding)
                              ? regionFindings.filter((f) => f !== finding)
                              : [...regionFindings, finding]
                            updateAnatomical(region, current)
                          }}
                          className={`px-2 py-1 rounded text-xs ${
                            regionFindings.includes(finding)
                              ? finding === 'Normal'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        >
                          {finding}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate(`/vitals/${recordId}`)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
          >
            &larr; Vitals
          </button>
          <button
            onClick={() => navigate(`/interventions/${recordId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Interventions &rarr;
          </button>
        </div>
      </main>
    </div>
  )
}
