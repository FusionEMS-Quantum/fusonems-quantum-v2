import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ActiveTrip from './pages/ActiveTrip'
import TripHistory from './pages/TripHistory'
import DispatchQueue from './pages/DispatchQueue'
import DispatchMessages from './pages/DispatchMessages'
import MileageTracking from './pages/MileageTracking'
import NavigationView from './pages/NavigationView'

function App() {
  const isAuthenticated = !!localStorage.getItem('auth_token')

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/active-trip/:id" 
        element={isAuthenticated ? <ActiveTrip /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/navigate/:id" 
        element={isAuthenticated ? <NavigationView /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/queue" 
        element={isAuthenticated ? <DispatchQueue /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/messages" 
        element={isAuthenticated ? <DispatchMessages /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/mileage" 
        element={isAuthenticated ? <MileageTracking /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/history" 
        element={isAuthenticated ? <TripHistory /> : <Navigate to="/login" />} 
      />
      <Route path="/" element={<Navigate to="/queue" />} />
    </Routes>
  )
}

export default App
