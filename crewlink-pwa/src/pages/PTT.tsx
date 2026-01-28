import { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleContext } from '../App'
import { hasModule } from '../lib/modules'
import { initSocket } from '../lib/socket'
import { getPTTChannels, sendPTTMessage } from '../lib/api'
import { playPTTStart, playPTTEnd, playPTTEmergency } from '../lib/notifications'
import type { PTTChannel, PTTMessage } from '../types'

export default function PTT() {
  const modules = useContext(ModuleContext)
  const navigate = useNavigate()
  const [channels, setChannels] = useState<PTTChannel[]>([])
  const [activeChannel, setActiveChannel] = useState<PTTChannel | null>(null)
  const [isTransmitting, setIsTransmitting] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null)
  const [recentMessages, setRecentMessages] = useState<PTTMessage[]>([])
  const [isEmergency, setIsEmergency] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!hasModule(modules, 'ptt')) {
      navigate('/')
      return
    }

    getPTTChannels().then((data) => {
      setChannels(data)
      const defaultChannel = data.find((c: PTTChannel) => c.is_default) || data[0]
      setActiveChannel(defaultChannel)
    })

    const socket = initSocket()

    socket.on('ptt:transmission:start', (data: { channel_id: string; sender_name: string; is_emergency?: boolean }) => {
      if (data.channel_id === activeChannel?.id) {
        setIsReceiving(true)
        setCurrentSpeaker(data.sender_name)
        if (data.is_emergency) {
          playPTTEmergency()
          setIsEmergency(true)
        }
      }
    })

    socket.on('ptt:transmission:end', (data: { channel_id: string; message: PTTMessage }) => {
      if (data.channel_id === activeChannel?.id) {
        setIsReceiving(false)
        setCurrentSpeaker(null)
        setRecentMessages((prev) => [data.message, ...prev].slice(0, 10))
        playAudio(data.message.audio_url)
      }
    })

    socket.on('ptt:emergency', () => {
      playPTTEmergency()
      setIsEmergency(true)
      setTimeout(() => setIsEmergency(false), 5000)
    })

    return () => {
      socket.off('ptt:transmission:start')
      socket.off('ptt:transmission:end')
      socket.off('ptt:emergency')
    }
  }, [modules, navigate, activeChannel?.id])

  const playAudio = async (url: string) => {
    try {
      const audio = new Audio(url)
      await audio.play()
    } catch (e) {
      console.error('Failed to play audio:', e)
    }
  }

  const startTransmission = async () => {
    if (!activeChannel) return
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new AudioContext()
      audioChunksRef.current = []
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }
      mediaRecorderRef.current.start()
      setIsTransmitting(true)
      playPTTStart()

      const socket = initSocket()
      socket.emit('ptt:transmission:start', {
        channel_id: activeChannel.id,
        is_emergency: isEmergency,
      })
    } catch (e) {
      console.error('Failed to start transmission:', e)
      alert('Microphone access required for PTT')
    }
  }

  const stopTransmission = async () => {
    if (!mediaRecorderRef.current || !activeChannel) return

    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())

    await new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = resolve
      }
    })

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    setIsTransmitting(false)
    playPTTEnd()

    try {
      await sendPTTMessage(activeChannel.id, audioBlob, isEmergency)
      if (isEmergency) setIsEmergency(false)
    } catch (e) {
      console.error('Failed to send PTT message:', e)
    }
  }

  const handleEmergency = () => {
    setIsEmergency(true)
    playPTTEmergency()
    const socket = initSocket()
    socket.emit('ptt:emergency', { channel_id: activeChannel?.id })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-2xl">←</button>
        <h1 className="font-semibold">Push to Talk</h1>
        <div className="w-8" />
      </header>

      <div className="bg-gray-800 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${
                activeChannel?.id === channel.id
                  ? 'bg-blue-600'
                  : 'bg-gray-700'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {isEmergency && (
        <div className="bg-red-600 px-4 py-2 text-center font-bold animate-pulse">
          EMERGENCY TRANSMISSION
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {isReceiving && (
          <div className="mb-8 text-center">
            <div className="w-24 h-24 mx-auto bg-green-600 rounded-full flex items-center justify-center animate-pulse mb-4">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-xl font-semibold">{currentSpeaker}</div>
            <div className="text-gray-400">is speaking...</div>
          </div>
        )}

        {!isReceiving && (
          <div className="text-center mb-8">
            <div className="text-gray-400 mb-2">Channel</div>
            <div className="text-2xl font-bold">{activeChannel?.name || 'Select Channel'}</div>
            <div className="text-gray-500 text-sm mt-1">{activeChannel?.members_count} members</div>
          </div>
        )}

        <button
          onTouchStart={startTransmission}
          onTouchEnd={stopTransmission}
          onMouseDown={startTransmission}
          onMouseUp={stopTransmission}
          onMouseLeave={() => isTransmitting && stopTransmission()}
          disabled={!activeChannel || isReceiving}
          className={`w-48 h-48 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isTransmitting
              ? 'bg-red-600 scale-110 shadow-red-600/50'
              : isReceiving
              ? 'bg-gray-700 opacity-50'
              : isEmergency
              ? 'bg-red-600 animate-pulse shadow-red-600/50'
              : 'bg-blue-600 active:bg-blue-500 shadow-blue-600/30'
          }`}
        >
          <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="mt-6 text-center text-sm text-gray-400">
          {isTransmitting ? 'TRANSMITTING - Release to send' : 'Hold to talk'}
        </div>

        <button
          onClick={handleEmergency}
          className={`mt-8 px-6 py-3 rounded-lg font-bold ${
            isEmergency
              ? 'bg-red-800 text-red-200'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isEmergency ? 'EMERGENCY ACTIVE' : 'EMERGENCY'}
        </button>
      </main>

      {recentMessages.length > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="text-xs text-gray-500 uppercase mb-2">Recent Transmissions</div>
          <div className="space-y-2">
            {recentMessages.slice(0, 3).map((msg) => (
              <button
                key={msg.id}
                onClick={() => playAudio(msg.audio_url)}
                className="w-full bg-gray-700 rounded-lg p-3 text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-sm">{msg.sender_name}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()} • {msg.duration_sec}s
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
