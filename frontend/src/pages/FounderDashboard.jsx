import StatCard from '../components/StatCard.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import { useAppData } from '../context/AppContext.jsx'
import { fallbackFounderKpis } from '../data/fallback.js'

export default function FounderDashboard() {
  const { modules, systemHealth } = useAppData()
  const moduleColumns = [
    { key: 'module_key', label: 'Module' },
    { key: 'health_state', label: 'Health' },
    { key: 'enabled', label: 'Enabled' },
    { key: 'kill_switch', label: 'Kill Switch' },
  ]
  const moduleRows = modules.map((module) => ({
    module_key: module.module_key,
    health_state: module.health_state || 'UNKNOWN',
    enabled: module.enabled ? 'Yes' : 'No',
    kill_switch: module.kill_switch ? 'On' : 'Off',
  }))
  const upgradeStatus = systemHealth?.upgrade?.status || 'UNKNOWN'

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Founder Console"
        title="Enterprise Command & Strategic Controls"
        action={<button className="ghost-button">Board Packet</button>}
      />

      <div className="grid-3">
        {fallbackFounderKpis.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} />
        ))}
      </div>

      <div className="section-grid">
        <div className="panel">
          <SectionHeader eyebrow="Ops" title="Multi-Agency Performance" />
          <ul className="checklist">
            <li>24 agencies connected through shared CAD rules.</li>
            <li>Median ETA down 14% after AI staging rollout.</li>
            <li>Fleet downtime reduced to 2.1% this quarter.</li>
          </ul>
        </div>
        <div className="panel">
          <SectionHeader eyebrow="Security" title="Governance" />
          <ul className="checklist">
            <li>RBAC enforced across 5 business units.</li>
            <li>Data retention policies aligned with state mandates.</li>
            <li>Encryption at rest verified for all clinical data.</li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <SectionHeader
          eyebrow="System Health"
          title={`Upgrade Readiness: ${upgradeStatus}`}
          action={<button className="ghost-button">Open Health Center</button>}
        />
        <DataTable
          columns={moduleColumns}
          rows={moduleRows}
          emptyState="Module registry not available yet."
        />
      </div>
    </div>
  )
}
