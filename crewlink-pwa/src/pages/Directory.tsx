import { useState, useEffect } from 'react'
import api from '../lib/api'
import type { HospitalDirectory } from '../types'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

type FacilityType = 'ALL' | 'HOSPITAL' | 'NURSING_FACILITY' | 'DIALYSIS' | 'HELIPAD'

export default function Directory() {
  const [facilities, setFacilities] = useState<HospitalDirectory[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FacilityType>('ALL')
  const [loading, setLoading] = useState(true)
  const [selectedFacility, setSelectedFacility] = useState<HospitalDirectory | null>(null)

  useEffect(() => {
    loadFacilities()
  }, [])

  const loadFacilities = async () => {
    try {
      const response = await api.get('/crewlink/facilities')
      setFacilities(response.data)
    } catch {
      setFacilities([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = facilities.filter(f => {
    if (filter !== 'ALL' && f.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return f.name.toLowerCase().includes(q) || f.city.toLowerCase().includes(q)
    }
    return true
  })

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`
  }

  const renderBadges = (facility: HospitalDirectory) => {
    const badges = []
    if (facility.is_trauma_center) badges.push(`Trauma ${facility.trauma_level}`)
    if (facility.is_stroke_center) badges.push('Stroke')
    if (facility.is_stemi_center) badges.push('STEMI')
    if (facility.is_burn_center) badges.push('Burn')
    if (facility.is_peds_center) badges.push('Pediatric')
    return badges
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <PageHeader variant="subpage" showBack title="Hospital Directory" />
      <div className="p-4 space-y-3 border-b border-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search facilities..."
          className="crewlink-input"
        />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['ALL', 'HOSPITAL', 'NURSING_FACILITY', 'DIALYSIS', 'HELIPAD'] as FacilityType[]).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-pill text-sm whitespace-nowrap font-medium transition-colors ${
                filter === type ? 'bg-primary text-white' : 'bg-surface-elevated text-muted-light hover:bg-card-hover border border-border'
              }`}
            >
              {type === 'ALL' ? 'All' : type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-muted text-sm">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted font-medium">No facilities found</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map((facility) => (
              <div
                key={facility.id}
                onClick={() => setSelectedFacility(facility)}
                className="crewlink-card p-4 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{facility.name}</div>
                    <div className="text-sm text-muted">{facility.city}, {facility.state}</div>
                    {renderBadges(facility).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {renderBadges(facility).map((badge, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-600/30 text-red-300 text-xs rounded-button border border-red-500/30">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCall(facility.main_phone)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-full flex-shrink-0 transition-colors active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedFacility && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end z-50 animate-fade-in" onClick={() => setSelectedFacility(null)}>
          <div className="bg-surface border-t border-border w-full rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto shadow-card-hover animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedFacility.name}</h2>
                <p className="text-muted text-sm">{selectedFacility.type.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setSelectedFacility(null)} className="p-2 text-muted hover:text-white rounded-button hover:bg-surface-elevated transition-colors text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted uppercase tracking-wide">Address</div>
                <div className="text-muted-light">{selectedFacility.address}</div>
                <div className="text-muted-light">{selectedFacility.city}, {selectedFacility.state} {selectedFacility.zip}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCall(selectedFacility.main_phone)}
                  className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-card flex flex-col items-center transition-colors active:scale-[0.98]"
                >
                  <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-sm">Main</span>
                  <span className="text-xs text-green-200">{selectedFacility.main_phone}</span>
                </button>

                {selectedFacility.er_phone && (
                  <button
                    onClick={() => handleCall(selectedFacility.er_phone!)}
                    className="bg-red-600 hover:bg-red-500 p-4 rounded-card flex flex-col items-center transition-colors active:scale-[0.98]"
                  >
                    <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span className="text-sm">ER Direct</span>
                    <span className="text-xs text-red-200">{selectedFacility.er_phone}</span>
                  </button>
                )}

                {selectedFacility.dispatch_phone && (
                  <button
                    onClick={() => handleCall(selectedFacility.dispatch_phone!)}
                    className="bg-primary hover:bg-primary-hover p-4 rounded-card flex flex-col items-center transition-colors active:scale-[0.98]"
                  >
                    <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span className="text-sm">Dispatch</span>
                    <span className="text-xs text-blue-200">{selectedFacility.dispatch_phone}</span>
                  </button>
                )}

                {selectedFacility.helipad_phone && (
                  <button
                    onClick={() => handleCall(selectedFacility.helipad_phone!)}
                    className="bg-orange-600 hover:bg-orange-500 p-4 rounded-card flex flex-col items-center transition-colors active:scale-[0.98]"
                  >
                    <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span className="text-sm">Helipad</span>
                    <span className="text-xs text-orange-200">{selectedFacility.helipad_phone}</span>
                  </button>
                )}
              </div>

              {selectedFacility.helipad_radio_freq && (
                <div className="bg-surface-elevated border border-border p-3 rounded-card">
                  <div className="text-xs text-muted uppercase tracking-wide">Helipad Radio Frequency</div>
                  <div className="font-mono text-lg text-white mt-1">{selectedFacility.helipad_radio_freq}</div>
                </div>
              )}
              {renderBadges(selectedFacility).length > 0 && (
                <div>
                  <div className="text-xs text-muted uppercase tracking-wide mb-2">Certifications</div>
                  <div className="flex flex-wrap gap-2">
                    {renderBadges(selectedFacility).map((badge, i) => (
                      <span key={i} className="px-3 py-1 bg-red-600/30 text-red-300 rounded-pill text-sm border border-red-500/30">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedFacility.notes && (
                <div>
                  <div className="text-xs text-muted uppercase tracking-wide">Notes</div>
                  <div className="text-muted-light text-sm mt-1">{selectedFacility.notes}</div>
                </div>
              )}
              {selectedFacility.latitude && selectedFacility.longitude && (
                <button
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedFacility.latitude},${selectedFacility.longitude}`,
                      '_blank'
                    )
                  }}
                  className="w-full crewlink-btn-secondary p-4 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Navigate
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
