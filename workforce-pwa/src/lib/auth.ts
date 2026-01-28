import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
  org_id: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  setLoading: (loading: boolean) => void
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setLoading: (loading) => set({ isLoading: loading }),
      login: async (email, password) => {
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })
          if (!res.ok) return false
          const data = await res.json()
          set({ user: data.user, token: data.access_token, isAuthenticated: true, isLoading: false })
          return true
        } catch {
          return false
        }
      },
      logout: () => set({ user: null, token: null, isAuthenticated: false })
    }),
    { name: 'workforce-auth', onRehydrateStorage: () => (state) => state?.setLoading(false) }
  )
)
