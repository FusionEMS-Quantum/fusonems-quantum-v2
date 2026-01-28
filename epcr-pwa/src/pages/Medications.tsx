import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { epcr } from '../lib/api'
import type { MedicationAdmin, EpcrRecord } from '../types'

const MEDICATIONS = [
  { name: 'Adenosine', controlled: false },
  { name: 'Albuterol', controlled: false },
  { name: 'Amiodarone', controlled: false },
  { name: 'Aspirin', controlled: false },
  { name: 'Atropine', controlled: false },
  { name: 'Dextrose 50%', controlled: false },
  { name: 'Diphenhydramine', controlled: false },
  { name: 'Epinephrine', controlled: false },
  { name: 'Fentanyl', controlled: true, schedule: 'II' },
  { name: 'Glucagon', controlled: false },
  { name: 'Ketamine', controlled: true, schedule: 'III' },
  { name: 'Lidocaine', controlled: false },
  { name: 'Midazolam', controlled: true, schedule: 'IV' },
  { name: 'Morphine', controlled: true, schedule: 'II' },
  { name: 'Naloxone', controlled: false },
  { name: 'Nitroglycerin', controlled: false },
  { name: 'Ondansetron', controlled: false },
  { name: 'Oxygen', controlled: false },
  { name: 'Sodium Bicarbonate', controlled: false },
]
const ROUTES = ['IV', 'IM', 'IO', 'SQ', 'PO', 'SL', 'IN', 'NEB', 'ET', 'Topical', 'Rectal']
const RESPONSES = ['Improved', 'Unchanged', 'Deteriorated', 'Adverse Reaction']

export default function MedicationsPage() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<EpcrRecord | null>(null)
  const [medications, setMedications] = useState<MedicationAdmin[]>([])
  const [showForm, setShowForm] = useState(false)
  const [current, setCurrent] = useState<Partial<MedicationAdmin>>({})
  const [showWitness, setShowWitness] = useState(false)
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
      setMedications(res.data.medications || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const startNew = () => {
    setCurrent({
      timestamp: new Date().toISOString(),
      administeredBy: localStorage.getItem('userName') || 'Provider',
      priorToArrival: false,
      isControlled: false,
    })
    setShowForm(true)
    setShowWitness(false)
  }

  const selectMedication = (name: string) => {
    const med = MEDICATIONS.find((m) => m.name === name)
    setCurrent((prev) => ({
      ...prev,
      medication: name,
      isControlled: med?.controlled || false,
      deaSchedule: med?.schedule as any,
    }))
    if (med?.controlled) {
      setShowWitness(true)
    } else {
      setShowWitness(false)
    }
  }

  const saveMedication = async () => {
    if (!recordId) return
    setSaving(true)
    try {
      if (current.isControlled) {
        await epcr.administerControlled(recordId, current as any)
      } else {
        await epcr.administerMedication(recordId, current as any)
      }
      await loadData()
      setShowForm(false)
      setCurrent({})
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof MedicationAdmin, value: any) => {
    setCurrent((prev) => ({ ...prev, [field]: value }))
  }

  const scheduleColor = (schedule?: string) => {
    switch (schedule) {
      case 'II': return 'bg-red-600'
      case 'III': return 'bg-orange-600'
      case 'IV': return 'bg-yellow-600'
      case 'V': return 'bg-green-600'
      default: return 'bg-gray-600'
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
            <h1 className="text-xl font-bold">Medications</h1>
          </div>
          <span className="text-sm text-gray-400">{record?.incidentNumber}</span>
        </div>
        <nav className="flex mt-4 gap-2 overflow-x-auto">
          {['Patient', 'Vitals', 'Assessment', 'Interventions', 'Medications', 'Narrative'].map((tab, idx) => (
            <Link
              key={tab}
              to={`/${tab.toLowerCase()}/${recordId}`}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                idx === 4 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab}
            </Link>
          ))}
        </nav>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Medications Administered ({medications.length})</h2>
          <button
            onClick={startNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            + Administer Medication
          </button>
        </div>

        {medications.length > 0 && (
          <div className="space-y-3 mb-6">
            {medications.map((med) => (
              <div key={med.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{med.medication}</h3>
                      {med.isControlled && (
                        <span className={`px-2 py-0.5 rounded text-xs text-white ${scheduleColor(med.deaSchedule)}`}>
                          Schedule {med.deaSchedule}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {med.dose} {med.doseUnits} {med.route}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(med.timestamp).toLocaleString()} by {med.administeredBy}
                    </p>
                  </div>
                  <div className="text-right">
                    {med.response && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        med.response === 'Improved' ? 'bg-green-600' :
                        med.response === 'Adverse Reaction' ? 'bg-red-600' : 'bg-gray-600'
                      }`}>
                        {med.response}
                      </span>
                    )}
                  </div>
                </div>
                {med.isControlled && med.witnessName && (
                  <p className="text-sm text-yellow-400 mt-2">
                    Witnessed by: {med.witnessName}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Administer Medication</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Medication *</label>
                <select
                  value={current.medication || ''}
                  onChange={(e) => selectMedication(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {MEDICATIONS.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.controlled ? `(Schedule ${m.schedule})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {current.isControlled && (
                <div className="md:col-span-2 bg-red-900/30 border border-red-600 rounded-lg p-3">
                  <p className="text-red-300 text-sm font-medium">
                    CONTROLLED SUBSTANCE - Witness signature required
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Dose *</label>
                <input
                  type="number"
                  step="0.1"
                  value={current.dose || ''}
                  onChange={(e) => updateField('dose', parseFloat(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Units *</label>
                <select
                  value={current.doseUnits || ''}
                  onChange={(e) => updateField('doseUnits', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                  <option value="mL">mL</option>
                  <option value="L">L</option>
                  <option value="units">units</option>
                  <option value="meq">mEq</option>
                  <option value="puffs">puffs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Route *</label>
                <select
                  value={current.route || ''}
                  onChange={(e) => updateField('route', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
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
                <label className="block text-sm text-gray-400 mb-1">Administered By</label>
                <input
                  type="text"
                  value={current.administeredBy || ''}
                  onChange={(e) => updateField('administeredBy', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Authorization</label>
                <select
                  value={current.authorizationType || ''}
                  onChange={(e) => updateField('authorizationType', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  <option value="protocol">Protocol</option>
                  <option value="standing_order">Standing Order</option>
                  <option value="online">Online Medical Control</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Response</label>
                <select
                  value={current.response || ''}
                  onChange={(e) => updateField('response', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {RESPONSES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {showWitness && (
                <>
                  <div className="md:col-span-2 border-t border-gray-600 pt-4 mt-2">
                    <h4 className="font-medium text-yellow-400 mb-3">Controlled Substance Witness</h4>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Witness Name *</label>
                    <input
                      type="text"
                      value={current.witnessName || ''}
                      onChange={(e) => updateField('witnessName', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Partner's full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Witness Signature *</label>
                    <input
                      type="text"
                      value={current.witnessSignature || ''}
                      onChange={(e) => updateField('witnessSignature', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Partner types full name to sign"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Lot Number</label>
                    <input
                      type="text"
                      value={current.lotNumber || ''}
                      onChange={(e) => updateField('lotNumber', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Waste Amount</label>
                    <input
                      type="number"
                      step="0.1"
                      value={current.wasteAmount || ''}
                      onChange={(e) => updateField('wasteAmount', parseFloat(e.target.value))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Amount wasted (if any)"
                    />
                  </div>
                </>
              )}

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
                onClick={saveMedication}
                disabled={
                  saving ||
                  !current.medication ||
                  !current.dose ||
                  !current.doseUnits ||
                  !current.route ||
                  (current.isControlled && (!current.witnessName || !current.witnessSignature))
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate(`/interventions/${recordId}`)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
          >
            &larr; Interventions
          </button>
          <button
            onClick={() => navigate(`/narrative/${recordId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Narrative &rarr;
          </button>
        </div>
      </main>
    </div>
  )
}
