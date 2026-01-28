import { useState, useEffect, useRef } from 'react'
import { Search, Building2, Clock, Database, AlertCircle, CheckCircle } from 'lucide-react'

interface Facility {
  id: string
  name: string
  address: string
  type: 'recent' | 'internal' | 'cms' | 'freetext'
  classification?: string
  cms_provider_id?: string
  last_used?: string
  suggested_nemsis_type?: string
}

interface FacilitySearchProps {
  value: string
  onChange: (value: string, facility?: Facility) => void
  onNEMSISConfirm?: (nemsisType: string, facility: Facility) => void
  placeholder?: string
  label: string
  required?: boolean
}

export default function FacilitySearch({ 
  value, 
  onChange, 
  onNEMSISConfirm,
  placeholder = 'Start typing facility name...',
  label,
  required = false
}: FacilitySearchProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Facility[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
  const [showNEMSISPrompt, setShowNEMSISPrompt] = useState(false)
  const [nemsisType, setNemsisType] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const nemsisDestinationTypes = [
    { code: '2221001', label: 'Clinic / Physician Office' },
    { code: '2221003', label: 'Diagnostic Lab' },
    { code: '2221005', label: 'Dialysis Center' },
    { code: '2221007', label: 'Free Standing Emergency Department' },
    { code: '2221009', label: 'Hospital - Specialty' },
    { code: '2221011', label: 'Hospice Facility' },
    { code: '2221013', label: 'Imaging Center' },
    { code: '2221015', label: 'Morgue/Mortuary' },
    { code: '2221017', label: 'Nursing Home' },
    { code: '2221019', label: 'Other Medical Facility' },
    { code: '2221021', label: 'Outpatient Surgery / Ambulatory Surgery Center' },
    { code: '2221023', label: 'Psychiatric Hospital' },
    { code: '2221025', label: 'Rehabilitation Facility' },
    { code: '2221027', label: 'Residence / Home' },
    { code: '2221029', label: 'Skilled Nursing Facility' },
    { code: '2221031', label: 'Urgent Care Clinic' },
    { code: '2221033', label: 'Hospital - Medical Center' }
  ]

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchFacilities = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    const mockRecentFacilities: Facility[] = [
      { 
        id: 'recent-1', 
        name: 'St. Mary\'s Hospital', 
        address: '123 Medical Center Dr, New York, NY', 
        type: 'recent',
        classification: 'Hospital - Medical Center',
        suggested_nemsis_type: '2221033',
        last_used: '2 hours ago'
      },
      { 
        id: 'recent-2', 
        name: 'Valley View Nursing Home', 
        address: '456 Care Blvd, Brooklyn, NY', 
        type: 'recent',
        classification: 'Skilled Nursing Facility',
        suggested_nemsis_type: '2221029',
        last_used: 'Today'
      }
    ]

    const mockInternalFacilities: Facility[] = [
      { 
        id: 'internal-1', 
        name: 'Metropolitan Hospital', 
        address: '789 Health Ave, Manhattan, NY', 
        type: 'internal',
        classification: 'Hospital - Medical Center',
        suggested_nemsis_type: '2221033'
      },
      { 
        id: 'internal-2', 
        name: 'Sunrise Dialysis Center', 
        address: '321 Treatment Ln, Queens, NY', 
        type: 'internal',
        classification: 'Dialysis Center',
        suggested_nemsis_type: '2221005'
      }
    ]

    const mockCMSFacilities: Facility[] = [
      { 
        id: 'cms-1', 
        name: 'Harbor View Medical Center', 
        address: '999 Bay St, Staten Island, NY', 
        type: 'cms',
        classification: 'Hospital - Medical Center',
        suggested_nemsis_type: '2221033',
        cms_provider_id: 'CMS-330123'
      },
      { 
        id: 'cms-2', 
        name: 'Coastal Rehabilitation Facility', 
        address: '555 Recovery Rd, Bronx, NY', 
        type: 'cms',
        classification: 'Rehabilitation Facility',
        suggested_nemsis_type: '2221025',
        cms_provider_id: 'CMS-445678'
      }
    ]

    const filterFacilities = (facilities: Facility[]) => {
      const lowerQuery = searchQuery.toLowerCase()
      return facilities.filter(f => 
        f.name.toLowerCase().includes(lowerQuery) ||
        f.address.toLowerCase().includes(lowerQuery) ||
        f.name.toLowerCase().replace('saint', 'st').includes(lowerQuery) ||
        f.name.toLowerCase().replace('st.', 'saint').includes(lowerQuery)
      )
    }

    const recent = filterFacilities(mockRecentFacilities)
    const internal = filterFacilities(mockInternalFacilities)
    const cms = filterFacilities(mockCMSFacilities)

    const freeTextOption: Facility = {
      id: 'freetext',
      name: searchQuery,
      address: 'Use as entered',
      type: 'freetext'
    }

    setSuggestions([...recent, ...internal, ...cms, freeTextOption])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    onChange(newQuery)
    setIsOpen(true)
    searchFacilities(newQuery)
  }

  const handleSelectFacility = (facility: Facility) => {
    setQuery(facility.name)
    setSelectedFacility(facility)
    onChange(facility.name, facility)
    setIsOpen(false)

    if (facility.type !== 'freetext' && onNEMSISConfirm) {
      setNemsisType(facility.suggested_nemsis_type || '')
      setShowNEMSISPrompt(true)
    }
  }

  const handleNEMSISConfirm = () => {
    if (selectedFacility && nemsisType && onNEMSISConfirm) {
      onNEMSISConfirm(nemsisType, selectedFacility)
      setShowNEMSISPrompt(false)
    }
  }

  const getFacilityIcon = (type: Facility['type']) => {
    switch (type) {
      case 'recent': return <Clock className="h-4 w-4 text-blue-400" />
      case 'internal': return <Building2 className="h-4 w-4 text-green-400" />
      case 'cms': return <Database className="h-4 w-4 text-yellow-400" />
      case 'freetext': return <Search className="h-4 w-4 text-gray-400" />
    }
  }

  const getFacilityTypeLabel = (type: Facility['type']) => {
    switch (type) {
      case 'recent': return 'Recently Used'
      case 'internal': return 'Internal System'
      case 'cms': return 'CMS-Associated · Reference Only'
      case 'freetext': return 'Free Text Entry'
    }
  }

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true)
            if (query) searchFacilities(query)
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-10 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none transition"
          required={required}
        />
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />

        {selectedFacility && selectedFacility.type === 'cms' && (
          <div className="absolute right-3 top-3 inline-flex items-center space-x-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
            <Database className="h-3 w-3" />
            <span>CMS Reference</span>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl max-h-96 overflow-y-auto"
        >
          {suggestions.map((facility, idx) => (
            <button
              key={facility.id}
              type="button"
              onClick={() => handleSelectFacility(facility)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition border-b border-white/5 last:border-b-0"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getFacilityIcon(facility.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-white truncate">{facility.name}</span>
                    {facility.type === 'cms' && (
                      <span className="flex-shrink-0 inline-flex items-center space-x-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                        <Database className="h-3 w-3" />
                        <span>CMS · Reference Only</span>
                      </span>
                    )}
                    {facility.type === 'recent' && facility.last_used && (
                      <span className="flex-shrink-0 text-xs text-blue-400">
                        {facility.last_used}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 truncate">{facility.address}</div>
                  {facility.classification && (
                    <div className="text-xs text-gray-500 mt-1">{facility.classification}</div>
                  )}
                  <div className="text-xs text-gray-600 mt-1 flex items-center space-x-1">
                    <span>{getFacilityTypeLabel(facility.type)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedFacility && selectedFacility.type === 'cms' && !showNEMSISPrompt && (
        <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-yellow-400 mb-1">CMS-Associated Facility Selected</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                This facility is from CMS reference data and should be confirmed with the caller. 
                CMS data is reference-only and not authoritative.
              </div>
              {selectedFacility.cms_provider_id && (
                <div className="text-xs text-gray-500 mt-2">
                  Provider ID: {selectedFacility.cms_provider_id}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNEMSISPrompt && selectedFacility && (
        <div className="mt-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-start space-x-3 mb-3">
            <CheckCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-orange-400 mb-1">Confirm NEMSIS Destination Type</div>
              <div className="text-xs text-gray-400 leading-relaxed mb-3">
                Please confirm the NEMSIS destination type for this facility (eDisposition.21)
              </div>
            </div>
          </div>

          <select
            value={nemsisType}
            onChange={(e) => setNemsisType(e.target.value)}
            className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none mb-3"
          >
            <option value="">Select NEMSIS Destination Type</option>
            {nemsisDestinationTypes.map(type => (
              <option key={type.code} value={type.code}>
                {type.label} ({type.code})
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleNEMSISConfirm}
              disabled={!nemsisType}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Confirm Destination Type
            </button>
            <button
              type="button"
              onClick={() => setShowNEMSISPrompt(false)}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10 transition text-sm"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
