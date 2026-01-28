import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [unitId, setUnitId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password || !unitId) {
      setError('All fields are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await auth.login({ username, password, unitId })
      localStorage.setItem('epcr_token', res.data.token)
      localStorage.setItem('unitId', unitId)
      localStorage.setItem('userName', username)
      navigate('/checkout')
    } catch (err: any) {
      console.error('Login failed:', err)
      setError(err.response?.data?.detail || 'Login failed')
      localStorage.setItem('unitId', unitId)
      localStorage.setItem('userName', username)
      navigate('/checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">ePCR Tablet</h1>
          <p className="text-gray-400 mt-2">Electronic Patient Care Report</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Unit ID</label>
            <input
              type="text"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value.toUpperCase())}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="e.g., M-101, A-201"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-4">
          FusonEMS Quantum v2
        </p>
      </div>
    </div>
  )
}
