# CAD System - Master Build Document

## Project Location
`/root/fusonems-quantum-v2/cad-backend/`

## Already Created Files
1. package.json (Node.js dependencies)
2. tsconfig.json (TypeScript config)
3. .env.example (Environment variables template)
4. knexfile.ts (Database migrations config)
5. src/config/index.ts (App configuration)
6. src/config/database.ts (Knex database connection)
7. src/server.ts (Express + Socket.io server)
8. db/migrations/20260125000001_create_organizations.ts
9. db/migrations/20260125000002_create_incidents.ts
10. README.md (Setup instructions)
11. IMPLEMENTATION_STATUS.md (Detailed progress tracker)

## Directory Structure Created
```
cad-backend/
├── src/
│   ├── config/
│   ├── models/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── types/
├── db/
│   ├── migrations/
│   └── seeds/
```

## Next Steps (Priority Order)
1. Create units migration (ambulances, HEMS)
2. Create crews migration (paramedics, RNs)
3. Create timeline_events migration (audit trail)
4. Create charges migration (billing)
5. Create medical_necessity_evidence migration
6. Create repeat_patient_cache migration
7. Create TypeScript types (incidents, units, crews, etc.)
8. Build incidents controller (POST /incidents, GET /incidents/:id)
9. Build assignments controller (POST /assignments/recommend)
10. Build business logic services (MedicalNecessityValidator, AssignmentEngine)
11. Build Socket.io real-time layer
12. Start frontend CAD dashboard

## Critical Implementation Details

### Database Schema
- Uses PostgreSQL with UUID primary keys
- JSONB columns for flexible data (vitals, insurance, etc.)
- Audit trail via timeline_events table
- Immutable records (locked=true after completion)

### API Design
- Base URL: http://localhost:3000/api/v1
- JWT authentication
- Organization-scoped (X-Organization-ID header)
- RESTful endpoints
- WebSocket for real-time (Socket.io)

### Frontend Apps
1. CAD Dashboard (Next.js) - Dispatcher interface with OpenMaps
2. CrewLink PWA - Simple acknowledgement (one tap)
3. MDT PWA - Patient contact + GPS tracking

### Key Integrations
- Telnyx: Voice calls + SMS dispatch alerts
- Metriport: Patient history + EMR sync
- OpenStreetMap: Free mapping (Leaflet.js)

## Environment Variables Needed
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cad_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-secret-key
TELNYX_API_KEY=your_key
METRIPORT_API_KEY=your_key
PORT=3000
```

## Todo List Status
- ✅ Backend structure setup
- 🚧 Database migrations (2/8 complete)
- ⏳ API controllers
- ⏳ Business logic
- ⏳ Frontend apps

## Commands
```bash
cd /root/fusonems-quantum-v2/cad-backend
npm install
npm run migrate
npm run dev
```
