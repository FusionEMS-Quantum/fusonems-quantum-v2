# Fire MDT PWA

A complete Progressive Web App for Fire Mobile Data Terminal operations.

## Features

- **Generate Incident Button** - Manual incident creation with full details
- **Offline-First Architecture** - All events queued locally, sync when online
- **State Machine Display** - Visual indicator of current operational state
- **GPS Tracking** - Live breadcrumb trail on map with automatic logging
- **OBD-II Integration** - Display gear, speed, ignition state from vehicle
- **Timeline View** - All events with timestamps and sources (manual/GPS/geofence/OBD/CAD)
- **Geofence Visualization** - Scene/destination/station circles on map with auto-transitions
- **Offline Banner** - Clear indicator when offline with queue count

## State Machine

Available states:
- AVAILABLE
- DISPATCHED
- ENROUTE
- ON_SCENE
- TRANSPORTING
- AT_HOSPITAL
- CLEARING
- UNAVAILABLE

### Auto-Transitions

1. **Geofence-based**:
   - Entering scene geofence while ENROUTE → ON_SCENE
   - Entering destination geofence while TRANSPORTING → AT_HOSPITAL
   - Entering station geofence while CLEARING → AVAILABLE

2. **OBD-based**:
   - Moving (gear=D, speed>5) while DISPATCHED → ENROUTE
   - Moving (gear=D, speed>5) while ON_SCENE → TRANSPORTING

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Runs on port 3003 by default.

## Build

```bash
npm run build
```

## Configuration

Set the following environment variables:

```env
VITE_API_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=fusonems
VITE_KEYCLOAK_CLIENT_ID=fire-mdt
```

## Architecture

### Lib
- `auth.ts` - Keycloak integration
- `api.ts` - API client with offline queue
- `offline-queue.ts` - IndexedDB-based offline event queue with replay
- `state-machine.ts` - Fire MDT state transitions and logic
- `geofence.ts` - Geofence calculations and event detection
- `obd.ts` - OBD-II integration helpers
- `store.ts` - Zustand global state

### Pages
- `Login.tsx` - Keycloak authentication
- `Dashboard.tsx` - Unit status, active incident summary
- `GenerateIncident.tsx` - Manual incident creation form
- `ActiveIncident.tsx` - Live incident tracking with timeline and map
- `History.tsx` - Incident history
- `Settings.tsx` - Device config, geofence settings, OBD enable/disable

### Components
- `TimelineView.tsx` - Event timeline with icons
- `MapView.tsx` - Leaflet map with GPS tracking, geofences, breadcrumbs
- `StateIndicator.tsx` - Current state display with color coding
- `OfflineIndicator.tsx` - Offline mode banner

## PWA Features

- Service Worker with Workbox for offline caching
- IndexedDB for offline queue persistence
- Background sync for queued events
- Push notifications support (ready for CAD integration)

## Device Integration

### GPS
Uses HTML5 Geolocation API with high accuracy mode. Automatically logs breadcrumbs when active incident exists.

### OBD-II
Supports Bluetooth/USB OBD adapters. Configure in Settings page. Mock implementation provided - replace with actual ELM327/OBDLink integration.

## API Endpoints

Expected backend endpoints:
- `POST /api/fire/incidents` - Create incident
- `GET /api/fire/incidents/:id` - Get incident
- `GET /api/fire/incidents?unit_id=X` - Get incident history
- `POST /api/fire/events` - Create event
- `GET /api/fire/events?incident_id=X` - Get events
- `POST /api/fire/gps/breadcrumb` - Send GPS breadcrumb
- `GET /api/fire/config/:unitId` - Get device config
- `PUT /api/fire/config/:unitId` - Update device config
