import { NavLink } from 'react-router-dom'
import { useAppData } from '../context/AppContext.jsx'

const navItems = [
  { to: '/dashboard', label: 'Command Center', hint: 'Overview & KPIs', moduleKey: 'CAD' },
  { to: '/cad', label: 'CAD Management', hint: 'Call intake & dispatch', moduleKey: 'CAD' },
  { to: '/tracking', label: 'Unit Tracking', hint: 'Live GPS & status', moduleKey: 'CAD' },
  { to: '/epcr', label: 'ePCR', hint: 'Patient care reports', moduleKey: 'EPCR' },
  { to: '/scheduling', label: 'Scheduling', hint: 'Coverage & shifts', moduleKey: 'SCHEDULING' },
  { to: '/billing', label: 'Billing Ops', hint: 'Claims & reconciliation', moduleKey: 'BILLING' },
  { to: '/communications', label: 'Communications', hint: 'Telnyx voice/SMS', moduleKey: 'COMMS' },
  { to: '/telehealth', label: 'Telehealth', hint: 'CareFusion video visits', moduleKey: 'TELEHEALTH' },
  { to: '/fire', label: 'Fire Dashboard', hint: 'Command visibility', moduleKey: 'FIRE' },
  { to: '/fire/incidents', label: 'Fire Incidents', hint: 'NFIRS / NERIS', moduleKey: 'FIRE' },
  { to: '/fire/apparatus', label: 'Apparatus', hint: 'Fleet & inventory', moduleKey: 'FIRE' },
  { to: '/fire/personnel', label: 'Personnel', hint: 'Roles & certs', moduleKey: 'FIRE' },
  { to: '/fire/training', label: 'Training', hint: 'Drills & readiness', moduleKey: 'FIRE' },
  { to: '/fire/prevention', label: 'Prevention', hint: 'Inspections', moduleKey: 'FIRE' },
  { to: '/hems', label: 'HEMS Command', hint: 'Air medical ops', moduleKey: 'HEMS' },
  { to: '/hems/missions', label: 'HEMS Missions', hint: 'Mission board', moduleKey: 'HEMS' },
  { to: '/hems/aircraft', label: 'HEMS Aircraft', hint: 'Fleet readiness', moduleKey: 'HEMS' },
  { to: '/hems/crew', label: 'HEMS Crew', hint: 'Duty + fatigue', moduleKey: 'HEMS' },
  { to: '/hems/qa', label: 'HEMS QA', hint: 'Review queue', moduleKey: 'HEMS' },
  { to: '/hems/billing', label: 'HEMS Billing', hint: 'Export packets', moduleKey: 'HEMS' },
  { to: '/repair', label: 'Repair Tooling', hint: 'Orphan recovery', moduleKey: 'REPAIR' },
  { to: '/exports', label: 'Data Exports', hint: 'Exit tooling', moduleKey: 'EXPORTS' },
  { to: '/automation', label: 'Automation', hint: 'Validation & compliance', moduleKey: 'AUTOMATION' },
  { to: '/ai-console', label: 'AI Console', hint: 'Predictions & guidance', moduleKey: 'AI_CONSOLE' },
  { to: '/reporting', label: 'Reporting', hint: 'Compliance & QA', moduleKey: 'COMPLIANCE' },
  { to: '/founder', label: 'Founder', hint: 'Enterprise controls', moduleKey: 'FOUNDER' },
  { to: '/investor', label: 'Investor', hint: 'Performance snapshot', moduleKey: 'INVESTOR' },
]

export default function Sidebar() {
  const { modules, systemHealth } = useAppData()
  const moduleIndex = modules.reduce((acc, module) => {
    acc[module.module_key] = module
    return acc
  }, {})
  const filteredItems = navItems.filter((item) => {
    if (!item.moduleKey) {
      return true
    }
    const module = moduleIndex[item.moduleKey]
    return !module || (module.enabled && !module.kill_switch)
  })
  const healthLabel = systemHealth?.status === 'online' ? 'System: Online' : 'System: Degraded'
  const healthDetail = systemHealth?.upgrade?.status === 'PASS' ? 'Upgrade checks passing' : 'Upgrade checks failed'

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <span className="pulse" />
          <span className="pulse delay" />
        </div>
        <div>
          <p className="brand-title">FusonEMS</p>
          <p className="brand-subtitle">Quantum Platform</p>
        </div>
      </div>
      <nav className="nav">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <div>
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </div>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p className="status-pill">{healthLabel}</p>
        <p className="status-sub">{healthDetail}</p>
      </div>
    </aside>
  )
}
