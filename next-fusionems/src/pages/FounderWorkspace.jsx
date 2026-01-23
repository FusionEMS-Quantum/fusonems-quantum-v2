import { useEffect, useState } from 'react'
import SectionHeader from '../components/SectionHeader.jsx'
import AdvisoryPanel from '../components/AdvisoryPanel.jsx'
import StatCard from '../components/StatCard.jsx'
import { apiFetch } from '../services/api.js'

export default function FounderWorkspace() {
  const [stats, setStats] = useState({
    files: 0,
    voiceNumbers: 0,
    exports: 0,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [files, voiceNumbers, exports] = await Promise.all([
          apiFetch('/api/documents/files'),
          apiFetch('/api/comms/phone-numbers'),
          apiFetch('/api/documents/exports/history'),
        ])
        setStats({
          files: Array.isArray(files) ? files.length : 0,
          voiceNumbers: Array.isArray(voiceNumbers) ? voiceNumbers.length : 0,
          exports: Array.isArray(exports) ? exports.length : 0,
        })
      } catch (error) {
        console.warn('Founder workspace stats unavailable', error)
      }
    }
    load()
  }, [])

  return (
    <div className="page">
      <SectionHeader eyebrow="Founder Workspace" title="Quantum Documents + Voice" />
      <div className="grid-3">
        <StatCard label="Docs Vault" value={`${stats.files}`} delta="Stored artifacts" />
        <StatCard label="Voice Lines" value={`${stats.voiceNumbers}`} delta="Configured numbers" />
        <StatCard label="Discovery Exports" value={`${stats.exports}`} delta="Export history" />
      </div>
      <div className="panel">
        <AdvisoryPanel
          title="Workspace Guardrails"
          model="governance-core"
          version="2.1"
          level="ADVISORY"
          message="Retention policies and legal holds are enforced on every export and recording."
          reason="Founder governance"
        />
      </div>
    </div>
  )
}
