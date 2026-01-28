import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIncident, getRecommendations, assignUnit } from '../lib/api'
import AIRecommendations from '../components/AIRecommendations'
import FacilitySearch from '../components/FacilitySearch'
import type { Incident, Recommendation } from '../types'

export default function Intake() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'recommendations'>('form')
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<Partial<Incident>>({
    patient_first_name: '',
    patient_last_name: '',
    patient_dob: '',
    patient_gender: '',
    patient_mrn: '',
    pickup_address: '',
    pickup_facility: '',
    destination_address: '',
    destination_facility: '',
    transport_type: 'IFT',
    acuity_level: 'ESI-3',
    diagnosis: '',
    medical_necessity_justification: '',
    special_requirements: {},
    vitals: {},
  })

  const [destinationMeta, setDestinationMeta] = useState<{
    facility_source?: string
    cms_provider_id?: string
    nemsis_destination_type?: string
    nemsis_destination_label?: string
    dispatcher_confirmed: boolean
  }>({
    dispatcher_confirmed: false
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const incidentData = {
        ...formData,
        pickup_location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128]
        },
        destination_location: {
          type: 'Point',
          coordinates: [-73.9654, 40.7829]
        },
      }

      const incident = await createIncident(incidentData)
      setIncidentId(incident.id)

      const recs = await getRecommendations(incident.id)
      setRecommendations(recs)
      setStep('recommendations')
    } catch (error) {
      console.error('Error creating incident:', error)
      alert('Failed to create incident')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (unitId: string) => {
    if (!incidentId) return

    try {
      await assignUnit(incidentId, unitId)
      alert('Unit assigned successfully!')
      navigate('/')
    } catch (error) {
      console.error('Error assigning unit:', error)
      alert('Failed to assign unit')
    }
  }

  if (step === 'recommendations') {
    return (
      <div className="min-h-screen bg-dark p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-4 text-primary hover:text-orange-400 font-semibold"
          >
            ← Back to Dashboard
          </button>
          <AIRecommendations 
            recommendations={recommendations}
            onAssign={handleAssign}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-primary hover:text-orange-400 font-semibold"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-dark-lighter rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-primary mb-6">Call Intake Form</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-dark p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Patient Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                  <input
                    type="text"
                    value={formData.patient_first_name}
                    onChange={(e) => setFormData({...formData, patient_first_name: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={formData.patient_last_name}
                    onChange={(e) => setFormData({...formData, patient_last_name: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.patient_dob}
                    onChange={(e) => setFormData({...formData, patient_dob: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gender *</label>
                  <select
                    value={formData.patient_gender}
                    onChange={(e) => setFormData({...formData, patient_gender: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">MRN</label>
                  <input
                    type="text"
                    value={formData.patient_mrn}
                    onChange={(e) => setFormData({...formData, patient_mrn: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-dark p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Transport Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Transport Type *</label>
                  <select
                    value={formData.transport_type}
                    onChange={(e) => setFormData({...formData, transport_type: e.target.value as any})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="IFT">IFT - Interfacility</option>
                    <option value="CCT">CCT - Critical Care</option>
                    <option value="Bariatric">Bariatric</option>
                    <option value="HEMS">HEMS - Helicopter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Acuity Level *</label>
                  <select
                    value={formData.acuity_level}
                    onChange={(e) => setFormData({...formData, acuity_level: e.target.value as any})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="ESI-1">ESI-1 (Immediate)</option>
                    <option value="ESI-2">ESI-2 (Emergent)</option>
                    <option value="ESI-3">ESI-3 (Urgent)</option>
                    <option value="ESI-4">ESI-4 (Less Urgent)</option>
                    <option value="ESI-5">ESI-5 (Non-Urgent)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pickup Address *</label>
                  <input
                    type="text"
                    value={formData.pickup_address}
                    onChange={(e) => setFormData({...formData, pickup_address: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pickup Facility</label>
                  <input
                    type="text"
                    value={formData.pickup_facility}
                    onChange={(e) => setFormData({...formData, pickup_facility: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Destination Address *</label>
                  <input
                    type="text"
                    value={formData.destination_address}
                    onChange={(e) => setFormData({...formData, destination_address: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <FacilitySearch
                    label="Destination Facility"
                    value={formData.destination_facility || ''}
                    onChange={(value, facility) => {
                      setFormData({...formData, destination_facility: value})
                      if (facility) {
                        setDestinationMeta({
                          facility_source: facility.type,
                          cms_provider_id: facility.cms_provider_id,
                          dispatcher_confirmed: false
                        })
                      }
                    }}
                    onNEMSISConfirm={(nemsisType, facility) => {
                      const nemsisLabel = [
                        { code: '2221001', label: 'Clinic / Physician Office' },
                        { code: '2221003', label: 'Diagnostic Lab' },
                        { code: '2221005', label: 'Dialysis Center' },
                        { code: '2221007', label: 'Free Standing Emergency Department' },
                        { code: '2221009', label: 'Hospital - Specialty' },
                        { code: '2221011', label: 'Hospice Facility' },
                        { code: '2221013', label: 'Imaging Center' },
                        { code: '2221015', label: 'Morgue/Mortuary' },
                        { code: '2221017', label: 'Nursing Home' },
                        { code: '2221019', label: 'Other Medical Facility' },
                        { code: '2221021', label: 'Outpatient Surgery / Ambulatory Surgery Center' },
                        { code: '2221023', label: 'Psychiatric Hospital' },
                        { code: '2221025', label: 'Rehabilitation Facility' },
                        { code: '2221027', label: 'Residence / Home' },
                        { code: '2221029', label: 'Skilled Nursing Facility' },
                        { code: '2221031', label: 'Urgent Care Clinic' },
                        { code: '2221033', label: 'Hospital - Medical Center' }
                      ].find(t => t.code === nemsisType)?.label || ''

                      setDestinationMeta({
                        facility_source: facility.type,
                        cms_provider_id: facility.cms_provider_id,
                        nemsis_destination_type: nemsisType,
                        nemsis_destination_label: nemsisLabel,
                        dispatcher_confirmed: true
                      })
                    }}
                    placeholder="Start typing facility name..."
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-dark p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Medical Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Diagnosis *</label>
                  <textarea
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Medical Necessity Justification *</label>
                  <textarea
                    value={formData.medical_necessity_justification}
                    onChange={(e) => setFormData({...formData, medical_necessity_justification: e.target.value})}
                    className="w-full px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-dark p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Special Requirements</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['oxygen', 'suction', 'monitor', 'defibrillator', 'ventilator', 'iv_pump', 'wheelchair', 'stretcher'].map(req => (
                  <label key={req} className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.special_requirements?.[req as keyof typeof formData.special_requirements] || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        special_requirements: {
                          ...formData.special_requirements,
                          [req]: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-primary bg-dark-lighter border-gray-700 rounded focus:ring-primary"
                    />
                    <span className="capitalize">{req.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Incident...' : 'Create Incident & Get Recommendations'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
