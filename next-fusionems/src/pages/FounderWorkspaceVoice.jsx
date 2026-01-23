import { useEffect, useState } from 'react'
import SectionHeader from '../components/SectionHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import { apiFetch } from '../services/api.js'

const numberColumns = [
  { key: 'e164', label: 'Number' },
  { key: 'label', label: 'Label' },
  { key: 'purpose', label: 'Purpose' },
]

const policyColumns = [
  { key: 'name', label: 'Policy' },
  { key: 'mode', label: 'Mode' },
]

export default function FounderWorkspaceVoice() {
  const [numbers, setNumbers] = useState([])
  const [policies, setPolicies] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [numberData, policyData] = await Promise.all([
          apiFetch('/api/comms/phone-numbers'),
          apiFetch('/api/comms/routing-policies'),
        ])
        if (Array.isArray(numberData)) {
          setNumbers(numberData)
        }
        if (Array.isArray(policyData)) {
          setPolicies(policyData)
        }
      } catch (error) {
        console.warn('Voice governance data unavailable', error)
      }
    }
    load()
  }, [])

  return (
    <div className="page">
      <SectionHeader eyebrow="Founder Workspace" title="Voice Governance" />
      <div className="panel">
        <SectionHeader eyebrow="Phone Lines" title="Assigned Numbers" />
        <DataTable columns={numberColumns} rows={numbers} emptyState="No numbers assigned." />
      </div>
      <div className="panel">
        <SectionHeader eyebrow="Routing Policies" title="Ring Groups + IVR" />
        <DataTable columns={policyColumns} rows={policies} emptyState="No routing policies." />
      </div>
    </div>
  )
}
