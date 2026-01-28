export interface Point {
  lat: number;
  lng: number;
}

export const calculateDistance = (point1: Point, point2: Point): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const isWithinGeofence = (
  point: Point,
  center: Point,
  radiusMeters: number
): boolean => {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
};

export interface GeofenceEvent {
  entered: boolean;
  geofenceId: string;
  geofenceType: 'scene' | 'destination' | 'station';
}

export const checkGeofences = (
  currentLocation: Point,
  geofences: Array<{
    id: string;
    type: 'scene' | 'destination' | 'station';
    center: Point;
    radiusMeters: number;
  }>,
  previouslyInside: Set<string>
): GeofenceEvent[] => {
  const events: GeofenceEvent[] = [];
  const currentlyInside = new Set<string>();

  for (const geofence of geofences) {
    const inside = isWithinGeofence(
      currentLocation,
      geofence.center,
      geofence.radiusMeters
    );

    if (inside) {
      currentlyInside.add(geofence.id);
      if (!previouslyInside.has(geofence.id)) {
        // Just entered
        events.push({
          entered: true,
          geofenceId: geofence.id,
          geofenceType: geofence.type,
        });
      }
    } else if (previouslyInside.has(geofence.id)) {
      // Just exited
      events.push({
        entered: false,
        geofenceId: geofence.id,
        geofenceType: geofence.type,
      });
    }
  }

  return events;
};
