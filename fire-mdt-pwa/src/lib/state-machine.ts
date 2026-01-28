import type { FireMDTState } from '../types';

export interface StateTransition {
  from: FireMDTState;
  to: FireMDTState;
  trigger: 'manual' | 'geofence' | 'obd';
}

const stateTransitions: Record<FireMDTState, FireMDTState[]> = {
  AVAILABLE: ['DISPATCHED', 'UNAVAILABLE'],
  DISPATCHED: ['ENROUTE', 'AVAILABLE'],
  ENROUTE: ['ON_SCENE', 'AVAILABLE'],
  ON_SCENE: ['TRANSPORTING', 'CLEARING', 'AVAILABLE'],
  TRANSPORTING: ['AT_HOSPITAL', 'AVAILABLE'],
  AT_HOSPITAL: ['CLEARING', 'AVAILABLE'],
  CLEARING: ['AVAILABLE'],
  UNAVAILABLE: ['AVAILABLE'],
};

export const canTransition = (
  from: FireMDTState,
  to: FireMDTState
): boolean => {
  return stateTransitions[from].includes(to);
};

export const getNextStates = (current: FireMDTState): FireMDTState[] => {
  return stateTransitions[current];
};

export const getStateColor = (state: FireMDTState): string => {
  switch (state) {
    case 'AVAILABLE':
      return '#10B981'; // green
    case 'DISPATCHED':
      return '#F59E0B'; // amber
    case 'ENROUTE':
      return '#3B82F6'; // blue
    case 'ON_SCENE':
      return '#DC2626'; // red
    case 'TRANSPORTING':
      return '#8B5CF6'; // purple
    case 'AT_HOSPITAL':
      return '#EC4899'; // pink
    case 'CLEARING':
      return '#6B7280'; // gray
    case 'UNAVAILABLE':
      return '#1F2937'; // dark gray
    default:
      return '#6B7280';
  }
};

export const getStateLabel = (state: FireMDTState): string => {
  return state.replace(/_/g, ' ');
};

export const autoTransitionOnGeofence = (
  currentState: FireMDTState,
  geofenceType: 'scene' | 'destination' | 'station'
): FireMDTState | null => {
  if (geofenceType === 'scene' && currentState === 'ENROUTE') {
    return 'ON_SCENE';
  }
  if (geofenceType === 'destination' && currentState === 'TRANSPORTING') {
    return 'AT_HOSPITAL';
  }
  if (geofenceType === 'station' && currentState === 'CLEARING') {
    return 'AVAILABLE';
  }
  return null;
};

export const autoTransitionOnOBD = (
  currentState: FireMDTState,
  gear: 'P' | 'R' | 'N' | 'D' | 'L',
  speed: number
): FireMDTState | null => {
  // Auto-transition to ENROUTE when moving from DISPATCHED
  if (currentState === 'DISPATCHED' && gear === 'D' && speed > 5) {
    return 'ENROUTE';
  }
  
  // Auto-transition to TRANSPORTING when moving from ON_SCENE
  if (currentState === 'ON_SCENE' && gear === 'D' && speed > 5) {
    return 'TRANSPORTING';
  }
  
  return null;
};
