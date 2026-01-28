import axios from 'axios'
import { ssoAuth } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  // Try SSO token first
  const ssoToken = ssoAuth.getAccessToken()
  if (ssoToken) {
    config.headers.Authorization = `Bearer ${ssoToken}`
    return config
  }
  
  // Fall back to legacy token
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      // Try to refresh SSO token
      if (ssoAuth.isAuthenticated()) {
        try {
          await ssoAuth.refresh()
          const token = ssoAuth.getAccessToken()
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        } catch (refreshError) {
          ssoAuth.logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export const createIncident = async (data: any) => {
  const response = await api.post('/incidents', data)
  return response.data
}

export const getIncidents = async () => {
  const response = await api.get('/incidents')
  return response.data
}

export const getIncident = async (id: string) => {
  const response = await api.get(`/incidents/${id}`)
  return response.data
}

export const getRecommendations = async (incidentId: string) => {
  const response = await api.post('/assignments/recommend', { incident_id: incidentId })
  return response.data
}

export const assignUnit = async (incidentId: string, unitId: string) => {
  const response = await api.post('/assignments/assign', {
    incident_id: incidentId,
    unit_id: unitId
  })
  return response.data
}

export const getUnits = async () => {
  const response = await api.get('/units')
  return response.data
}

export default api
