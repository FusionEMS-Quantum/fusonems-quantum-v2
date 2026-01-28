# CAD Interfacility Dispatch System

## Overview
Complete interfacility dispatch system for ambulances and HEMS with AI-powered assignment, real-time tracking, Telnyx integration, Metriport patient data, and automated billing.

## Architecture

### Backend (Node.js/TypeScript/PostgreSQL/Redis/Socket.io)
- **API Layer**: Express REST endpoints
- **Real-time**: Socket.io for GPS tracking and status updates
- **Database**: PostgreSQL with Knex migrations
- **Cache**: Redis for real-time state
- **Integrations**: Telnyx (phone/SMS), Metriport (patient history)

### Frontend Applications
1. **CAD Dashboard** (Next.js/React) - Dispatcher interface
2. **CrewLink PWA** - Crew acknowledgement app
3. **MDT PWA** - Mobile data terminal with GPS tracking

## Progress

### ✅ Completed
- Backend project structure
- Package.json with all dependencies
- TypeScript configuration
- Environment variables template
- Database configuration with Knex
- Main server file with Socket.io
- Organizations migration
- Incidents migration

### 🚧 In Progress
- Units, Crews, Timeline Events migrations
- Charges, Medical Necessity tables
- API controllers and routes
- Business logic services
- Frontend applications

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Backend Setup
```bash
cd cad-backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run migrate
npm run dev
```

### Database Migrations
```bash
npm run migrate        # Run migrations
npm run migrate:rollback  # Rollback last migration
npm run migrate:make <name>  # Create new migration
```

## API Endpoints

### Incidents
- POST /api/v1/incidents - Create incident
- GET /api/v1/incidents/:id - Get incident details
- PUT /api/v1/incidents/:id - Update incident
- POST /api/v1/incidents/:id/complete - Mark complete

### Assignments
- POST /api/v1/assignments/recommend - Get AI recommendations
- POST /api/v1/assignments/assign - Assign unit

### Units
- GET /api/v1/units - Get available units

### Timeline
- GET /api/v1/incidents/:id/timeline - Get timeline
- POST /api/v1/incidents/:id/status - Update status

### Billing
- GET /api/v1/incidents/:id/charges/estimate - Get estimate
- POST /api/v1/incidents/:id/charges/finalize - Finalize charges

### Patients
- GET /api/v1/patients/search - Search patient via Metriport

## Socket.io Events

### Server → Client
- `unit_location_update` - GPS updates
- `incident_status_changed` - Status changes
- `timeline_event` - New timeline events
- `escalation_alert` - Escalation alerts

### Client → Server
- `join_incident` - Join incident room
- `leave_incident` - Leave incident room

## Files Created
1. `/cad-backend/package.json`
2. `/cad-backend/tsconfig.json`
3. `/cad-backend/.env.example`
4. `/cad-backend/src/config/index.ts`
5. `/cad-backend/src/config/database.ts`
6. `/cad-backend/src/server.ts`
7. `/cad-backend/knexfile.ts`
8. `/cad-backend/db/migrations/20260125000001_create_organizations.ts`
9. `/cad-backend/db/migrations/20260125000002_create_incidents.ts`

## Next Steps
1. Complete remaining database migrations (units, crews, timeline_events, charges)
2. Implement TypeScript interfaces/types
3. Build API controllers for all endpoints
4. Create business logic services (medical necessity, assignment engine, billing)
5. Integrate Telnyx and Metriport SDKs
6. Build frontend CAD dashboard
7. Build CrewLink PWA
8. Build MDT PWA
9. Docker configuration
10. Deployment setup
