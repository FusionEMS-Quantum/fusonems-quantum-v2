# Quick Start Guide

## Backend
```bash
cd /root/fusonems-quantum-v2/cad-backend
npm start
```

## CrewLink PWA
```bash
cd /root/fusonems-quantum-v2/crewlink-pwa
npm run dev
# Open http://localhost:3001
```

## MDT PWA
```bash
cd /root/fusonems-quantum-v2/mdt-pwa
npm run dev
# Open http://localhost:3002
```

## Status

✅ Backend API (100%)
✅ CrewLink PWA (100%) 
✅ MDT PWA with GPS Geofencing (100%)
⏳ CAD Dashboard (20% - needs rebuild)
⏳ Database setup (PostgreSQL + PostGIS)

## Key Features

- **Auto GPS Timestamps**: MDT automatically records timestamps when entering/exiting 500m geofences
- **Real-time Socket.io**: Live updates for assignments, GPS locations, status changes
- **Medical Necessity**: IFT/CCT/Bariatric/HEMS validation with rules
- **AI Assignment**: Multi-factor scoring (distance, qualifications, performance, fatigue)
- **Billing**: Auto-calculation with Telnyx costs
- **NEMSIS v3.5**: Compliant data structure

See FINAL_BUILD_SUMMARY.md for complete details.
