# Fleet PWA - Real-time Vehicle Monitoring Dashboard

Professional fleet management dashboard optimized for dispatch/fleet management viewing on tablets or office displays.

## Features

### 📍 Live Vehicle Map
- Real-time vehicle tracking with OpenStreetMap integration
- Color-coded status markers:
  - **Green** (✓) - Available
  - **Blue** (🚑) - Assigned
  - **Orange** (🔧) - Maintenance
  - **Red** (⚠️) - Out of Service
- Click markers for vehicle details (speed, fuel, battery, check engine status)

### 📊 Metrics Dashboard
- **In Service Count** - Total vehicles available or assigned
- **Maintenance Alerts** - Active maintenance tasks (scheduled/in-progress)
- **Critical Alerts** - Check engine lights & low fuel (<20%)
- **Average Vehicle Age** - Fleet age analysis

### 🔔 Critical Alerts Section
- Real-time check engine alerts
- Low fuel warnings (<20%)
- Auto-generated from OBD-II telemetry

### 📋 DVIR Status (Daily)
- Pre-trip inspection completion progress
- Visual progress bar showing compliance
- Percentage completion

### 🚗 Vehicle List with Live Telemetry
- All vehicles with operational status badges
- Real-time OBD-II data:
  - Speed (km/h)
  - Fuel level (%)
  - Battery voltage (V)
  - Engine RPM
- Maintenance alert count per vehicle

## Tech Stack

- **React 18** with TypeScript
- **React Router** for navigation
- **Leaflet** + **React Leaflet** for mapping
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Installation

```bash
cd fleet-pwa
npm install
```

## Development

```bash
npm run dev
```

Runs on `http://localhost:5005`

## Build

```bash
npm run build
```

**Build output:** 327KB (101KB gzipped)

## API Integration

Connects to Fleet API endpoints:
- `GET /api/fleet/vehicles` - All vehicles
- `GET /api/fleet/vehicles/:id/telemetry` - Latest telemetry for vehicle
- `GET /api/fleet/maintenance?status=scheduled,in_progress` - Active maintenance
- `GET /api/fleet/dvir?start_date=...&end_date=...` - DVIR records

## Data Flow

```
Fleet PWA (every 30 seconds)
    ↓
GET /api/fleet/vehicles (all vehicles)
    ↓
For each vehicle: GET /api/fleet/vehicles/{id}/telemetry
    ↓
Render map + metrics + alerts + vehicle list
```

OBD-II data flows from MDT → Fleet API → Fleet PWA:

```
MDT Tablet (OBD connected)
    ↓ (every 30 sec)
POST /api/fleet/obd-telemetry
    ↓
Fleet API stores telemetry + auto-creates check engine alerts
    ↓ (every 30 sec)
Fleet PWA polls telemetry data
    ↓
Display on dashboard with critical alerts
```

## Use Cases

1. **Dispatch Office** - Monitor all vehicle locations and statuses in real-time
2. **Fleet Manager** - Track maintenance alerts and DVIR compliance
3. **Operations Center** - View critical alerts (check engine, low fuel)
4. **Supervisor Tablet** - Mobile fleet oversight on duty

## Notes

- Auto-refreshes data every 30 seconds
- Landscape orientation optimized
- Dark theme for 24/7 operations center use
- Touch-optimized for tablet interaction
