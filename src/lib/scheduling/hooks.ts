import { useState, useEffect, useCallback, useRef } from "react";

export interface SchedulingEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export type SchedulingEventHandler = (event: SchedulingEvent) => void;

export interface UseSchedulingWebSocketOptions {
  token: string;
  onShiftCreated?: (data: Record<string, unknown>) => void;
  onShiftUpdated?: (data: Record<string, unknown>) => void;
  onShiftDeleted?: (data: { shift_id: number }) => void;
  onAssignmentCreated?: (data: Record<string, unknown>) => void;
  onAssignmentRemoved?: (data: { assignment_id: number }) => void;
  onYouWereAssigned?: (data: Record<string, unknown>) => void;
  onYourAssignmentRemoved?: (data: { assignment_id: number }) => void;
  onSchedulePublished?: (data: Record<string, unknown>) => void;
  onTimeOffStatusChanged?: (data: Record<string, unknown>) => void;
  onSwapRequestReceived?: (data: Record<string, unknown>) => void;
  onSchedulingAlert?: (data: Record<string, unknown>) => void;
  onConnected?: (data: { user_id: number; org_id: number }) => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

export interface UseSchedulingWebSocketReturn {
  isConnected: boolean;
  lastEvent: SchedulingEvent | null;
  connectionAttempts: number;
  reconnect: () => void;
}

export const useSchedulingWebSocket = (
  options: UseSchedulingWebSocketOptions
): UseSchedulingWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SchedulingEvent | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/scheduling/ws?token=${options.token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionAttempts(0);
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnected?.();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionAttempts((prev) => prev + 1);
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      options.onError?.(error);
    };

    ws.onmessage = (event) => {
      try {
        const message: SchedulingEvent = JSON.parse(event.data);
        setLastEvent(message);

        switch (message.type) {
          case "connected":
            options.onConnected?.(message.data as { user_id: number; org_id: number });
            break;
          case "shift_created":
            options.onShiftCreated?.(message.data);
            break;
          case "shift_updated":
            options.onShiftUpdated?.(message.data);
            break;
          case "shift_deleted":
            options.onShiftDeleted?.(message.data as { shift_id: number });
            break;
          case "assignment_created":
            options.onAssignmentCreated?.(message.data);
            break;
          case "assignment_removed":
            options.onAssignmentRemoved?.(message.data as { assignment_id: number });
            break;
          case "you_were_assigned":
            options.onYouWereAssigned?.(message.data);
            break;
          case "your_assignment_removed":
            options.onYourAssignmentRemoved?.(message.data as { assignment_id: number });
            break;
          case "schedule_published":
            options.onSchedulePublished?.(message.data);
            break;
          case "time_off_status_changed":
            options.onTimeOffStatusChanged?.(message.data);
            break;
          case "swap_request_received":
            options.onSwapRequestReceived?.(message.data);
            break;
          case "scheduling_alert":
            options.onSchedulingAlert?.(message.data);
            break;
        }
      } catch (err) {
        console.error("Failed to parse scheduling WebSocket message:", err);
      }
    };
  }, [options, connectionAttempts]);

  useEffect(() => {
    if (options.token) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [options.token]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  return {
    isConnected,
    lastEvent,
    connectionAttempts,
    reconnect,
  };
};

export const useSchedulingData = () => {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [shifts, setShifts] = useState<Record<string, unknown>[]>([]);
  const [mySchedule, setMySchedule] = useState<Record<string, unknown>[]>([]);
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/scheduling/dashboard/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShifts = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const response = await fetch(`/api/v1/scheduling/shifts?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch shifts");
      const data = await response.json();
      setShifts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMySchedule = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const response = await fetch(`/api/v1/scheduling/my-schedule?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch schedule");
      const data = await response.json();
      setMySchedule(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/scheduling/alerts?active_only=true", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    shifts,
    mySchedule,
    alerts,
    loading,
    error,
    fetchStats,
    fetchShifts,
    fetchMySchedule,
    fetchAlerts,
    setShifts,
    setAlerts,
  };
};
