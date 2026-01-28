const API_BASE = '/api'

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

export const fleetAPI = {
  getVehicles: () => fetchAPI('/fleet/vehicles'),
  getTelemetry: (vehicleId: number) => fetchAPI(`/fleet/vehicles/${vehicleId}/telemetry`),
  getMaintenance: () => fetchAPI('/fleet/maintenance?status=scheduled,in_progress'),
  getDVIRToday: () => {
    const today = new Date().toISOString().split('T')[0]
    return fetchAPI(`/fleet/dvir?start_date=${today}&end_date=${today}`)
  },
}
