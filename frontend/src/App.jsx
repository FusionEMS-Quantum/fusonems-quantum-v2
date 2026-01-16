import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './Dashboard.jsx'
import Landing from './pages/Landing.jsx'
import CadManagement from './pages/CadManagement.jsx'
import UnitTracking from './pages/UnitTracking.jsx'
import PatientCare from './pages/PatientCare.jsx'
import Scheduling from './pages/Scheduling.jsx'
import Billing from './pages/Billing.jsx'
import AiConsole from './pages/AiConsole.jsx'
import Reporting from './pages/Reporting.jsx'
import FounderDashboard from './pages/FounderDashboard.jsx'
import InvestorDashboard from './pages/InvestorDashboard.jsx'
import Communications from './pages/Communications.jsx'
import Telehealth from './pages/Telehealth.jsx'
import AutomationCompliance from './pages/AutomationCompliance.jsx'
import FireDashboard from './pages/FireDashboard.jsx'
import FireIncidents from './pages/FireIncidents.jsx'
import FireApparatus from './pages/FireApparatus.jsx'
import FirePersonnel from './pages/FirePersonnel.jsx'
import FireTraining from './pages/FireTraining.jsx'
import FirePrevention from './pages/FirePrevention.jsx'
import HemsDashboard from './pages/HemsDashboard.jsx'
import HemsMissionBoard from './pages/HemsMissionBoard.jsx'
import HemsMissionView from './pages/HemsMissionView.jsx'
import HemsClinical from './pages/HemsClinical.jsx'
import HemsAircraft from './pages/HemsAircraft.jsx'
import HemsCrew from './pages/HemsCrew.jsx'
import HemsQA from './pages/HemsQA.jsx'
import HemsBilling from './pages/HemsBilling.jsx'
import RepairConsole from './pages/RepairConsole.jsx'
import DataExports from './pages/DataExports.jsx'
import Layout from './components/Layout.jsx'
import { AppProvider } from './context/AppContext.jsx'

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cad" element={<CadManagement />} />
          <Route path="/tracking" element={<UnitTracking />} />
          <Route path="/epcr" element={<PatientCare />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/ai-console" element={<AiConsole />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/telehealth" element={<Telehealth />} />
          <Route path="/automation" element={<AutomationCompliance />} />
          <Route path="/fire" element={<FireDashboard />} />
          <Route path="/fire/incidents" element={<FireIncidents />} />
          <Route path="/fire/apparatus" element={<FireApparatus />} />
          <Route path="/fire/personnel" element={<FirePersonnel />} />
          <Route path="/fire/training" element={<FireTraining />} />
          <Route path="/fire/prevention" element={<FirePrevention />} />
          <Route path="/hems" element={<HemsDashboard />} />
          <Route path="/hems/missions" element={<HemsMissionBoard />} />
          <Route path="/hems/missions/:missionId" element={<HemsMissionView />} />
          <Route path="/hems/chart/:missionId" element={<HemsClinical />} />
          <Route path="/hems/aircraft" element={<HemsAircraft />} />
          <Route path="/hems/crew" element={<HemsCrew />} />
          <Route path="/hems/qa" element={<HemsQA />} />
          <Route path="/hems/billing" element={<HemsBilling />} />
          <Route path="/repair" element={<RepairConsole />} />
          <Route path="/exports" element={<DataExports />} />
          <Route path="/reporting" element={<Reporting />} />
          <Route path="/founder" element={<FounderDashboard />} />
          <Route path="/investor" element={<InvestorDashboard />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </AppProvider>
  )
}
