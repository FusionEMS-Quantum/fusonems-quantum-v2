import React, { useState, useEffect } from 'react'
import { Mic, MicOff, Save } from 'lucide-react'
import { getVoiceRecorder, isVoiceRecognitionSupported } from '../../lib/voiceToText'

interface VoiceNoteInputProps {
  onTranscriptChange?: (transcript: string) => void
  onSave?: (transcript: string) => void
  placeholder?: string
  className?: string
}

const VoiceNoteInput: React.FC<VoiceNoteInputProps> = ({
  onTranscriptChange,
  onSave,
  placeholder = 'Click microphone to record...',
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsSupported(isVoiceRecognitionSupported())
  }, [])

  const handleStartRecording = () => {
    if (!isSupported) {
      setError('Voice recognition not supported in this browser')
      return
    }

    setError('')
    const recorder = getVoiceRecorder()

    recorder.start({
      language: 'en-US',
      continuous: true,
      interimResults: true,
      onResult: (text, isFinal) => {
        setTranscript(text)
        onTranscriptChange?.(text)
      },
      onError: (errorMsg) => {
        setError(errorMsg)
        setIsRecording(false)
      },
      onStart: () => {
        setIsRecording(true)
      },
      onEnd: () => {
        setIsRecording(false)
      }
    })
  }

  const handleStopRecording = () => {
    const recorder = getVoiceRecorder()
    const finalTranscript = recorder.stop()
    setTranscript(finalTranscript)
    setIsRecording(false)
    onTranscriptChange?.(finalTranscript)
  }

  const handleSave = () => {
    if (transcript.trim()) {
      onSave?.(transcript)
    }
  }

  const handleClear = () => {
    setTranscript('')
    setError('')
    onTranscriptChange?.('')
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`
            p-3 rounded-full transition-all
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            text-white shadow-lg
          `}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <div className="flex-1">
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value)
              onTranscriptChange?.(e.target.value)
            }}
            placeholder={placeholder}
            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>Recording... Speak clearly into your microphone</span>
        </div>
      )}

      <div className="flex gap-2">
        {transcript.trim() && (
          <>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save size={16} />
              Save Note
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default VoiceNoteInput
