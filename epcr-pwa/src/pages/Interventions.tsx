import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { epcr } from '../lib/api'
import type { Intervention, EpcrRecord } from '../types'

const PROCEDURES = [
  'Airway - BVM Ventilation', 'Airway - CPAP/BiPAP', 'Airway - Intubation', 'Airway - King Airway',
  'Airway - Nasopharyngeal Airway', 'Airway - Oropharyngeal Airway', 'Airway - Suctioning',
  'Cardiac - 12-Lead ECG', 'Cardiac - Cardioversion', 'Cardiac - CPR', 'Cardiac - Defibrillation',
  'Cardiac - Pacing', 'IV - Intraosseous Access', 'IV - IV Access', 'IV - Saline Lock',
  'Immobilization - C-Collar', 'Immobilization - Splinting', 'Immobilization - Spinal Motion Restriction',
  'Oxygen - Nasal Cannula', 'Oxygen - Non-Rebreather', 'Wound Care - Bleeding Control', 'Wound Care - Dressing',
  'Other'
]
const AUTHORIZATION_TYPES = ['standing_order', 'protocol', 'online']
const RESPONSE_OPTIONS = ['Improved', 'Unchanged', 'Deteriorated']

export default function InterventionsPage() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<EpcrRecord | null>(null)
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [showForm, setShowForm] = useState(false)
  const [current, setCurrent] = useState<Partial<Intervention>>({})
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
      setInterventions(res.data.interventions || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const startNew = () => {
    setCurrent({
      timestamp: new Date().toISOString(),
      performedBy: localStorage.getItem('userName') || 'Provider',
      priorToArrival: false,
      successful: true,
      attempts: 1,
    })
    setShowForm(true)
  }

  const saveIntervention = async () => {
    if (!recordId) return
    setSaving(true)
    try {
      const res = await epcr.addIntervention(recordId, current as any)
      setInterventions((prev) => [...prev, res.data])
      setShowForm(false)
      setCurrent({})
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof Intervention, value: any) => {
    setCurrent((prev) => ({ ...prev, [field]: value }))
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
            <h1 className="text-xl font-bold">Interventions</h1>
          </div>
          <span className="text-sm text-gray-400">{record?.incidentNumber}</span>
        </div>
        <nav className="flex mt-4 gap-2 overflow-x-auto">
          {['Patient', 'Vitals', 'Assessment', 'Interventions', 'Medications', 'Narrative'].map((tab, idx) => (
            <Link
              key={tab}
              to={`/${tab.toLowerCase()}/${recordId}`}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                idx === 3 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab}
            </Link>
          ))}
        </nav>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Procedures ({interventions.length})</h2>
          <button
            onClick={startNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            + Add Procedure
          </button>
        </div>

        {interventions.length > 0 && (
          <div className="space-y-3 mb-6">
            {interventions.map((int) => (
              <div key={int.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{int.procedure}</h3>
                    <p className="text-sm text-gray-400">
                      {new Date(int.timestamp).toLocaleString()} by {int.performedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {int.priorToArrival && (
                      <span className="px-2 py-1 bg-yellow-600 rounded text-xs">Prior to Arrival</span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs ${int.successful ? 'bg-green-600' : 'bg-red-600'}`}>
                      {int.successful ? 'Successful' : 'Unsuccessful'}
                    </span>
                  </div>
                </div>
                {int.site && <p className="text-sm text-gray-400 mt-2">Site: {int.site}</p>}
                {int.responseToProcedure && (
                  <p className="text-sm text-gray-400">Response: {int.responseToProcedure}</p>
                )}
                {int.notes && <p className="text-sm text-gray-400 mt-1">{int.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Procedure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Procedure *</label>
                <select
                  value={current.procedure || ''}
                  onChange={(e) => updateField('procedure', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {PROCEDURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {current.procedure === 'Other' && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Specify Procedure</label>
                  <input
                    type="text"
                    value={current.procedureOther || ''}
                    onChange={(e) => updateField('procedureOther', e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Time</label>
                <input
                  type="datetime-local"
                  value={current.timestamp?.slice(0, 16) || ''}
                  onChange={(e) => updateField('timestamp', new Date(e.target.value).toISOString())}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Performed By</label>
                <input
                  type="text"
                  value={current.performedBy || ''}
                  onChange={(e) => updateField('performedBy', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Site/Location</label>
                <input
                  type="text"
                  value={current.site || ''}
                  onChange={(e) => updateField('site', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="e.g., Right AC, Left nostril"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Device Size/Type</label>
                <input
                  type="text"
                  value={current.deviceSize || ''}
                  onChange={(e) => updateField('deviceSize', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="e.g., 18ga, 7.0 ETT"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Attempts</label>
                <input
                  type="number"
                  min="1"
                  value={current.attempts || 1}
                  onChange={(e) => updateField('attempts', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Authorization</label>
                <select
                  value={current.authorizations?.type || ''}
                  onChange={(e) => updateField('authorizations', { ...current.authorizations, type: e.target.value })}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {AUTHORIZATION_TYPES.map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.successful ?? true}
                    onChange={(e) => updateField('successful', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span>Successful</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.priorToArrival ?? false}
                    onChange={(e) => updateField('priorToArrival', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span>Prior to Arrival</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Response</label>
                <select
                  value={current.responseToProcedure || ''}
                  onChange={(e) => updateField('responseToProcedure', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {RESPONSE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea
                  value={current.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={saveIntervention}
                disabled={saving || !current.procedure}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate(`/assessment/${recordId}`)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
          >
            &larr; Assessment
          </button>
          <button
            onClick={() => navigate(`/medications/${recordId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Medications &rarr;
          </button>
        </div>
      </main>
    </div>
  )
}
