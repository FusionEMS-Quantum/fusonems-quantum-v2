import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../lib/api'
import { obdService, OBDData } from '../lib/obd'

interface MileageEntry {
  id: string
  incident_id: string
  incident_number: string
  unit_id: string
  start_odometer?: number
  end_odometer?: number
  start_odometer_photo?: string
  end_odometer_photo?: string
  gps_distance_km: number
  route_distance_km: number
  start_time: string
  end_time?: string
  pickup_facility: string
  destination_facility: string
  status: 'in_progress' | 'completed'
}

interface PhotoCaptureProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
  label: string
}

function PhotoCapture({ onCapture, onCancel, label }: PhotoCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photoTaken, setPhotoTaken] = useState(false)
  const videoRef = useState<HTMLVideoElement | null>(null)
  const canvasRef = useState<HTMLCanvasElement | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      // Try rear camera first (environment)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef[0]) {
        videoRef[0].srcObject = mediaStream
      }
    } catch (err) {
      console.error('Camera access failed:', err)
      alert('Unable to access camera. Please check permissions.')
    }
  }

  const capturePhoto = () => {
    if (!videoRef[0] || !canvasRef[0]) return

    const video = videoRef[0]
    const canvas = canvasRef[0]
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      const imageData = canvas.toDataURL('image/jpeg', 0.9)
      onCapture(imageData)
      setPhotoTaken(true)
      
      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-[2000] flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{label}</h2>
        <button
          onClick={onCancel}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          Cancel
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <video
          ref={(el) => { videoRef[0] = el }}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-4 border-blue-500 rounded-2xl w-4/5 h-2/3 shadow-2xl">
            <div className="absolute -top-10 left-0 right-0 text-center">
              <p className="text-white text-2xl font-bold bg-black/80 backdrop-blur px-6 py-3 rounded-xl inline-block">
                📸 Center odometer in frame
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Capture Button */}
      <div className="bg-gray-900 p-6 flex justify-center">
        <button
          onClick={capturePhoto}
          disabled={photoTaken}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold py-6 px-12 rounded-full text-2xl shadow-lg transition-all disabled:opacity-50"
        >
          {photoTaken ? '✓ Captured' : '📷 Capture'}
        </button>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={(el) => { canvasRef[0] = el }} className="hidden" />
    </div>
  )
}

export default function MileageTracking() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<MileageEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<MileageEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStartOdometer, setShowStartOdometer] = useState(false)
  const [showEndOdometer, setShowEndOdometer] = useState(false)
  const [startOdometerValue, setStartOdometerValue] = useState('')
  const [endOdometerValue, setEndOdometerValue] = useState('')
  const [captureMode, setCaptureMode] = useState<'start' | 'end' | null>(null)
  const [obdData, setObdData] = useState<OBDData | null>(null)
  const [obdConnecting, setObdConnecting] = useState(false)
  const unitId = localStorage.getItem('unit_id')

  useEffect(() => {
    fetchMileage()
    const interval = setInterval(fetchMileage, 30000) // Refresh every 30s
    
    // Check for existing OBD connection
    const storedOBD = localStorage.getItem('obd_data')
    if (storedOBD) {
      try {
        setObdData(JSON.parse(storedOBD))
      } catch (error) {
        console.error('Failed to parse stored OBD data:', error)
      }
    }
    
    // Listen for OBD updates
    const handleOBDUpdate = (event: CustomEvent) => {
      setObdData(event.detail)
    }
    
    window.addEventListener('obd-update', handleOBDUpdate as EventListener)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('obd-update', handleOBDUpdate as EventListener)
    }
  }, [])

  const fetchMileage = async () => {
    try {
      const response = await api.get(`/cad/mileage?unit_id=${unitId}`)
      setEntries(response.data.entries || [])
      setActiveEntry(response.data.active_entry || null)
    } catch (error) {
      console.error('Failed to fetch mileage:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitStartMileage = async (photo?: string) => {
    if (!activeEntry) return

    const odometerValue = obdData?.connected && obdData.odometer > 0 
      ? obdData.odometer 
      : parseFloat(startOdometerValue)
    
    if (!odometerValue) return

    try {
      await api.post(`/cad/mileage/${activeEntry.id}/start`, {
        odometer: odometerValue,
        photo: photo || null,
        source: obdData?.connected ? 'obd' : 'manual',
        vin: obdData?.vin || null,
      })
      
      setShowStartOdometer(false)
      setStartOdometerValue('')
      setCaptureMode(null)
      fetchMileage()
      alert('✓ Start mileage recorded')
    } catch (error) {
      console.error('Failed to submit start mileage:', error)
      alert('Failed to record mileage. Please try again.')
    }
  }

  const submitEndMileage = async (photo?: string) => {
    if (!activeEntry) return

    const odometerValue = obdData?.connected && obdData.odometer > 0 
      ? obdData.odometer 
      : parseFloat(endOdometerValue)
    
    if (!odometerValue) return

    try {
      await api.post(`/cad/mileage/${activeEntry.id}/end`, {
        odometer: odometerValue,
        photo: photo || null,
        source: obdData?.connected ? 'obd' : 'manual',
        vin: obdData?.vin || null,
      })
      
      setShowEndOdometer(false)
      setEndOdometerValue('')
      setCaptureMode(null)
      fetchMileage()
      alert('✓ End mileage recorded - Trip complete')
    } catch (error) {
      console.error('Failed to submit end mileage:', error)
      alert('Failed to record mileage. Please try again.')
    }
  }

  const formatMileage = (km: number) => {
    return `${km.toFixed(1)} km / ${(km * 0.621371).toFixed(1)} mi`
  }

  const connectOBD = async () => {
    setObdConnecting(true)
    try {
      const connected = await obdService.requestDevice()
      if (connected) {
        setObdData(obdService.getData())
        alert('✓ OBD-II connected successfully')
      } else {
        alert('Failed to connect OBD-II adapter. Please check connection.')
      }
    } catch (error) {
      console.error('OBD connection error:', error)
      alert('OBD-II connection failed. Ensure adapter is plugged in.')
    } finally {
      setObdConnecting(false)
    }
  }

  const disconnectOBD = async () => {
    await obdService.disconnect()
    setObdData(null)
    localStorage.removeItem('obd_data')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white">
      {/* Photo Capture Overlays */}
      {captureMode === 'start' && (
        <PhotoCapture
          label="📸 Start Odometer Photo"
          onCapture={(image) => submitStartMileage(image)}
          onCancel={() => setCaptureMode(null)}
        />
      )}
      {captureMode === 'end' && (
        <PhotoCapture
          label="📸 End Odometer Photo"
          onCapture={(image) => submitEndMileage(image)}
          onCancel={() => setCaptureMode(null)}
        />
      )}

      {/* Header */}
      <header className="bg-black/80 backdrop-blur-xl border-b border-gray-800 shadow-2xl sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/queue')} 
                className="text-3xl hover:text-blue-400 transition-colors p-2"
              >
                ⬅
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  MILEAGE TRACKING
                </h1>
                <p className="text-sm text-gray-500 font-mono">GPS + ODOMETER VERIFICATION</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400 font-mono">{unitId || 'NO UNIT'}</div>
              <div className="text-xs text-gray-500">Billing & Analytics</div>
            </div>
          </div>
        </div>
      </header>

      {/* OBD-II Status Banner */}
      {obdData?.connected ? (
        <div className="bg-gradient-to-r from-green-900/40 to-teal-900/40 border-y border-green-700/50 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🔌</div>
              <div>
                <div className="text-lg font-bold text-green-400">OBD-II Connected</div>
                <div className="text-sm text-gray-400 font-mono">
                  {obdData.vin || 'VIN not available'}
                </div>
              </div>
            </div>
            
            {/* Real-time Vehicle Data */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-black/40 rounded-lg p-2 border border-gray-700">
                <div className="text-xs text-gray-500">Speed</div>
                <div className="text-xl font-bold text-white font-mono">
                  {obdData.vehicleSpeed}
                </div>
                <div className="text-xs text-gray-500">km/h</div>
              </div>
              <div className="bg-black/40 rounded-lg p-2 border border-gray-700">
                <div className="text-xs text-gray-500">RPM</div>
                <div className="text-xl font-bold text-white font-mono">
                  {Math.round(obdData.engineRPM)}
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-2 border border-gray-700">
                <div className="text-xs text-gray-500">Fuel</div>
                <div className="text-xl font-bold text-white font-mono">
                  {Math.round(obdData.fuelLevel)}%
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-2 border border-gray-700">
                <div className="text-xs text-gray-500">Battery</div>
                <div className="text-xl font-bold text-white font-mono">
                  {obdData.batteryVoltage.toFixed(1)}V
                </div>
              </div>
            </div>
            
            <button
              onClick={disconnectOBD}
              className="text-gray-400 hover:text-white text-sm px-3 py-1 border border-gray-700 rounded"
            >
              Disconnect
            </button>
          </div>
          
          {/* Check Engine Alert */}
          {obdData.checkEngine && (
            <div className="mt-3 bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <div className="text-red-400 font-bold">CHECK ENGINE LIGHT ON</div>
                <div className="text-sm text-gray-400">Vehicle diagnostics required</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-900/30 border-y border-yellow-700/50 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🔌</div>
              <div>
                <div className="text-lg font-bold text-yellow-400">OBD-II Not Connected</div>
                <div className="text-sm text-gray-400">
                  Connect adapter for automatic odometer readings
                </div>
              </div>
            </div>
            <button
              onClick={connectOBD}
              disabled={obdConnecting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
            >
              {obdConnecting ? 'Connecting...' : 'Connect OBD-II'}
            </button>
          </div>
        </div>
      )}

      {/* Active Trip Mileage */}
      {activeEntry && (
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-y border-blue-700/50 px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🚑</span>
              <div>
                <h2 className="text-2xl font-bold text-white">Active Trip</h2>
                <p className="text-sm text-gray-400 font-mono">#{activeEntry.incident_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-black/40 rounded-xl p-4 border border-gray-700">
                <div className="text-xs text-gray-500 uppercase mb-1">From</div>
                <div className="text-white font-semibold">{activeEntry.pickup_facility}</div>
              </div>
              <div className="bg-black/40 rounded-xl p-4 border border-gray-700">
                <div className="text-xs text-gray-500 uppercase mb-1">To</div>
                <div className="text-white font-semibold">{activeEntry.destination_facility}</div>
              </div>
            </div>

            {/* GPS Distance (Real-time) */}
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-green-400 uppercase mb-1">GPS Distance (Live)</div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {formatMileage(activeEntry.gps_distance_km)}
                  </div>
                </div>
                <div className="text-5xl">📡</div>
              </div>
            </div>

            {/* Odometer Entry */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Odometer */}
              {!activeEntry.start_odometer ? (
                <div className="bg-gray-800/50 rounded-xl p-4 border-2 border-dashed border-gray-700">
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {obdData?.connected && obdData.odometer > 0 ? '🔌' : '📷'}
                    </div>
                    <div className="text-sm text-gray-400 mb-3">Start Odometer</div>
                    
                    {/* OBD Auto-Capture */}
                    {obdData?.connected && obdData.odometer > 0 ? (
                      <div>
                        <div className="text-3xl font-bold text-green-400 font-mono mb-2">
                          {obdData.odometer.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-400 mb-3">From OBD-II</div>
                        <button
                          onClick={() => submitStartMileage()}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
                        >
                          ✓ Use OBD Reading
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowStartOdometer(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
                      >
                        Enter Manually
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                  <div className="text-xs text-green-400 uppercase mb-1">Start Odometer</div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {activeEntry.start_odometer.toLocaleString()}
                  </div>
                  {activeEntry.start_odometer_photo && (
                    <div className="text-xs text-gray-500 mt-1">✓ Photo captured</div>
                  )}
                </div>
              )}

              {/* End Odometer */}
              {activeEntry.start_odometer && !activeEntry.end_odometer ? (
                <div className="bg-gray-800/50 rounded-xl p-4 border-2 border-dashed border-gray-700">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🏁</div>
                    <div className="text-sm text-gray-400 mb-3">End Odometer</div>
                    <button
                      onClick={() => setShowEndOdometer(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
                    >
                      Enter Reading
                    </button>
                  </div>
                </div>
              ) : activeEntry.end_odometer ? (
                <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4">
                  <div className="text-xs text-purple-400 uppercase mb-1">End Odometer</div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {activeEntry.end_odometer.toLocaleString()}
                  </div>
                  {activeEntry.end_odometer_photo && (
                    <div className="text-xs text-gray-500 mt-1">✓ Photo captured</div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-center text-gray-500 text-sm">
                    Complete start reading first
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Odometer Entry Modals */}
      {showStartOdometer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-[1500] flex items-center justify-center p-6">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <h3 className="text-2xl font-bold mb-4">Start Odometer Reading</h3>
            <input
              type="number"
              value={startOdometerValue}
              onChange={(e) => setStartOdometerValue(e.target.value)}
              placeholder="Enter odometer (e.g., 45678)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-2xl font-mono mb-4"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCaptureMode('start')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
              >
                📷 With Photo
              </button>
              <button
                onClick={() => submitStartMileage()}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
              >
                Skip Photo
              </button>
            </div>
            <button
              onClick={() => {
                setShowStartOdometer(false)
                setStartOdometerValue('')
              }}
              className="w-full mt-3 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showEndOdometer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-[1500] flex items-center justify-center p-6">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <h3 className="text-2xl font-bold mb-4">End Odometer Reading</h3>
            <input
              type="number"
              value={endOdometerValue}
              onChange={(e) => setEndOdometerValue(e.target.value)}
              placeholder="Enter odometer (e.g., 45710)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-2xl font-mono mb-4"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCaptureMode('end')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg"
              >
                📷 With Photo
              </button>
              <button
                onClick={() => submitEndMileage()}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
              >
                Skip Photo
              </button>
            </div>
            <button
              onClick={() => {
                setShowEndOdometer(false)
                setEndOdometerValue('')
              }}
              className="w-full mt-3 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mileage History */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Recent Trips</h2>
          
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No mileage entries</div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-gray-400">#{entry.incident_number}</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      entry.status === 'completed' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'
                    }`}>
                      {entry.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">GPS</div>
                      <div className="font-semibold">{entry.gps_distance_km.toFixed(1)} km</div>
                    </div>
                    {entry.start_odometer && entry.end_odometer && (
                      <div>
                        <div className="text-gray-500">Odometer</div>
                        <div className="font-semibold">
                          {(entry.end_odometer - entry.start_odometer).toFixed(1)} km
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-500">Time</div>
                      <div className="font-semibold">
                        {format(new Date(entry.start_time), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
