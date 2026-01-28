import api from './api'

export interface ScheduledShift {
  id: number
  org_id: number
  definition_id?: number
  schedule_period_id?: number
  shift_date: string
  start_datetime: string
  end_datetime: string
  status: 'pending' | 'published' | 'confirmed' | 'completed' | 'cancelled'
  station_id?: number
  station_name?: string
  unit_id?: number
  unit_name?: string
  required_staff: number
  assigned_count: number
  notes?: string
  is_open: boolean
  is_overtime: boolean
  is_critical: boolean
}

export interface ShiftAssignment {
  id: number
  shift_id: number
  user_id: number
  role_on_shift: string
  status: 'assigned' | 'confirmed' | 'declined' | 'completed' | 'no_show'
  assigned_at: string
  acknowledged_at?: string
  shift?: ScheduledShift
}

export interface MyScheduleItem {
  shift: ScheduledShift
  assignment: ShiftAssignment
}

export interface SwapRequest {
  id: number
  requester_id: number
  requester_assignment_id: number
  target_user_id?: number
  target_assignment_id?: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason?: string
  created_at: string
  requester_shift?: ScheduledShift
  target_shift?: ScheduledShift
}

export interface TimeOffRequest {
  id: number
  user_id: number
  start_date: string
  end_date: string
  time_off_type: 'vacation' | 'sick' | 'personal' | 'training' | 'bereavement' | 'jury_duty' | 'fmla' | 'other'
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  reason?: string
  reviewer_notes?: string
  created_at: string
}

export interface Availability {
  id?: number
  date: string
  availability_type: 'available' | 'unavailable' | 'preferred' | 'if_needed'
  start_time?: string
  end_time?: string
  notes?: string
}

export interface DashboardStats {
  total_shifts: number
  upcoming_shifts: number
  hours_this_week: number
  hours_this_month: number
  pending_requests: number
  overtime_hours: number
}

export interface CoverageData {
  date: string
  required: number
  assigned: number
  coverage_percent: number
}

export const schedulingApi = {
  getMySchedule: async (startDate?: string, endDate?: string): Promise<MyScheduleItem[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const response = await api.get(`/scheduling/my-schedule?${params}`)
    return response.data
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/scheduling/dashboard/stats')
    return response.data
  },

  getCoverageAnalysis: async (startDate: string, endDate: string): Promise<CoverageData[]> => {
    const response = await api.get(`/scheduling/coverage-analysis?start_date=${startDate}&end_date=${endDate}`)
    return response.data
  },

  acknowledgeAssignment: async (assignmentId: number): Promise<void> => {
    await api.post(`/scheduling/assignments/${assignmentId}/acknowledge`)
  },

  getMyTimeOffRequests: async (): Promise<TimeOffRequest[]> => {
    const response = await api.get('/scheduling/time-off')
    return response.data
  },

  createTimeOffRequest: async (data: {
    start_date: string
    end_date: string
    time_off_type: string
    reason?: string
  }): Promise<TimeOffRequest> => {
    const response = await api.post('/scheduling/time-off', data)
    return response.data
  },

  cancelTimeOffRequest: async (requestId: number): Promise<void> => {
    await api.delete(`/scheduling/time-off/${requestId}`)
  },

  getSwapRequests: async (): Promise<SwapRequest[]> => {
    const response = await api.get('/scheduling/swap-requests')
    return response.data
  },

  createSwapRequest: async (assignmentId: number, reason?: string): Promise<SwapRequest> => {
    const response = await api.post('/scheduling/swap-requests', {
      requester_assignment_id: assignmentId,
      reason,
    })
    return response.data
  },

  respondToSwapRequest: async (
    requestId: number,
    action: 'accept' | 'decline',
    targetAssignmentId?: number
  ): Promise<void> => {
    await api.post(`/scheduling/swap-requests/${requestId}/${action}`, {
      target_assignment_id: targetAssignmentId,
    })
  },

  getMyAvailability: async (startDate: string, endDate: string): Promise<Availability[]> => {
    const response = await api.get(`/scheduling/availability?start_date=${startDate}&end_date=${endDate}`)
    return response.data
  },

  submitAvailability: async (availability: Availability[]): Promise<void> => {
    await api.post('/scheduling/availability/bulk', { availability })
  },

  exportMyScheduleICS: async (startDate?: string, endDate?: string): Promise<Blob> => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const response = await api.get(`/scheduling/export/my-schedule/ics?${params}`, {
      responseType: 'blob',
    })
    return response.data
  },

  exportMySchedulePDF: async (startDate?: string, endDate?: string): Promise<Blob> => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const response = await api.get(`/scheduling/export/my-schedule/pdf?${params}`, {
      responseType: 'blob',
    })
    return response.data
  },

  getShiftGoogleCalendarUrl: async (shiftId: number): Promise<string> => {
    const response = await api.get(`/scheduling/export/shift/${shiftId}/google-calendar-url`)
    return response.data.google_calendar_url
  },

  exportShiftICS: async (shiftId: number): Promise<Blob> => {
    const response = await api.get(`/scheduling/export/shift/${shiftId}/ics`, {
      responseType: 'blob',
    })
    return response.data
  },
}

export default schedulingApi
