/**
 * Voice Notes to Text - FREE Browser Speech API
 * No paid services - uses native Web Speech API
 */

interface VoiceRecordingOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

class VoiceRecorder {
  private recognition: any = null
  private isRecording: boolean = false
  private finalTranscript: string = ''
  private interimTranscript: string = ''

  constructor() {
    // Check browser support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
    }
  }

  isSupported(): boolean {
    return this.recognition !== null
  }

  start(options: VoiceRecordingOptions = {}): void {
    if (!this.isSupported()) {
      options.onError?.('Speech recognition not supported in this browser')
      return
    }

    if (this.isRecording) {
      return
    }

    // Configure recognition
    this.recognition.lang = options.language || 'en-US'
    this.recognition.continuous = options.continuous ?? true
    this.recognition.interimResults = options.interimResults ?? true
    this.recognition.maxAlternatives = options.maxAlternatives || 1

    this.finalTranscript = ''
    this.interimTranscript = ''

    // Event handlers
    this.recognition.onstart = () => {
      this.isRecording = true
      options.onStart?.()
    }

    this.recognition.onresult = (event: any) => {
      let interim = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        
        if (result.isFinal) {
          this.finalTranscript += transcript + ' '
          options.onResult?.(this.finalTranscript.trim(), true)
        } else {
          interim += transcript
        }
      }
      
      this.interimTranscript = interim
      if (interim) {
        options.onResult?.(this.finalTranscript + interim, false)
      }
    }

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      this.isRecording = false
      
      let errorMsg = 'Speech recognition error'
      switch (event.error) {
        case 'no-speech':
          errorMsg = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMsg = 'No microphone found. Please connect a microphone.'
          break
        case 'not-allowed':
          errorMsg = 'Microphone access denied. Please allow microphone access.'
          break
        case 'network':
          errorMsg = 'Network error occurred during speech recognition.'
          break
        default:
          errorMsg = `Speech recognition error: ${event.error}`
      }
      
      options.onError?.(errorMsg)
    }

    this.recognition.onend = () => {
      this.isRecording = false
      options.onEnd?.()
    }

    // Start recognition
    try {
      this.recognition.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      this.isRecording = false
      options.onError?.('Failed to start voice recording')
    }
  }

  stop(): string {
    if (this.recognition && this.isRecording) {
      this.recognition.stop()
    }
    return this.finalTranscript.trim()
  }

  getTranscript(): string {
    return this.finalTranscript.trim()
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }
}

// Singleton instance
let voiceRecorder: VoiceRecorder | null = null

export const getVoiceRecorder = (): VoiceRecorder => {
  if (!voiceRecorder) {
    voiceRecorder = new VoiceRecorder()
  }
  return voiceRecorder
}

export const isVoiceRecognitionSupported = (): boolean => {
  return getVoiceRecorder().isSupported()
}

export default getVoiceRecorder
