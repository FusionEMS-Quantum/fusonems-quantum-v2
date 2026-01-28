import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import type { GPSBreadcrumb, Geofence } from '../types';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  center: [number, number];
  currentLocation?: { lat: number; lng: number };
  breadcrumbs?: GPSBreadcrumb[];
  geofences?: Geofence[];
  sceneLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
}

export const MapView: React.FC<MapViewProps> = ({
  center,
  currentLocation,
  breadcrumbs = [],
  geofences = [],
  sceneLocation,
  destinationLocation,
}) => {
  const breadcrumbPath = breadcrumbs.map((b) => [b.lat, b.lng] as [number, number]);

  const getGeofenceColor = (type: string) => {
    switch (type) {
      case 'scene':
        return '#DC2626'; // red
      case 'destination':
        return '#3B82F6'; // blue
      case 'station':
        return '#10B981'; // green
      default:
        return '#6B7280';
    }
  };

  return (
    <div className="map-container h-full w-full">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Current location */}
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]}>
            <Popup>Current Location</Popup>
          </Marker>
        )}

        {/* Scene marker */}
        {sceneLocation && (
          <Marker position={[sceneLocation.lat, sceneLocation.lng]}>
            <Popup>Scene</Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {destinationLocation && (
          <Marker position={[destinationLocation.lat, destinationLocation.lng]}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* Geofences */}
        {geofences.map((geofence) => (
          <Circle
            key={geofence.id}
            center={[geofence.center.lat, geofence.center.lng]}
            radius={geofence.radiusMeters}
            pathOptions={{
              color: getGeofenceColor(geofence.type),
              fillColor: getGeofenceColor(geofence.type),
              fillOpacity: 0.2,
            }}
          />
        ))}

        {/* Breadcrumb trail */}
        {breadcrumbPath.length > 1 && (
          <Polyline
            positions={breadcrumbPath}
            pathOptions={{
              color: '#8B5CF6',
              weight: 3,
              opacity: 0.7,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};
