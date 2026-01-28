# Socket.io Bridge - Quick Start Guide

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend dependencies
cd /root/fusonems-quantum-v2/backend
pip install python-socketio aiohttp

# Or add to requirements.txt (already done)
# python-socketio
# aiohttp
```

### 2. Configure Environment Variables

**FastAPI Backend** (`backend/.env`):
```bash
# Add these lines to your .env file
CAD_BACKEND_URL=http://localhost:3000
CAD_BACKEND_AUTH_TOKEN=your-secure-token-change-in-production
```

**CAD Backend** (`cad-backend/.env`):
```bash
# Add these lines to your .env file
SOCKET_IO_CORS_ORIGIN=http://localhost:3001,http://localhost:8000
CAD_BACKEND_AUTH_TOKEN=your-secure-token-change-in-production
```

**Important:** Use the same `CAD_BACKEND_AUTH_TOKEN` in both files.

### 3. Start Services

```bash
# Terminal 1: Start CAD Backend
cd /root/fusonems-quantum-v2/cad-backend
npm run dev

# Terminal 2: Start FastAPI Backend
cd /root/fusonems-quantum-v2/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Verify Connection

```bash
# Check Socket.io bridge health
curl http://localhost:8000/api/socket-bridge/health

# Expected response:
# {
#   "status": "healthy",
#   "bridge": {
#     "connected": true,
#     "cad_url": "http://localhost:3000",
#     ...
#   }
# }
```

## Quick Test

### Test Assignment Flow

```bash
# 1. Send assignment to unit
curl -X POST http://localhost:8000/api/socket-bridge/assignments/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "unit_id": "UNIT-5",
    "incident_id": "INC-TEST-001",
    "incident_type": "Cardiac Arrest",
    "address": "123 Main St",
    "priority": 1,
    "details": "67 y/o male, unresponsive"
  }'

# 2. Update unit status
curl -X POST http://localhost:8000/api/socket-bridge/units/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "unit_id": "UNIT-5",
    "status": "enroute",
    "incident_id": "INC-TEST-001"
  }'

# 3. Record timestamp
curl -X POST http://localhost:8000/api/socket-bridge/incidents/timestamp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "incident_id": "INC-TEST-001",
    "field": "enroute_at",
    "timestamp": "2024-01-27T10:05:00Z",
    "source": "auto"
  }'
```

## Integration Points

### 1. ePCR → Billing Integration

When an ePCR is completed:

```python
from services.cad.socket_bridge import get_socket_bridge

# In your ePCR completion handler
async def on_epcr_completed(epcr_id: str, incident_id: str):
    bridge = get_socket_bridge()
    
    # Extract billing data from ePCR
    billing_data = {
        "patient_name": epcr.patient_name,
        "transport_type": epcr.transport_type,
        "mileage": epcr.mileage,
        "insurance_type": epcr.insurance_type,
        # ... other billing fields
    }
    
    # Notify billing system
    await bridge.notify_transport_completed(
        incident_id,
        epcr_id,
        billing_data
    )
```

### 2. MDT PWA → CAD Integration

From your MDT PWA, send events to CAD backend:

```javascript
// Connect to CAD backend
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: userToken
  }
});

// Update unit location
navigator.geolocation.watchPosition((position) => {
  socket.emit('unit:location', {
    unitId: currentUnitId,
    location: {
      type: 'Point',
      coordinates: [position.coords.longitude, position.coords.latitude]
    },
    heading: position.coords.heading,
    speed: position.coords.speed
  });
});

// Update unit status
function updateStatus(status) {
  socket.emit('unit:status', {
    unitId: currentUnitId,
    status: status,
    incidentId: currentIncidentId
  });
}
```

### 3. Founder Dashboard → Real-time Metrics

Push metrics to dashboard:

```python
from services.cad.socket_bridge import get_socket_bridge

# In your metrics calculation service
async def update_dashboard_metrics():
    bridge = get_socket_bridge()
    
    metrics = {
        "active_incidents": await count_active_incidents(),
        "available_units": await count_available_units(),
        "revenue_today": await calculate_revenue_today(),
        "epcrs_completed_today": await count_epcrs_today(),
        # ... more metrics
    }
    
    await bridge.broadcast_metrics_update(metrics)
```

## Custom Event Handlers

Add custom logic for events:

```python
# In your application startup
from services.cad.socket_bridge import get_socket_bridge

bridge = get_socket_bridge()

# Custom handler for transport completion
async def handle_billing_trigger(data):
    incident_id = data.get('incidentId')
    epcr_id = data.get('epcrId')
    
    # Your custom billing logic
    await create_billing_record(incident_id, epcr_id)
    await send_notification_to_billing_team(incident_id)
    await update_revenue_metrics()

# Register handler
bridge.on('transport:completed', handle_billing_trigger)
```

## Production Checklist

- [ ] Set strong `CAD_BACKEND_AUTH_TOKEN` (32+ random characters)
- [ ] Use HTTPS for `CAD_BACKEND_URL` in production
- [ ] Configure proper CORS origins
- [ ] Set up health check monitoring
- [ ] Configure log aggregation
- [ ] Set up alerts for disconnections
- [ ] Test reconnection after CAD backend restart
- [ ] Verify all event handlers are registered
- [ ] Load test with expected traffic volume
- [ ] Document custom event handlers
- [ ] Set up metrics dashboard (Grafana/DataDog)

## Troubleshooting

### Bridge shows "degraded" status

```bash
# Check logs
tail -f backend.log | grep socket

# Common issues:
# 1. CAD backend not running → Start CAD backend
# 2. Wrong URL → Check CAD_BACKEND_URL
# 3. Auth token mismatch → Verify tokens match
# 4. Firewall blocking → Check network connectivity
```

### Events not being received

```bash
# Verify event handlers registered
curl http://localhost:8000/api/socket-bridge/status \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Check CAD backend logs
cd cad-backend
tail -f logs/server.log
```

### Manual reconnection

```bash
# Force reconnect via API
curl -X POST http://localhost:8000/api/socket-bridge/reconnect \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Next Steps

1. Review full documentation: `SOCKET_BRIDGE_README.md`
2. Check examples: `bridge_examples.py`
3. Run tests: `pytest tests/test_socket_bridge.py`
4. Customize event handlers in `bridge_handlers.py`
5. Add monitoring dashboard
6. Configure production environment

## Support

- Documentation: `/backend/services/cad/SOCKET_BRIDGE_README.md`
- Examples: `/backend/services/cad/bridge_examples.py`
- Tests: `/backend/tests/test_socket_bridge.py`
- Health Check: `http://localhost:8000/api/socket-bridge/health`
