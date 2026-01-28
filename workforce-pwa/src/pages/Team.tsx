import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Phone, Mail, MessageSquare, Search, ChevronRight } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  role: string
  station: string
  phone: string
  email: string
  avatar?: string
  status: 'available' | 'on-duty' | 'off'
}

const mockTeam: TeamMember[] = [
  { id: '1', name: 'John Smith', role: 'Paramedic', station: 'Station 1', phone: '555-0101', email: 'john@agency.com', status: 'on-duty' },
  { id: '2', name: 'Jane Doe', role: 'EMT-Basic', station: 'Station 1', phone: '555-0102', email: 'jane@agency.com', status: 'available' },
  { id: '3', name: 'Mike Johnson', role: 'Paramedic', station: 'Station 2', phone: '555-0103', email: 'mike@agency.com', status: 'on-duty' },
  { id: '4', name: 'Sarah Williams', role: 'EMT-Advanced', station: 'Station 2', phone: '555-0104', email: 'sarah@agency.com', status: 'off' },
  { id: '5', name: 'Chris Brown', role: 'EMT-Basic', station: 'Station 3', phone: '555-0105', email: 'chris@agency.com', status: 'available' },
  { id: '6', name: 'Emily Davis', role: 'Paramedic', station: 'Station 3', phone: '555-0106', email: 'emily@agency.com', status: 'on-duty' },
]

const statusConfig = {
  'on-duty': { color: 'bg-emerald-500', label: 'On Duty' },
  'available': { color: 'bg-blue-500', label: 'Available' },
  'off': { color: 'bg-slate-500', label: 'Off' },
}

export default function Team() {
  const [search, setSearch] = useState('')
  const [stationFilter, setStationFilter] = useState<string | null>(null)

  const stations = [...new Set(mockTeam.map(m => m.station))]
  
  const filtered = mockTeam.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                          m.role.toLowerCase().includes(search.toLowerCase())
    const matchesStation = !stationFilter || m.station === stationFilter
    return matchesSearch && matchesStation
  })

  const onDutyCount = mockTeam.filter(m => m.status === 'on-duty').length

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-slate-400 text-sm">{onDutyCount} members on duty</p>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search team members..."
          className="input pl-10"
        />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setStationFilter(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${!stationFilter ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          All
        </button>
        {stations.map(station => (
          <button
            key={station}
            onClick={() => setStationFilter(stationFilter === station ? null : station)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${stationFilter === station ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {station}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${statusConfig[member.status].color} border-2 border-slate-800`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{member.name}</p>
                <p className="text-slate-400 text-sm">{member.role}</p>
                <p className="text-slate-500 text-xs">{member.station}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <a href={`tel:${member.phone}`} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Phone className="w-5 h-5" />
                </a>
                <a href={`mailto:${member.email}`} className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No team members found</p>
        </div>
      )}
    </div>
  )
}
