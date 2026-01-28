import React, { useEffect, useState, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Checkout from './pages/Checkout'
import Dashboard from './pages/Dashboard'
import Patient from './pages/Patient'
import Vitals from './pages/Vitals'
import Assessment from './pages/Assessment'
import Interventions from './pages/Interventions'
import Medications from './pages/Medications'
import Narrative from './pages/Narrative'
import Inventory from './pages/Inventory'
import { initSocket, disconnectSocket } from './lib/socket'

interface AppContextType {
  checkoutComplete: boolean
  setCheckoutComplete: (v: boolean) => void
  activeRecordId: string | null
  setActiveRecordId: (id: string | null) => void
}

const AppCtx = createContext<AppContextType>({
  checkoutComplete: false,
  setCheckoutComplete: () => {},
  activeRecordId: null,
  setActiveRecordId: () => {},
})

export const useApp = () => useContext(AppCtx)

function PrivateRoute({ children, requireCheckout = true }: { children: React.ReactNode; requireCheckout?: boolean }) {
  const checkoutDone = localStorage.getItem('checkoutComplete') === 'true'
  const unitId = localStorage.getItem('unitId')
  
  if (!unitId) return <Navigate to="/login" />
  if (requireCheckout && !checkoutDone) return <Navigate to="/checkout" />
  
  return <>{children}</>
}

function App() {
  const [checkoutComplete, setCheckoutComplete] = useState(localStorage.getItem('checkoutComplete') === 'true')
  const [activeRecordId, setActiveRecordId] = useState<string | null>(localStorage.getItem('activeRecordId'))
  const unitId = localStorage.getItem('unitId')

  useEffect(() => {
    if (unitId) {
      const socket = initSocket(unitId)
      
      socket.on('crewlink:trip_acknowledged', (data: { tripId: string; incidentNumber: string }) => {
        localStorage.setItem('pendingIncident', JSON.stringify(data))
        window.dispatchEvent(new CustomEvent('crewlink:trip', { detail: data }))
      })

      socket.on('mdt:timestamp', (data: { timestampType: string; timestamp: string }) => {
        window.dispatchEvent(new CustomEvent('mdt:timestamp', { detail: data }))
      })

      return () => {
        socket.off('crewlink:trip_acknowledged')
        socket.off('mdt:timestamp')
        disconnectSocket()
      }
    }
  }, [unitId])

  const handleCheckoutComplete = (v: boolean) => {
    setCheckoutComplete(v)
    localStorage.setItem('checkoutComplete', String(v))
  }

  const handleSetActiveRecord = (id: string | null) => {
    setActiveRecordId(id)
    if (id) localStorage.setItem('activeRecordId', id)
    else localStorage.removeItem('activeRecordId')
  }

  return (
    <AppCtx.Provider value={{ 
      checkoutComplete, 
      setCheckoutComplete: handleCheckoutComplete, 
      activeRecordId, 
      setActiveRecordId: handleSetActiveRecord 
    }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/checkout" element={
          unitId ? <Checkout /> : <Navigate to="/login" />
        } />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/patient/:recordId" element={<PrivateRoute><Patient /></PrivateRoute>} />
        <Route path="/vitals/:recordId" element={<PrivateRoute><Vitals /></PrivateRoute>} />
        <Route path="/assessment/:recordId" element={<PrivateRoute><Assessment /></PrivateRoute>} />
        <Route path="/interventions/:recordId" element={<PrivateRoute><Interventions /></PrivateRoute>} />
        <Route path="/medications/:recordId" element={<PrivateRoute><Medications /></PrivateRoute>} />
        <Route path="/narrative/:recordId" element={<PrivateRoute><Narrative /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AppCtx.Provider>
  )
}

export default App
