import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FireMDTStore,
  FireMDTState,
  FireIncident,
  FireEvent,
  GPSBreadcrumb,
  OBDData,
  Geofence,
  DeviceConfig,
} from '../types';

export const useFireMDTStore = create<FireMDTStore>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      user: null,
      token: null,
      setAuth: (user, token) => set({ isAuthenticated: true, user, token }),
      logout: () => set({ isAuthenticated: false, user: null, token: null }),

      // Device config
      config: null,
      setConfig: (config) => set({ config }),

      // Current state
      currentState: 'AVAILABLE',
      setState: (state) => set({ currentState: state }),

      // Active incident
      activeIncident: null,
      setActiveIncident: (incident) => set({ activeIncident: incident }),

      // Events
      events: [],
      addEvent: (event) => {
        const newEvent: FireEvent = {
          ...event,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          synced: false,
        };
        set((state) => ({
          events: [...state.events, newEvent],
        }));
      },

      // GPS
      currentLocation: null,
      setCurrentLocation: (location) => set({ currentLocation: location }),
      breadcrumbs: [],
      addBreadcrumb: (breadcrumb) => {
        const newBreadcrumb: GPSBreadcrumb = {
          ...breadcrumb,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          synced: false,
        };
        set((state) => ({
          breadcrumbs: [...state.breadcrumbs, newBreadcrumb],
        }));
      },

      // OBD
      obdData: null,
      setOBDData: (data) => set({ obdData: data }),

      // Geofences
      geofences: [],
      setGeofences: (geofences) => set({ geofences }),

      // Offline queue
      queueSize: 0,
      setQueueSize: (size) => set({ queueSize: size }),
      isOnline: navigator.onLine,
      setIsOnline: (online) => set({ isOnline: online }),
    }),
    {
      name: 'fire-mdt-storage',
      partialize: (state) => ({
        config: state.config,
        currentState: state.currentState,
      }),
    }
  )
);
