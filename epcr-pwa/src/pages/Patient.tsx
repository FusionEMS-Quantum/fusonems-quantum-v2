import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { epcr } from '../lib/api'
import type { Patient, EpcrRecord } from '../types'

const GENDER_OPTIONS = ['male', 'female', 'other', 'unknown']
const RACE_OPTIONS = ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Other Pacific Islander', 'White', 'Other']
const ETHNICITY_OPTIONS = ['Hispanic or Latino', 'Not Hispanic or Latino', 'Unknown']
const DNR_OPTIONS = ['none', 'dnr', 'dnr_comfort', 'unknown']

export default function PatientPage() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<EpcrRecord | null>(null)
  const [patient, setPatient] = useState<Partial<Patient>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (recordId) loadRecord()
  }, [recordId])

  const loadRecord = async () => {
    setLoading(true)
    try {
      const res = await epcr.getRecord(recordId!)
      setRecord(res.data)
      setPatient(res.data.patient || {})
    } catch (err) {
      console.error('Failed to load record:', err)
    } finally {
      setLoading(false)
    }
  }

  const savePatient = async () => {
    if (!recordId) return
    setSaving(true)
    try {
      await epcr.updatePatient(recordId, patient)
    } catch (err) {
      console.error('Failed to save patient:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof Patient, value: any) => {
    setPatient((prev) => ({ ...prev, [field]: value }))
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
            <h1 className="text-xl font-bold">Patient Demographics</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{record?.incidentNumber}</span>
            <button
              onClick={savePatient}
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
                idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Name & Demographics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                <input
                  type="text"
                  value={patient.firstName || ''}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={patient.middleName || ''}
                  onChange={(e) => updateField('middleName', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={patient.lastName || ''}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={patient.dateOfBirth || ''}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Age</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={patient.age || ''}
                    onChange={(e) => updateField('age', parseInt(e.target.value))}
                    className="w-20 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  <select
                    value={patient.ageUnits || 'years'}
                    onChange={(e) => updateField('ageUnits', e.target.value)}
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="years">Years</option>
                    <option value="months">Months</option>
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Gender *</label>
                <select
                  value={patient.gender || ''}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Race</label>
                <select
                  multiple
                  value={patient.race || []}
                  onChange={(e) => updateField('race', Array.from(e.target.selectedOptions, (o) => o.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white h-24"
                >
                  {RACE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ethnicity</label>
                <select
                  value={patient.ethnicity || ''}
                  onChange={(e) => updateField('ethnicity', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {ETHNICITY_OPTIONS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={patient.weight || ''}
                    onChange={(e) => updateField('weight', parseFloat(e.target.value))}
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  <select
                    value={patient.weightUnits || 'kg'}
                    onChange={(e) => updateField('weightUnits', e.target.value)}
                    className="w-20 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">SSN</label>
                <input
                  type="text"
                  value={patient.ssn || ''}
                  onChange={(e) => updateField('ssn', e.target.value)}
                  placeholder="XXX-XX-XXXX"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Address & Contact</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Street Address</label>
                <input
                  type="text"
                  value={patient.address?.street || ''}
                  onChange={(e) => updateField('address', { ...patient.address, street: e.target.value })}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    value={patient.address?.city || ''}
                    onChange={(e) => updateField('address', { ...patient.address, city: e.target.value })}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">State</label>
                  <input
                    type="text"
                    value={patient.address?.state || ''}
                    onChange={(e) => updateField('address', { ...patient.address, state: e.target.value })}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={patient.address?.zip || ''}
                    onChange={(e) => updateField('address', { ...patient.address, zip: e.target.value })}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={patient.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={patient.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Medical History</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Allergies</label>
                <input
                  type="text"
                  value={(patient.allergies || []).join(', ')}
                  onChange={(e) => updateField('allergies', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="Separate with commas"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Medical History</label>
                <input
                  type="text"
                  value={(patient.medicalHistory || []).join(', ')}
                  onChange={(e) => updateField('medicalHistory', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="HTN, DM, CHF, etc."
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Medications</label>
                <input
                  type="text"
                  value={(patient.currentMedications || []).join(', ')}
                  onChange={(e) => updateField('currentMedications', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="Separate with commas"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">DNR Status</label>
                <select
                  value={patient.dnrStatus || ''}
                  onChange={(e) => updateField('dnrStatus', e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Select...</option>
                  {DNR_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-blue-400">Insurance</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Primary Provider</label>
                <input
                  type="text"
                  value={patient.insurancePrimary?.provider || ''}
                  onChange={(e) => updateField('insurancePrimary', { ...patient.insurancePrimary, provider: e.target.value })}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={patient.insurancePrimary?.policyNumber || ''}
                    onChange={(e) => updateField('insurancePrimary', { ...patient.insurancePrimary, policyNumber: e.target.value })}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Group Number</label>
                  <input
                    type="text"
                    value={patient.insurancePrimary?.groupNumber || ''}
                    onChange={(e) => updateField('insurancePrimary', { ...patient.insurancePrimary, groupNumber: e.target.value })}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => navigate(`/vitals/${recordId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Continue to Vitals &rarr;
          </button>
        </div>
      </main>
    </div>
  )
}
