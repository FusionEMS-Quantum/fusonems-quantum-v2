import api from './api'

export interface EnabledModules {
  paging: boolean
  ptt: boolean
  messaging: boolean
  hems: boolean
  hemsWeather: boolean
  hemsFrat: boolean
  hemsDutyTime: boolean
  hemsNotams: boolean
  locationSharing: boolean
  tripHistory: boolean
}

export const getEnabledModules = async (): Promise<EnabledModules> => {
  try {
    const response = await api.get('/crewlink/modules')
    return response.data
  } catch {
    return {
      paging: true,
      ptt: true,
      messaging: true,
      hems: false,
      hemsWeather: false,
      hemsFrat: false,
      hemsDutyTime: false,
      hemsNotams: false,
      locationSharing: true,
      tripHistory: true,
    }
  }
}

export const hasModule = (modules: EnabledModules | null, module: keyof EnabledModules): boolean => {
  if (!modules) return false
  return modules[module] === true
}
