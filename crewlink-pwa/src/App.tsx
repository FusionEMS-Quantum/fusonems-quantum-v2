import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TripDetails from './pages/TripDetails'
import PTT from './pages/PTT'
import History from './pages/History'
import Settings from './pages/Settings'
import Directory from './pages/Directory'
import Messages from './pages/Messages'
import Scanner from './pages/Scanner'
import { requestNotificationPermission } from './lib/notifications'
import { getEnabledModules, type EnabledModules } from './lib/modules'

export const ModuleContext = React.createContext<EnabledModules | null>(null)

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = !!localStorage.getItem('auth_token')
  const hasRole = !!localStorage.getItem('crew_role')
  
  if (!isAuthenticated) return <Navigate to="/login" />
  if (!hasRole) return <Navigate to="/login" />
  
  return <>{children}</>
}

function App() {
  const [modules, setModules] = useState<EnabledModules | null>(null)
  const isAuthenticated = !!localStorage.getItem('auth_token')

  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission()
      getEnabledModules().then(setModules)
    }
  }, [isAuthenticated])

  return (
    <ModuleContext.Provider value={modules}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/trip/:id" element={<PrivateRoute><TripDetails /></PrivateRoute>} />
        <Route path="/ptt" element={<PrivateRoute><PTT /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/directory" element={<PrivateRoute><Directory /></PrivateRoute>} />
        <Route path="/scanner" element={<PrivateRoute><Scanner /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ModuleContext.Provider>
  )
}

export default App
