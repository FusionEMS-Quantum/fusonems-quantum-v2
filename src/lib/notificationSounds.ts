/**
 * FREE Browser Sound Notification System
 * Uses Web Audio API (built into all modern browsers - $0 cost)
 * 
 * LOCKED NOTIFICATION TYPES (from user spec):
 * - Payment received (high-value = positive alert)
 * - Denial (high-impact = urgent alert)
 * - Agency message (subtle ping)
 * - Fax received
 * - Claim status change
 */

type NotificationSound = 
  | 'payment'       // Positive "cha-ching" for payments >$1000
  | 'payment-small' // Subtle chime for smaller payments
  | 'denial-urgent' // Urgent alert for high-impact denials
  | 'denial-soft'   // Soft notification for routine denials
  | 'message'       // Subtle ping for agency messages
  | 'fax'           // Distinct tone for fax arrival
  | 'alert'         // General alert

interface QuietHours {
  start: string // "22:00"
  end: string   // "08:00"
}

class NotificationSoundManager {
  private audioContext: AudioContext | null = null
  private volume: number = 0.7
  private quietHours: QuietHours | null = null
  private enabled: boolean = true
  
  // Sound frequency mappings (FREE - programmatically generated)
  private frequencies: Record<NotificationSound, { freq: number[], duration: number }> = {
    'payment': { freq: [800, 1000, 1200], duration: 0.15 },        // Rising chime
    'payment-small': { freq: [600, 800], duration: 0.1 },          // Quick beep
    'denial-urgent': { freq: [400, 350, 400], duration: 0.2 },     // Alert pattern
    'denial-soft': { freq: [500], duration: 0.15 },                // Single tone
    'message': { freq: [600], duration: 0.08 },                    // Quick ping
    'fax': { freq: [700, 900], duration: 0.12 },                   // Two-tone
    'alert': { freq: [800], duration: 0.15 }                       // Standard beep
  }
  
  constructor() {
    // Initialize AudioContext on first user interaction (browser requirement)
    if (typeof window !== 'undefined') {
      document.addEventListener('click', () => this.initAudioContext(), { once: true })
    }
  }
  
  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }
  
  private isQuietHours(): boolean {
    if (!this.quietHours) return false
    
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const { start, end } = this.quietHours
    
    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime < end
    }
    
    return currentTime >= start && currentTime < end
  }
  
  /**
   * Play notification sound (FREE - Web Audio API)
   */
  playSound(type: NotificationSound) {
    if (!this.enabled || this.isQuietHours()) return
    
    this.initAudioContext()
    if (!this.audioContext) return
    
    const { freq, duration } = this.frequencies[type]
    const ctx = this.audioContext
    const now = ctx.currentTime
    
    // Create sound chain
    const gainNode = ctx.createGain()
    gainNode.connect(ctx.destination)
    gainNode.gain.value = this.volume
    
    // Play each frequency in sequence
    freq.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator()
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      oscillator.connect(gainNode)
      
      const startTime = now + (index * duration)
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    })
  }
  
  /**
   * Show desktop notification (FREE - Browser Notification API)
   */
  async showDesktopNotification(
    title: string,
    body: string,
    options?: {
      icon?: string
      tag?: string
      requireInteraction?: boolean
    }
  ) {
    if (!('Notification' in window)) return
    
    // Request permission if needed
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: options?.icon || '/icon-notification.png',
        tag: options?.tag,
        requireInteraction: options?.requireInteraction || false,
        silent: this.isQuietHours()
      })
    }
  }
  
  /**
   * Combined notification: sound + desktop alert
   */
  notify(params: {
    type: NotificationSound
    title: string
    body: string
    icon?: string
    requireInteraction?: boolean
  }) {
    this.playSound(params.type)
    this.showDesktopNotification(params.title, params.body, {
      icon: params.icon,
      tag: params.type,
      requireInteraction: params.requireInteraction
    })
  }
  
  // Configuration methods
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }
  
  setQuietHours(start: string, end: string) {
    this.quietHours = { start, end }
  }
  
  clearQuietHours() {
    this.quietHours = null
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
  
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
}

// Singleton instance
export const notificationManager = new NotificationSoundManager()

// Convenience functions matching user spec
export const notifyPayment = (amount: number) => {
  const isHighValue = amount >= 1000
  
  notificationManager.notify({
    type: isHighValue ? 'payment' : 'payment-small',
    title: 'Payment Received',
    body: `$${amount.toLocaleString()} payment posted`,
    requireInteraction: isHighValue
  })
}

export const notifyDenial = (claimId: string, impact: 'high' | 'low', reason: string) => {
  notificationManager.notify({
    type: impact === 'high' ? 'denial-urgent' : 'denial-soft',
    title: `Claim ${impact === 'high' ? 'Denied - Action Required' : 'Denial Notice'}`,
    body: `Claim ${claimId}: ${reason}`,
    requireInteraction: impact === 'high'
  })
}

export const notifyAgencyMessage = (sender: string, subject: string) => {
  notificationManager.notify({
    type: 'message',
    title: 'Agency Message',
    body: `${sender}: ${subject}`
  })
}

export const notifyFax = (fromNumber: string, pages: number) => {
  notificationManager.notify({
    type: 'fax',
    title: 'Fax Received',
    body: `${pages} page(s) from ${fromNumber}`
  })
}

export const notifyClaimStatus = (claimId: string, status: string) => {
  notificationManager.notify({
    type: 'alert',
    title: 'Claim Status Update',
    body: `Claim ${claimId}: ${status}`
  })
}

export default notificationManager
