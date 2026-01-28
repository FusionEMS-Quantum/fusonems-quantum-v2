import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MySchedule from './pages/MySchedule'
import TimeOff from './pages/TimeOff'
import Timesheet from './pages/Timesheet'
import Certifications from './pages/Certifications'
import Profile from './pages/Profile'
import PayStubs from './pages/PayStubs'
import Team from './pages/Team'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="schedule" element={<MySchedule />} />
          <Route path="timeoff" element={<TimeOff />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="certifications" element={<Certifications />} />
          <Route path="paystubs" element={<PayStubs />} />
          <Route path="team" element={<Team />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
