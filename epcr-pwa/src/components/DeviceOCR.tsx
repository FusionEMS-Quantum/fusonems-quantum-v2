import { useState } from 'react'
import { PhotoCapture } from './TouchUI'
import { ocr } from '../lib/api'
import type { DeviceData } from '../types'

interface DeviceOCRProps {
  onOcrData: (data: DeviceData) => void
  patientId: string
}

export interface OCRResult {
  deviceType: 'cardiac_monitor' | 'ventilator' | 'iv_pump' | 'glucometer' | 'capnograph'
  confidence: number
  timestamp: string
  vitals?: {
    heartRate?: number
    bloodPressureSystolic?: number
    bloodPressureDiastolic?: number
    pulseOximetry?: number
    respiratoryRate?: number
    temperature?: number
  }
  ventilator?: {
    mode: string
    breathRate: number
    tidalVolume: number
    fio2: number
    peep: number
    peakPressure: number
    plateauPressure: number
  }
  iv_pump?: {
    medications: Array<{
      name: string
      rate: number
      dose: number
      concentration: string
      isRunning: boolean
    }>
  }
  glucose?: {
    value: number
    units: string
    timestamp: string
  }
  etco2?: {
    value: number
    waveform: boolean
  }
}

const DeviceTemplates = {
  cardiac_monitor: {
    fields: ['HR', 'BP', 'RR', 'SpO2', 'Temp'],
    display: 'Cardiac Monitor',
    color: 'bg-red-900/20 border-red-600',
    icon: '📟'
  },
  ventilator: {
    fields: ['Mode', 'RR', 'TV', 'FiO2', 'PEEP'],
    display: 'Ventilator',
    color: 'bg-blue-900/20 border-blue-600',
    icon: '🌬️'
  },
  iv_pump: {
    fields: ['Med Name', 'Rate', 'Dose', 'Vol Given'],
    display: 'IV Pump',
    color: 'bg-green-900/20 border-green-600',
    icon: '💧'
  },
  glucometer: {
    fields: ['Glucose', 'Timestamp'],
    display: 'Glucometer',
    color: 'bg-yellow-900/20 border-yellow-600',
    icon: '🩸'
  },
  capnograph: {
    fields: ['ETCO2', 'Waveform'],
    display: 'Capnography',
    color: 'bg-purple-900/20 border-purple-600',
    icon: '💾'
  }
}

export default function DeviceOCR({ onOcrData, patientId }: DeviceOCRProps) {
  const [selectedDevice, setSelectedDevice] = useState<keyof typeof DeviceTemplates | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const handlePhotoCapture = async (imageData: string) => {
    if (!selectedDevice) return
    
    setCapturedImage(imageData)
    setIsProcessing(true)
    
    try {
      // Call backend Ollama OCR
      const response = await ocr.scanDeviceBase64(selectedDevice, imageData)
      const ocrData = response.data
      
      setOcrResult({
        deviceType: selectedDevice,
        confidence: calculateOverallConfidence(ocrData),
        timestamp: new Date().toISOString(),
        ...parseOCRResponse(ocrData, selectedDevice)
      })
      
      // Auto-populate ePCR with confidence-weighted data
      if (ocrData) {
        onOcrData({
          deviceType: selectedDevice,
          extractedData: ocrData,
          confidence: calculateOverallConfidence(ocrData),
          patientId,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('OCR processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const calculateOverallConfidence = (ocrData: any): number => {
    if (!ocrData.fields || ocrData.fields.length === 0) return 0
    const total = ocrData.fields.reduce((sum: number, f: any) => sum + (f.confidence || 0), 0)
    return Math.round(total / ocrData.fields.length)
  }
  
  const parseOCRResponse = (ocrData: any, deviceType: string) => {
    const result: any = {}
    
    if (deviceType === 'cardiac_monitor' && ocrData.fields) {
      result.vitals = {
        heartRate: extractFieldValue(ocrData.fields, 'heart_rate'),
        bloodPressureSystolic: extractFieldValue(ocrData.fields, 'systolic_bp'),
        bloodPressureDiastolic: extractFieldValue(ocrData.fields, 'diastolic_bp'),
        pulseOximetry: extractFieldValue(ocrData.fields, 'spo2'),
        respiratoryRate: extractFieldValue(ocrData.fields, 'respiratory_rate'),
        temperature: extractFieldValue(ocrData.fields, 'temperature'),
      }
    }
    
    if (deviceType === 'ventilator' && ocrData.settings) {
      result.ventilator = {
        mode: ocrData.mode || 'Unknown',
        breathRate: extractFieldValue(ocrData.settings, 'respiratory_rate'),
        tidalVolume: extractFieldValue(ocrData.settings, 'tidal_volume'),
        fio2: extractFieldValue(ocrData.settings, 'fio2'),
        peep: extractFieldValue(ocrData.settings, 'peep'),
        peakPressure: extractFieldValue(ocrData.settings, 'peak_pressure'),
        plateauPressure: extractFieldValue(ocrData.settings, 'plateau_pressure'),
      }
    }
    
    if (deviceType === 'glucometer' && ocrData.fields) {
      result.glucose = {
        value: extractFieldValue(ocrData.fields, 'glucose_value'),
        units: 'mg/dL',
        timestamp: new Date().toISOString(),
      }
    }
    
    return result
  }
  
  const extractFieldValue = (fields: any[], fieldName: string): any => {
    const field = fields.find((f: any) => f.name === fieldName)
    return field ? (isNaN(field.value) ? field.value : parseFloat(field.value)) : null
  }
  
  const validateAndApplyOCR = () => {
    if (!ocrResult) return
    
    // Apply confirmed OCR data
    const confirmedData = {
      deviceType: ocrResult.deviceType,
      extractedData: ocrResult,
      confidence: ocrResult.confidence,
      patientId,
      timestamp: new Date().toISOString(),
      confirmedBy: localStorage.getItem('userName') || 'Provider'
    }
    
    onOcrData(confirmedData)
    // Reset
    setOcrResult(null)
    setCapturedImage(null)
    setSelectedDevice(null)
  }
  
  if (!selectedDevice) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Device OCR Capture</h2>
        <p className="text-gray-400 mb-6">
          Point camera at device screen to auto-extract vitals and settings using Ollama AI.
        </p>
        
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {(Object.keys(DeviceTemplates) as Array<keyof typeof DeviceTemplates>).map((device) => {
            const template = DeviceTemplates[device]
            return (
              <button
                key={device}
                onClick={() => setSelectedDevice(device)}
                className={`
                  p-6 rounded-lg border-2 transition-all duration-150
                  text-center hover:scale-105 active:scale-95
                  ${template.color}
                `}
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <div className="font-medium">{template.display}</div>
                <div className="text-xs text-gray-400 mt-2">
                  Tap to start OCR
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{DeviceTemplates[selectedDevice].icon}</span>
          <span className="font-semibold text-lg">{DeviceTemplates[selectedDevice].display}</span>
        </div>
        <button
          onClick={() => {
            setSelectedDevice(null)
            setOcrResult(null)
            setCapturedImage(null)
          }}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Change Device
        </button>
      </div>
      
      <div className={`
        rounded-lg border-2 p-4
        ${DeviceTemplates[selectedDevice].color}
      `}>
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onError={(error) => console.error('Camera error:', error)}
          photoType="device"
        />
      </div>

      {isProcessing && (
        <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full" />
            <span>Analyzing device screen with Ollama AI...</span>
          </div>
        </div>
      )}

      {capturedImage && ocrResult && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">Extracted Data</span>
              <span className={`px-3 py-1 rounded text-sm ${
                ocrResult.confidence > 80 ? 'bg-green-900 text-green-300' :
                ocrResult.confidence > 60 ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                {ocrResult.confidence}% Confidence
              </span>
            </div>
            
            {ocrResult.vitals && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">Heart Rate</label>
                  <div className="text-lg font-semibold">{ocrResult.vitals.heartRate || '-'}</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">Blood Pressure</label>
                  <div className="text-lg font-semibold">{ocrResult.vitals.bloodPressureSystolic || '-'}/{ocrResult.vitals.bloodPressureDiastolic || '-'}</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">SpO2</label>
                  <div className="text-lg font-semibold">{ocrResult.vitals.pulseOximetry ? `${ocrResult.vitals.pulseOximetry}%` : '-'}</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">Temperature</label>
                  <div className="text-lg font-semibold">{ocrResult.vitals.temperature || '-'}</div>
                </div>
              </div>
            )}
            
            {ocrResult.ventilator && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">Mode</label>
                  <div className="text-sm font-semibold">{ocrResult.ventilator.mode}</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">Breath Rate</label>
                  <div className="text-lg font-semibold">{ocrResult.ventilator.breathRate || '-'}</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">Tidal Volume</label>
                  <div className="text-lg font-semibold">{ocrResult.ventilator.tidalVolume || '-'} mL</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">FiO2</label>
                  <div className="text-lg font-semibold">{ocrResult.ventilator.fio2 || '-'}%</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <label className="text-xs text-gray-400 mb-1">PEEP</label>
                  <div className="text-lg font-semibold">{ocrResult.ventilator.peep || '-'} cmH2O</div>
                </div>
              </div>
            )}

            {ocrResult.glucose && (
              <div className="bg-gray-800 rounded p-3 mb-4">
                <label className="text-xs text-gray-400 mb-1">Blood Glucose</label>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">{ocrResult.glucose.value}</div>
                  <div className="text-sm text-gray-400">{ocrResult.glucose.units}</div>
                </div>
              </div>
            )}
          </div>
        
          <div className="flex gap-4">
            <button
              onClick={() => {
                setCapturedImage(null)
                setOcrResult(null)
              }}
              className="px-6 py-3 bg-gray-600 rounded-lg hover:bg-gray-500"
            >
              Discard
            </button>
            <button
              onClick={validateAndApplyOCR}
              className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
            >
              Apply to Record
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
