import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FleetDashboard from './pages/FleetDashboard'
import AIInsights from './pages/AIInsights'
import SubscriptionSettings from './pages/SubscriptionSettings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FleetDashboard />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/settings" element={<SubscriptionSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
