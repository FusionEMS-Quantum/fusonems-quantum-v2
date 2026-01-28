import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { epcr } from '../lib/api'
import type { VitalSet, EpcrRecord } from '../types'

const BP_METHODS = ['auscultation', 'palpation', 'automated', 'invasive']
const HR_METHODS = ['palpation', 'auscultation', 'monitor', 'pulse_ox']
const RESP_EFFORTS = ['normal', 'labored', 'shallow', 'agonal', 'apneic']
const TEMP_METHODS = ['oral', 'rectal', 'tympanic', 'temporal', 'axillary']
const SKIN_COLORS = ['normal', 'pale', 'cyanotic', 'flushed', 'jaundiced', 'mottled']
const SKIN_TEMPS = ['normal', 'hot', 'cool', 'cold']
const SKIN_MOISTURE = ['dry', 'moist', 'diaphoretic']
const PUPIL_SIZES = ['1mm', '2mm', '3mm', '4mm', '5mm', '6mm', '7mm', '8mm', 'dilated', 'constricted']
const PUPIL_REACTIVITY = ['reactive', 'sluggish', 'non_reactive', 'unable']
const CAP_REFILL = ['normal', 'delayed', 'absent']

export default function VitalsPage() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<EpcrRecord | null>(null)
  const [vitals, setVitals] = useState<VitalSet[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentVitals, setCurrentVitals] = useState<Partial<VitalSet>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (recordId) loadData()
  }, [recordId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [recordRes, vitalsRes] = await Promise.all([
        epcr.getRecord(recordId!),
        epcr.getVitals(recordId!),
      ])
      setRecord(recordRes.data)
      setVitals(vitalsRes.data)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const startNewVitals = () => {
    setCurrentVitals({
      timestamp: new Date().toISOString(),
      takenBy: localStorage.getItem('userName') || 'Provider',
    })
    setShowForm(true)
  }

  const saveVitals = async () => {
    if (!recordId) return
    setSaving(true)
    try {
      const res = await epcr.addVitals(recordId, currentVitals as any)
      setVitals((prev) => [...prev, res.data])
      setShowForm(false)
      setCurrentVitals({})
    } catch (err) {
      console.error('Failed to save vitals:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof VitalSet, value: any) => {
    setCurrentVitals((prev) => ({ ...prev, [field]: value }))
  }

  const gcsTotal = (currentVitals.gcsEye || 0) + (currentVitals.gcsVerbal || 0) + (currentVitals.gcsMotor || 0)

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
            <h1 className="text-xl font-bold">Vital Signs</h1>
          </div>
          <span className="text-sm text-gray-400">{record?.incidentNumber}</span>
        </div>
        <nav className="flex mt-4 gap-2 overflow-x-auto">
          {['Patient', 'Vitals', 'Assessment', 'Interventions', 'Medications', 'Narrative'].map((tab, idx) => (
            <Link
              key={tab}
              to={`/${tab.toLowerCase()}/${recordId}`}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                idx === 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab}
            </Link>
          ))}
        </nav>
      </header>

      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Vital Signs ({vitals.length} recorded)</h2>
          <button
            onClick={startNewVitals}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            + Add Vital Set
          </button>
        </div>

        {vitals.length > 0 && (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-left">
                  <th className="p-3">Time</th>
                  <th className="p-3">BP</th>
                  <th className="p-3">HR</th>
                  <th className="p-3">RR</th>
                  <th className="p-3">SpO2</th>
                  <th className="p-3">Temp</th>
                  <th className="p-3">GCS</th>
                  <th className="p-3">BG</th>
                  <th className="p-3">Pain</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((v) => (
                  <tr key={v.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="p-3">{new Date(v.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic || '-'}</td>
                    <td className="p-3">{v.heartRate || '-'}</td>
                    <td className="p-3">{v.respiratoryRate || '-'}</td>
                    <td className="p-3">{v.pulseOximetry ? `${v.pulseOximetry}%` : '-'}</td>
                    <td className="p-3">{v.temperature ? `${v.temperature}°${v.temperatureUnits || 'F'}` : '-'}</td>
                    <td className="p-3">{v.gcsTotal || '-'}</td>
                    <td className="p-3">{v.bloodGlucose || '-'}</td>
                    <td className="p-3">{v.painScale ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">New Vital Set</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-sm text-gray-400 mb-1">Time</label>
                <input
                  type="datetime-local"
                  value={currentVitals.timestamp?.slice(0, 16) || ''}
                  onChange={(e) => updateField('timestamp', new Date(e.target.value).toISOString())}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">BP Systolic</label>
                <input
                  type="number"
                  value={currentVitals.bloodPressureSystolic || ''}
                  onChange={(e) => updateField('bloodPressureSystolic', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="120"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">BP Diastolic</label>
                <input
                  type="number"
                  value={currentVitals.bloodPressureDiastolic || ''}
                  onChange={(e) => updateField('bloodPressureDiastolic', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="80"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">BP Method</label>
                <select
                  value={currentVitals.bloodPressureMethod || ''}
                  onChange={(e) => updateField('bloodPressureMethod', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {BP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Heart Rate</label>
                <input
                  type="number"
                  value={currentVitals.heartRate || ''}
                  onChange={(e) => updateField('heartRate', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">HR Method</label>
                <select
                  value={currentVitals.heartRateMethod || ''}
                  onChange={(e) => updateField('heartRateMethod', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {HR_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">SpO2 %</label>
                <input
                  type="number"
                  value={currentVitals.pulseOximetry || ''}
                  onChange={(e) => updateField('pulseOximetry', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">O2 Flow (L/min)</label>
                <input
                  type="number"
                  value={currentVitals.o2FlowRate || ''}
                  onChange={(e) => updateField('o2FlowRate', parseFloat(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Resp Rate</label>
                <input
                  type="number"
                  value={currentVitals.respiratoryRate || ''}
                  onChange={(e) => updateField('respiratoryRate', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Resp Effort</label>
                <select
                  value={currentVitals.respiratoryEffort || ''}
                  onChange={(e) => updateField('respiratoryEffort', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {RESP_EFFORTS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Temperature</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={currentVitals.temperature || ''}
                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  <select
                    value={currentVitals.temperatureUnits || 'F'}
                    onChange={(e) => updateField('temperatureUnits', e.target.value)}
                    className="w-16 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="F">F</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Temp Method</label>
                <select
                  value={currentVitals.temperatureMethod || ''}
                  onChange={(e) => updateField('temperatureMethod', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {TEMP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Blood Glucose</label>
                <input
                  type="number"
                  value={currentVitals.bloodGlucose || ''}
                  onChange={(e) => updateField('bloodGlucose', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ETCO2</label>
                <input
                  type="number"
                  value={currentVitals.etco2 || ''}
                  onChange={(e) => updateField('etco2', parseInt(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              <div className="col-span-2 lg:col-span-4 border-t border-gray-600 pt-4 mt-2">
                <h4 className="font-medium mb-3">GCS (Total: {gcsTotal || '-'})</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Eye (1-4)</label>
                    <select
                      value={currentVitals.gcsEye || ''}
                      onChange={(e) => updateField('gcsEye', parseInt(e.target.value))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">-</option>
                      <option value="1">1 - None</option>
                      <option value="2">2 - To Pain</option>
                      <option value="3">3 - To Voice</option>
                      <option value="4">4 - Spontaneous</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Verbal (1-5)</label>
                    <select
                      value={currentVitals.gcsVerbal || ''}
                      onChange={(e) => updateField('gcsVerbal', parseInt(e.target.value))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">-</option>
                      <option value="1">1 - None</option>
                      <option value="2">2 - Incomprehensible</option>
                      <option value="3">3 - Inappropriate</option>
                      <option value="4">4 - Confused</option>
                      <option value="5">5 - Oriented</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Motor (1-6)</label>
                    <select
                      value={currentVitals.gcsMotor || ''}
                      onChange={(e) => updateField('gcsMotor', parseInt(e.target.value))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">-</option>
                      <option value="1">1 - None</option>
                      <option value="2">2 - Extension</option>
                      <option value="3">3 - Flexion</option>
                      <option value="4">4 - Withdrawal</option>
                      <option value="5">5 - Localizes</option>
                      <option value="6">6 - Obeys</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="col-span-2 lg:col-span-4 border-t border-gray-600 pt-4 mt-2">
                <h4 className="font-medium mb-3">Skin & Pupils</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Skin Color</label>
                    <select
                      value={currentVitals.skinColor || ''}
                      onChange={(e) => updateField('skinColor', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {SKIN_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Skin Temp</label>
                    <select
                      value={currentVitals.skinTemperature || ''}
                      onChange={(e) => updateField('skinTemperature', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {SKIN_TEMPS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Skin Moisture</label>
                    <select
                      value={currentVitals.skinMoisture || ''}
                      onChange={(e) => updateField('skinMoisture', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {SKIN_MOISTURE.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cap Refill</label>
                    <select
                      value={currentVitals.capillaryRefill || ''}
                      onChange={(e) => updateField('capillaryRefill', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {CAP_REFILL.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Pupil Left</label>
                    <select
                      value={currentVitals.pupilLeft || ''}
                      onChange={(e) => updateField('pupilLeft', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {PUPIL_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Left Reactivity</label>
                    <select
                      value={currentVitals.pupilLeftReactivity || ''}
                      onChange={(e) => updateField('pupilLeftReactivity', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {PUPIL_REACTIVITY.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Pupil Right</label>
                    <select
                      value={currentVitals.pupilRight || ''}
                      onChange={(e) => updateField('pupilRight', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {PUPIL_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Right Reactivity</label>
                    <select
                      value={currentVitals.pupilRightReactivity || ''}
                      onChange={(e) => updateField('pupilRightReactivity', e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="">Select...</option>
                      {PUPIL_REACTIVITY.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="col-span-2 lg:col-span-4">
                <label className="block text-sm text-gray-400 mb-1">Pain Scale (0-10)</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={currentVitals.painScale ?? 0}
                  onChange={(e) => updateField('painScale', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0 - None</span>
                  <span className="text-lg font-bold text-white">{currentVitals.painScale ?? 0}</span>
                  <span>10 - Worst</span>
                </div>
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
                onClick={saveVitals}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Vitals'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate(`/patient/${recordId}`)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
          >
            &larr; Patient
          </button>
          <button
            onClick={() => navigate(`/assessment/${recordId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Assessment &rarr;
          </button>
        </div>
      </main>
    </div>
  )
}
