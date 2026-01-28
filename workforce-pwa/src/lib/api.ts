import { useAuth } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuth.getState()
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' })
}

export const hrApi = {
  getSchedule: (start: string, end: string) => api.get<any[]>(`/api/v1/hr/schedule?start=${start}&end=${end}`),
  getTimeOff: () => api.get<any[]>('/api/v1/hr/timeoff'),
  requestTimeOff: (data: any) => api.post('/api/v1/hr/timeoff', data),
  getTimesheet: (periodId: string) => api.get<any>(`/api/v1/hr/timesheet/${periodId}`),
  clockIn: () => api.post('/api/v1/hr/timesheet/clock-in', {}),
  clockOut: () => api.post('/api/v1/hr/timesheet/clock-out', {}),
  getCertifications: () => api.get<any[]>('/api/v1/hr/certifications'),
  getPayStubs: () => api.get<any[]>('/api/v1/hr/paystubs'),
  getProfile: () => api.get<any>('/api/v1/hr/profile'),
  updateProfile: (data: any) => api.put('/api/v1/hr/profile', data),
  getTeam: () => api.get<any[]>('/api/v1/hr/team'),
  swapShift: (shiftId: string, targetUserId: string) => api.post('/api/v1/hr/schedule/swap', { shiftId, targetUserId })
}
