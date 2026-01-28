import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { CREW_ROLES, type NEMSISCrewRole, type CrewRoleConfig } from '../types'

type LoginStep = 'credentials' | 'role_selection'

export default function Login() {
  const [step, setStep] = useState<LoginStep>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<NEMSISCrewRole | null>(null)
  const [availableRoles, setAvailableRoles] = useState<CrewRoleConfig[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleCredentialSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { username, password })
      localStorage.setItem('auth_token', response.data.token)
      localStorage.setItem('user_id', response.data.user_id)
      localStorage.setItem('crew_name', response.data.crew_name)
      
      const userRoles = response.data.allowed_roles || []
      const userIsHEMS = response.data.is_hems_certified || false
      const userIsGround = response.data.is_ground_certified !== false
      
      const filtered = CREW_ROLES.filter(role => {
        if (userRoles.length > 0 && !userRoles.includes(role.code)) return false
        if (role.isHEMS && !userIsHEMS) return false
        if (role.isGround && !userIsGround) return false
        return true
      })
      
      if (filtered.length === 0) {
        setAvailableRoles(CREW_ROLES.filter(r => r.isGround))
      } else {
        setAvailableRoles(filtered)
      }
      
      setStep('role_selection')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedRole) {
      setError('Please select your role for this shift')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const roleConfig = CREW_ROLES.find(r => r.code === selectedRole)
      
      await api.post('/crewlink/set-role', {
        role: selectedRole,
        response_role: roleConfig?.nemsisResponseRole,
        nemsis_crew_level: roleConfig?.nemsisCrewMemberLevel,
      })
      
      localStorage.setItem('crew_role', selectedRole)
      localStorage.setItem('nemsis_crew_level', roleConfig?.nemsisCrewMemberLevel || '')
      localStorage.setItem('nemsis_response_role', roleConfig?.nemsisResponseRole || '')
      localStorage.setItem('is_hems', String(roleConfig?.isHEMS || false))
      localStorage.setItem('can_see_flight_info', String(roleConfig?.canSeeFlightInfo || false))
      localStorage.setItem('can_see_pilot_info', String(roleConfig?.canSeePilotInfo || false))
      
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set role')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'role_selection') {
    const groundRoles = availableRoles.filter(r => r.isGround && !r.isHEMS)
    const hemsRoles = availableRoles.filter(r => r.isHEMS)
    const cctRoles = availableRoles.filter(r => r.code.startsWith('CCT'))
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">Select Your Role</h1>
              <p className="text-gray-400 text-sm">What role are you working today?</p>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              {groundRoles.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Ground Transport</div>
                  <div className="grid grid-cols-2 gap-2">
                    {groundRoles.map((role) => (
                      <button
                        key={role.code}
                        type="button"
                        onClick={() => setSelectedRole(role.code)}
                        className={`p-3 rounded-lg text-left border-2 transition-all ${
                          selectedRole === role.code
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium text-sm">{role.label}</div>
                        <div className="text-xs text-gray-400">{role.nemsisResponseRole.replace('_', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cctRoles.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Critical Care</div>
                  <div className="grid grid-cols-2 gap-2">
                    {cctRoles.map((role) => (
                      <button
                        key={role.code}
                        type="button"
                        onClick={() => setSelectedRole(role.code)}
                        className={`p-3 rounded-lg text-left border-2 transition-all ${
                          selectedRole === role.code
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium text-sm">{role.label}</div>
                        <div className="text-xs text-gray-400">{role.nemsisResponseRole.replace('_', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hemsRoles.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">HEMS / Air Medical</div>
                  <div className="grid grid-cols-1 gap-2">
                    {hemsRoles.map((role) => (
                      <button
                        key={role.code}
                        type="button"
                        onClick={() => setSelectedRole(role.code)}
                        className={`p-3 rounded-lg text-left border-2 transition-all ${
                          selectedRole === role.code
                            ? 'border-orange-500 bg-orange-500/20 text-white'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-gray-400">
                          {role.canSeePilotInfo ? 'Flight deck access' : 'Medical crew'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedRole}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting Shift...' : 'Start Shift'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setStep('credentials')
                  localStorage.removeItem('auth_token')
                }}
                className="w-full text-gray-400 hover:text-white text-sm py-2"
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-500 mb-2">CrewLink</h1>
            <p className="text-gray-400">Medical Transport & HEMS</p>
          </div>

          <form onSubmit={handleCredentialSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            NEMSIS v3.5 Compliant
          </div>
        </div>
      </div>
    </div>
  )
}
