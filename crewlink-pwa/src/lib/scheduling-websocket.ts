import { useEffect, useRef, useCallback, useState } from 'react'
import { ssoAuth } from './auth'
import { showSchedulingNotification } from './notifications'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

type SchedulingEventType =
  | 'connected'
  | 'shift_created'
  | 'shift_updated'
  | 'shift_deleted'
  | 'assignment_created'
  | 'assignment_removed'
  | 'you_were_assigned'
  | 'your_assignment_removed'
  | 'schedule_published'
  | 'time_off_status_changed'
  | 'swap_request_received'
  | 'scheduling_alert'

interface SchedulingEvent {
  type: SchedulingEventType
  timestamp: string
  data: Record<string, unknown>
}

type EventHandler = (event: SchedulingEvent) => void

interface UseSchedulingWebSocketOptions {
  onShiftCreated?: EventHandler
  onShiftUpdated?: EventHandler
  onShiftDeleted?: EventHandler
  onAssignmentCreated?: EventHandler
  onAssignmentRemoved?: EventHandler
  onYouWereAssigned?: EventHandler
  onYourAssignmentRemoved?: EventHandler
  onSchedulePublished?: EventHandler
  onTimeOffStatusChanged?: EventHandler
  onSwapRequestReceived?: EventHandler
  onSchedulingAlert?: EventHandler
  onConnected?: EventHandler
  onDisconnected?: () => void
  autoReconnect?: boolean
  showNotifications?: boolean
}

export const useSchedulingWebSocket = (options: UseSchedulingWebSocketOptions = {}) => {
  const {
    onShiftCreated,
    onShiftUpdated,
    onShiftDeleted,
    onAssignmentCreated,
    onAssignmentRemoved,
    onYouWereAssigned,
    onYourAssignmentRemoved,
    onSchedulePublished,
    onTimeOffStatusChanged,
    onSwapRequestReceived,
    onSchedulingAlert,
    onConnected,
    onDisconnected,
    autoReconnect = true,
    showNotifications = true,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(() => {
    const token = ssoAuth.getAccessToken() || localStorage.getItem('auth_token')
    if (!token) {
      console.warn('No auth token available for WebSocket connection')
      return
    }

    const wsUrl = `${WS_URL}/api/v1/scheduling/ws?token=${encodeURIComponent(token)}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Scheduling WebSocket connected')
        setIsConnected(true)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const data: SchedulingEvent = JSON.parse(event.data)
          handleEvent(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('Scheduling WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null
        onDisconnected?.()

        if (autoReconnect) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...')
            connect()
          }, 5000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [autoReconnect, onDisconnected])

  const handleEvent = useCallback((event: SchedulingEvent) => {
    switch (event.type) {
      case 'connected':
        onConnected?.(event)
        break
      case 'shift_created':
        onShiftCreated?.(event)
        break
      case 'shift_updated':
        onShiftUpdated?.(event)
        break
      case 'shift_deleted':
        onShiftDeleted?.(event)
        break
      case 'assignment_created':
        onAssignmentCreated?.(event)
        break
      case 'assignment_removed':
        onAssignmentRemoved?.(event)
        break
      case 'you_were_assigned':
        onYouWereAssigned?.(event)
        if (showNotifications) {
          showSchedulingNotification('shift_assigned', event.data)
        }
        break
      case 'your_assignment_removed':
        onYourAssignmentRemoved?.(event)
        break
      case 'schedule_published':
        onSchedulePublished?.(event)
        if (showNotifications) {
          showSchedulingNotification('schedule_published', event.data)
        }
        break
      case 'time_off_status_changed':
        onTimeOffStatusChanged?.(event)
        if (showNotifications) {
          const status = event.data.status as string
          if (status === 'approved') {
            showSchedulingNotification('time_off_approved', event.data)
          } else if (status === 'denied') {
            showSchedulingNotification('time_off_denied', event.data)
          }
        }
        break
      case 'swap_request_received':
        onSwapRequestReceived?.(event)
        if (showNotifications) {
          showSchedulingNotification('swap_request', event.data)
        }
        break
      case 'scheduling_alert':
        onSchedulingAlert?.(event)
        break
    }
  }, [
    onConnected,
    onShiftCreated,
    onShiftUpdated,
    onShiftDeleted,
    onAssignmentCreated,
    onAssignmentRemoved,
    onYouWereAssigned,
    onYourAssignmentRemoved,
    onSchedulePublished,
    onTimeOffStatusChanged,
    onSwapRequestReceived,
    onSchedulingAlert,
    showNotifications,
  ])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send('ping')
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  useEffect(() => {
    const pingInterval = setInterval(() => {
      sendPing()
    }, 30000)

    return () => {
      clearInterval(pingInterval)
    }
  }, [sendPing])

  return {
    isConnected,
    connect,
    disconnect,
    sendPing,
  }
}

export default useSchedulingWebSocket
