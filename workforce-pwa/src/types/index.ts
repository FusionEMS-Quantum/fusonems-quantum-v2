export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
  org_id: string
}

export interface Shift {
  id: string
  date: Date
  type: 'day' | 'night' | 'swing'
  start: string
  end: string
  station: string
  partner?: string
}

export interface TimeOffRequest {
  id: string
  type: 'pto' | 'sick' | 'personal' | 'bereavement'
  startDate: Date
  endDate: Date
  hours: number
  status: 'pending' | 'approved' | 'denied'
  reason?: string
}

export interface TimeEntry {
  id: string
  date: Date
  clockIn: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  totalHours?: number
  status: 'working' | 'completed' | 'pending'
}

export interface Certification {
  id: string
  name: string
  issuer: string
  issueDate: Date
  expiryDate: Date
  status: 'active' | 'expiring' | 'expired'
  documentUrl?: string
}

export interface PayStub {
  id: string
  periodStart: Date
  periodEnd: Date
  payDate: Date
  grossPay: number
  netPay: number
  regularHours: number
  overtimeHours: number
  deductions: { name: string; amount: number }[]
}

export interface TeamMember {
  id: string
  name: string
  role: string
  station: string
  phone: string
  email: string
  avatar?: string
  status: 'available' | 'on-duty' | 'off'
}
