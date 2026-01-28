const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[]
}

export type SoundType = 
  | 'trip_routine'
  | 'trip_urgent'
  | 'trip_emergent'
  | 'trip_stat'
  | 'ptt_start'
  | 'ptt_end'
  | 'ptt_emergency'
  | 'message_received'
  | 'acknowledge'
  | 'cancelled'

const SOUND_PATHS: Record<SoundType, string> = {
  trip_routine: '/sounds/trip-routine.mp3',
  trip_urgent: '/sounds/trip-urgent.mp3',
  trip_emergent: '/sounds/trip-emergent.mp3',
  trip_stat: '/sounds/trip-stat.mp3',
  ptt_start: '/sounds/ptt-start.mp3',
  ptt_end: '/sounds/ptt-end.mp3',
  ptt_emergency: '/sounds/ptt-emergency.mp3',
  message_received: '/sounds/message.mp3',
  acknowledge: '/sounds/acknowledge.mp3',
  cancelled: '/sounds/cancelled.mp3',
}

const VIBRATION_PATTERNS: Record<string, number[]> = {
  ROUTINE: [200, 100, 200],
  URGENT: [300, 100, 300, 100, 300],
  EMERGENT: [400, 150, 400, 150, 400, 150, 400],
  STAT: [500, 200, 500, 200, 500, 200, 500, 200, 500],
  SHORT: [100],
  DOUBLE: [100, 50, 100],
  EMERGENCY: [1000, 200, 1000, 200, 1000],
}

let soundsEnabled = localStorage.getItem('sounds_enabled') !== 'false'
let vibrationEnabled = localStorage.getItem('vibration_enabled') !== 'false'

export const setSoundsEnabled = (enabled: boolean): void => {
  soundsEnabled = enabled
  localStorage.setItem('sounds_enabled', String(enabled))
}

export const setVibrationEnabled = (enabled: boolean): void => {
  vibrationEnabled = enabled
  localStorage.setItem('vibration_enabled', String(enabled))
}

export const isSoundsEnabled = (): boolean => soundsEnabled
export const isVibrationEnabled = (): boolean => vibrationEnabled

export const playSound = async (type: SoundType): Promise<void> => {
  if (!soundsEnabled) return
  
  try {
    const audio = new Audio(SOUND_PATHS[type])
    audio.volume = parseFloat(localStorage.getItem('sound_volume') || '1.0')
    await audio.play()
  } catch (e) {
    console.error('Failed to play sound:', type, e)
  }
}

export const vibrate = (pattern: keyof typeof VIBRATION_PATTERNS | number[]): void => {
  if (!vibrationEnabled || !navigator.vibrate) return
  
  const vibrationPattern = Array.isArray(pattern) ? pattern : VIBRATION_PATTERNS[pattern]
  if (vibrationPattern) {
    navigator.vibrate(vibrationPattern)
  }
}

export const playTripAlert = (priority: 'ROUTINE' | 'URGENT' | 'EMERGENT' | 'STAT'): void => {
  const soundMap: Record<string, SoundType> = {
    ROUTINE: 'trip_routine',
    URGENT: 'trip_urgent',
    EMERGENT: 'trip_emergent',
    STAT: 'trip_stat',
  }
  playSound(soundMap[priority])
  vibrate(priority)
}

export const playPTTStart = (): void => {
  playSound('ptt_start')
  vibrate('SHORT')
}

export const playPTTEnd = (): void => {
  playSound('ptt_end')
}

export const playPTTEmergency = (): void => {
  playSound('ptt_emergency')
  vibrate('EMERGENCY')
}

export const playMessageReceived = (): void => {
  playSound('message_received')
  vibrate('DOUBLE')
}

export const playAcknowledge = (): void => {
  playSound('acknowledge')
  vibrate('SHORT')
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export const showNotification = (title: string, options?: ExtendedNotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      ...options,
    } as NotificationOptions)
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  const permission = await requestNotificationPermission()
  if (!permission) {
    console.warn('Notification permission denied')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription && VAPID_PUBLIC_KEY) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return null
  }
}

export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error)
    return false
  }
}

export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

export const testSound = (type: SoundType): void => {
  const wasEnabled = soundsEnabled
  soundsEnabled = true
  playSound(type)
  soundsEnabled = wasEnabled
}

export const showSchedulingNotification = (
  type: 'shift_assigned' | 'schedule_published' | 'time_off_approved' | 'time_off_denied' | 'swap_request',
  _data: Record<string, unknown>
): void => {
  const titles: Record<string, string> = {
    shift_assigned: 'Shift Assigned',
    schedule_published: 'Schedule Published',
    time_off_approved: 'Time Off Approved',
    time_off_denied: 'Time Off Denied',
    swap_request: 'Swap Request Received',
  }
  
  const bodies: Record<string, string> = {
    shift_assigned: `You have been assigned to a shift`,
    schedule_published: 'New schedule has been published',
    time_off_approved: 'Your time off request has been approved',
    time_off_denied: 'Your time off request has been denied',
    swap_request: 'You have a new shift swap request',
  }
  
  showNotification(titles[type], {
    body: bodies[type],
    tag: `scheduling-${type}`,
  })
  
  vibrate('DOUBLE')
}
