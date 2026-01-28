import { Routes, Route } from 'react-router-dom'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Intake from './pages/Intake'
import TransportLinkLogin from './pages/TransportLinkLogin'
import TelehealthLogin from './pages/TelehealthLogin'
import PayBill from './pages/PayBill'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/transportlink/login" element={<TransportLinkLogin />} />
      <Route path="/telehealth/login" element={<TelehealthLogin />} />
      <Route path="/pay-bill" element={<PayBill />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/intake" element={<Intake />} />
    </Routes>
  )
}

export default App
