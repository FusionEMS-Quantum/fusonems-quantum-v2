import axios from 'axios'

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function apiFetch(path, options = {}) {
  const response = await apiClient.request({
    url: path,
    method: options.method || 'GET',
    data: options.body ? JSON.parse(options.body) : undefined,
    headers: options.headers,
  })

  return response.data
}
