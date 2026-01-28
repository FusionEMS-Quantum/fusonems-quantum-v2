import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../App'
import { epcr } from '../lib/api'
import type { EpcrRecord } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { setActiveRecordId } = useApp()
  const [records, setRecords] = useState<EpcrRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [unitId] = useState(() => localStorage.getItem('unitId') || 'UNIT-001')

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await epcr.getRecords({ unitId, status: 'draft,in_progress' })
      setRecords(res.data)
    } catch (err) {
      console.error('Failed to load records:', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const createNewRecord = async (serviceType: string) => {
    try {
      const res = await epcr.createRecord({ unitId, serviceType })
      setActiveRecordId(res.data.id)
      navigate(`/patient/${res.data.id}`)
    } catch (err) {
      console.error('Failed to create record:', err)
    }
    setShowNewModal(false)
  }

  const openRecord = (record: EpcrRecord) => {
    setActiveRecordId(record.id)
    navigate(`/patient/${record.id}`)
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-600 text-gray-200'
      case 'in_progress':
        return 'bg-blue-600 text-white'
      case 'complete':
        return 'bg-green-600 text-white'
      case 'locked':
        return 'bg-purple-600 text-white'
      case 'submitted':
        return 'bg-emerald-600 text-white'
      default:
        return 'bg-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">ePCR Dashboard</h1>
            <p className="text-sm text-gray-400">{unitId}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/inventory"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Inventory
            </Link>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              + New Record
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No active patient care records</div>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Start New Record
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((record) => (
              <button
                key={record.id}
                onClick={() => openRecord(record)}
                className="bg-gray-800 rounded-lg p-4 text-left hover:bg-gray-750 border border-gray-700 hover:border-blue-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-lg font-semibold">{record.incidentNumber}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor(record.status)}`}>
                    {record.status.replace('_', ' ')}
                  </span>
                </div>
                {record.patient && (
                  <div className="mb-2">
                    <p className="font-medium">
                      {record.patient.lastName}, {record.patient.firstName}
                    </p>
                    {record.patient.dateOfBirth && (
                      <p className="text-sm text-gray-400">
                        DOB: {new Date(record.patient.dateOfBirth).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                {record.dispatchInfo && (
                  <p className="text-sm text-gray-400 mb-2">{record.dispatchInfo.complaint}</p>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-700">
                  <span>{record.serviceType.replace('_', ' ')}</span>
                  <span>{new Date(record.createdAt).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Start New Patient Care Record</h2>
            <div className="space-y-3">
              <button
                onClick={() => createNewRecord('medical_transport')}
                className="w-full p-4 bg-gray-700 rounded-lg text-left hover:bg-gray-600"
              >
                <p className="font-medium">Medical Transport</p>
                <p className="text-sm text-gray-400">BLS/ALS interfacility, dialysis, etc.</p>
              </button>
              <button
                onClick={() => createNewRecord('fire_911')}
                className="w-full p-4 bg-gray-700 rounded-lg text-left hover:bg-gray-600"
              >
                <p className="font-medium">Fire 911</p>
                <p className="text-sm text-gray-400">Emergency response via CAD</p>
              </button>
              <button
                onClick={() => createNewRecord('hems')}
                className="w-full p-4 bg-gray-700 rounded-lg text-left hover:bg-gray-600"
              >
                <p className="font-medium">HEMS</p>
                <p className="text-sm text-gray-400">Helicopter EMS</p>
              </button>
            </div>
            <button
              onClick={() => setShowNewModal(false)}
              className="w-full mt-4 p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
