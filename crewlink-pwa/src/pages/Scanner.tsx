import { useState, useRef } from 'react'
import api from '../lib/api'
import type { ScannedDocument } from '../types'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

type DocType = 'FACESHEET' | 'PCS_FORM' | 'AOB_FORM' | 'DNR' | 'OTHER'

const DOC_TYPES: { value: DocType; label: string; description: string }[] = [
  { value: 'FACESHEET', label: 'Facesheet', description: 'Patient demographics from facility' },
  { value: 'PCS_FORM', label: 'PCS Form', description: 'Physician Certification Statement' },
  { value: 'AOB_FORM', label: 'AOB Form', description: 'Assignment of Benefits' },
  { value: 'DNR', label: 'DNR/POLST', description: 'Do Not Resuscitate order' },
  { value: 'OTHER', label: 'Other', description: 'Other document type' },
]

export default function Scanner() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [docType, setDocType] = useState<DocType>('FACESHEET')
  const [processing, setProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<ScannedDocument | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const activeTripId = localStorage.getItem('active_trip_id')

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      setStream(mediaStream)
      setShowCamera(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setError('Camera access denied. Please use file upload.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const captureFromCamera = () => {
    if (!videoRef.current) return
    
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setCapturedImage(dataUrl)
      stopCamera()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const processDocument = async () => {
    if (!capturedImage) return
    
    setProcessing(true)
    setError('')
    
    try {
      const response = await api.post('/crewlink/documents/scan', {
        image_data: capturedImage,
        document_type: docType,
        trip_id: activeTripId,
      })
      
      setOcrResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process document')
    } finally {
      setProcessing(false)
    }
  }

  const submitDocument = async () => {
    if (!ocrResult) return
    
    setProcessing(true)
    setError('')
    
    try {
      await api.post('/crewlink/documents/submit', {
        document_id: ocrResult.id,
        trip_id: activeTripId,
        attach_to_epcr: !!activeTripId,
      })
      
      alert(activeTripId ? 'Document attached to ePCR' : 'Document queued for attachment')
      resetScanner()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit document')
    } finally {
      setProcessing(false)
    }
  }

  const resetScanner = () => {
    setCapturedImage(null)
    setOcrResult(null)
    setError('')
    stopCamera()
  }

  if (ocrResult) {
    return (
      <div className="min-h-screen bg-dark text-white flex flex-col">
        <PageHeader variant="subpage" showBack onBack={resetScanner} title="Review Document" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="crewlink-card overflow-hidden rounded-card-lg">
            <img src={capturedImage!} alt="Scanned" className="w-full" />
          </div>
          <div className="crewlink-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-white">{DOC_TYPES.find(d => d.value === docType)?.label}</span>
              <span className={`px-2.5 py-1 rounded-button text-xs font-medium ${
                (ocrResult.ocr_confidence || 0) >= 80 ? 'bg-emerald-600' :
                (ocrResult.ocr_confidence || 0) >= 60 ? 'bg-amber-600' : 'bg-red-600'
              }`}>
                {ocrResult.ocr_confidence}% confidence
              </span>
            </div>
            {Object.keys(ocrResult.ocr_fields).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(ocrResult.ocr_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted">{key.replace(/_/g, ' ')}</span>
                    <span className="text-muted-light">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-sm">OCR could not extract structured fields. The document image will be attached.</div>
            )}
          </div>
          <div className={`rounded-card p-4 ${activeTripId ? 'bg-emerald-900/30 border border-emerald-600/50' : 'bg-amber-900/25 border border-amber-600/50'}`}>
            {activeTripId ? (
              <div className="text-sm">
                <span className="font-semibold text-emerald-400">Active Trip Detected</span>
                <p className="text-muted-light mt-1">Document will be attached directly to the ePCR</p>
              </div>
            ) : (
              <div className="text-sm">
                <span className="font-semibold text-amber-400">No Active Trip</span>
                <p className="text-muted-light mt-1">Document will be queued for later attachment</p>
              </div>
            )}
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-button text-sm">{error}</div>
          )}
        </main>
        <div className="p-4 bg-surface border-t border-border shadow-nav space-y-2">
          <button onClick={submitDocument} disabled={processing} className="w-full crewlink-btn-primary py-3 disabled:opacity-50">
            {processing ? 'Submitting...' : activeTripId ? 'Attach to ePCR' : 'Queue Document'}
          </button>
          <button onClick={resetScanner} className="w-full crewlink-btn-secondary py-3">Scan Another</button>
        </div>
      </div>
    )
  }

  if (capturedImage) {
    return (
      <div className="min-h-screen bg-dark text-white flex flex-col">
        <PageHeader variant="subpage" showBack onBack={resetScanner} title="Confirm Image" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="crewlink-card overflow-hidden rounded-card-lg">
            <img src={capturedImage} alt="Captured" className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-light mb-2">Document Type</label>
            <div className="space-y-2">
              {DOC_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setDocType(type.value)}
                  className={`w-full p-3 rounded-card text-left border-2 transition-all ${
                    docType === type.value ? 'border-primary bg-primary/20 text-white' : 'border-border bg-surface-elevated text-muted-light hover:border-muted'
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-button text-sm">{error}</div>
          )}
        </main>
        <div className="p-4 bg-surface border-t border-border shadow-nav space-y-2">
          <button onClick={processDocument} disabled={processing} className="w-full crewlink-btn-primary py-3 disabled:opacity-50">
            {processing ? 'Processing OCR...' : 'Process Document'}
          </button>
          <button onClick={resetScanner} className="w-full crewlink-btn-secondary py-3">Retake</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      <PageHeader variant="subpage" showBack title="Scan Document" />
      {showCamera ? (
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex gap-4 justify-center">
              <button onClick={stopCamera} className="bg-surface-elevated hover:bg-card-hover p-4 rounded-full border border-border transition-colors">
                <svg className="w-8 h-8 text-muted-light" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button onClick={captureFromCamera} className="bg-white p-4 rounded-full hover:bg-gray-100 transition-colors active:scale-95">
                <svg className="w-10 h-10 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <div className="absolute inset-4 border-2 border-white/30 rounded-card pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          </div>
        </div>
      ) : (
        <main className="flex-1 p-4 flex flex-col items-center justify-center gap-6">
          <div className="text-center mb-4">
            <div className="w-24 h-24 mx-auto mb-4 bg-surface-elevated rounded-2xl flex items-center justify-center border border-border shadow-card">
              <svg className="w-12 h-12 text-muted" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Scan Paper Documents</h2>
            <p className="text-muted text-sm">Capture facesheet, PCS, AOB, or DNR forms to attach to ePCR</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <button onClick={startCamera} className="w-full crewlink-btn-primary py-4 px-6 rounded-card flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Use Camera
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full crewlink-btn-secondary py-4 px-6 rounded-card flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Choose from Gallery
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-button max-w-sm text-sm">{error}</div>
          )}
        </main>
      )}
      <BottomNav />
    </div>
  )
}
