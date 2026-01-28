# Socket.io Bridge - Technical Documentation

## Overview

The Socket.io Bridge is a production-ready bidirectional communication layer that connects the FastAPI backend with the CAD Node.js backend, enabling unified real-time communication across the FusonEMS Quantum platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Platform Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   MDT PWA    │◄────────┤  CAD Backend │◄─────┐               │
│  └──────────────┘         │  (Socket.io  │      │               │
│                            │   Server)    │      │               │
│  ┌──────────────┐         └──────┬───────┘      │               │
│  │  Dashboard   │◄───────────────┘              │               │
│  └──────────────┘                                │               │
│                                                   │               │
│                            Socket.io Bridge      │               │
│                            (This Component)      │               │
│                                   ▲              │               │
│                                   │              │               │
│  ┌──────────────┐         ┌──────┴───────┐      │               │
│  │   ePCR API   │◄────────┤   FastAPI    │──────┘               │
│  └──────────────┘         │   Backend    │                      │
│                            │  (Socket.io  │                      │
│  ┌──────────────┐         │   Client)    │                      │
│  │ Billing API  │◄────────┤              │                      │
│  └──────────────┘         └──────────────┘                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Socket Bridge Service (`socket_bridge.py`)

The core Socket.io client that connects FastAPI to the CAD backend.

**Features:**
- Automatic reconnection with exponential backoff
- Event handler registration and dispatch
- Connection health monitoring
- Authentication with CAD backend
- Type-safe event emissions

**Key Methods:**
```python
# Initialize and connect
await initialize_socket_bridge()

# Get singleton instance
bridge = get_socket_bridge()

# High-level API
await bridge.send_assignment(unit_id, incident_data)
await bridge.update_unit_location(unit_id, location, heading, speed)
await bridge.update_unit_status(unit_id, status, incident_id)
await bridge.notify_transport_completed(incident_id, epcr_id, billing_data)

# Event handling
bridge.on('event:name', handler_function)

# Health monitoring
health = bridge.get_health_status()
```

### 2. Socket Router (`socket_router.py`)

FastAPI REST endpoints for managing the bridge.

**Endpoints:**

| Endpoint | Method | Description | Role Required |
|----------|--------|-------------|---------------|
| `/api/socket-bridge/health` | GET | Bridge health status | Public |
| `/api/socket-bridge/reconnect` | POST | Manual reconnection | Admin |
| `/api/socket-bridge/assignments/send` | POST | Send assignment | Dispatcher |
| `/api/socket-bridge/units/location` | POST | Update GPS location | Crew |
| `/api/socket-bridge/units/status` | POST | Update unit status | Crew |
| `/api/socket-bridge/incidents/status` | POST | Update incident status | Dispatcher |
| `/api/socket-bridge/incidents/timestamp` | POST | Record timestamp | Crew |
| `/api/socket-bridge/transport/completed` | POST | Notify billing | Crew |
| `/api/socket-bridge/metrics/broadcast` | POST | Broadcast metrics | Admin |

### 3. Event Handlers (`bridge_handlers.py`)

Processes events from CAD backend and integrates with FastAPI services.

**Registered Events:**
- `unit:location:updated` - GPS updates from units
- `unit:status:updated` - Unit availability changes
- `incident:status:updated` - Incident lifecycle updates
- `incident:timestamp:updated` - Critical timestamps
- `incident:new` - New incident creation
- `assignment:received` - Assignment confirmations
- `transport:completed` - Billing triggers
- `metrics:updated` - Real-time dashboard updates

## Event Flow

### Dispatch to Transport Flow

```
1. Dispatcher creates incident
   FastAPI → CAD Backend → All connected clients

2. Dispatcher assigns unit
   FastAPI.send_assignment() → CAD Backend → MDT PWA

3. Crew accepts assignment
   MDT PWA → CAD Backend → FastAPI (assignment:received)

4. Crew updates status to "enroute"
   MDT PWA → CAD Backend → FastAPI (unit:status:updated)
   
5. GPS tracking during transport
   MDT PWA → CAD Backend → FastAPI (unit:location:updated)

6. Crew arrives on scene
   MDT PWA → CAD Backend → FastAPI (unit:status:updated)
   
7. Crew completes ePCR
   ePCR API → FastAPI

8. Transport completed
   FastAPI.notify_transport_completed() → CAD Backend → Billing Service
   
9. Billing record created
   Billing Service creates claim for submission

10. Unit back in service
    MDT PWA → CAD Backend → FastAPI (unit:status:updated)
```

## Configuration

### FastAPI Backend (.env)

```bash
# CAD Backend Connection
CAD_BACKEND_URL=http://localhost:3000
CAD_BACKEND_AUTH_TOKEN=your-secure-token-here
```

### CAD Backend (.env)

```bash
# Socket.io Configuration
SOCKET_IO_CORS_ORIGIN=http://localhost:3001
CAD_BACKEND_AUTH_TOKEN=your-secure-token-here

# Same token as FastAPI for authentication
```

## Security

### Authentication Flow

1. FastAPI connects to CAD backend with auth token
2. CAD backend validates token in Socket.io middleware
3. Authenticated connection joins 'fastapi-bridge' room
4. All subsequent events are authenticated

### Token Management

- Tokens stored in environment variables
- Never exposed in logs or API responses
- Rotate tokens regularly in production
- Use strong, random tokens (32+ characters)

### Authorization

- FastAPI role-based access control (RBAC) enforced on REST endpoints
- Socket events include user context for audit trails
- Critical operations require elevated permissions

## Error Handling

### Connection Failures

```python
# Bridge handles reconnection automatically
try:
    await bridge.connect()
except Exception as e:
    logger.error(f"Failed to connect: {e}")
    # Application continues without real-time features
    # Health endpoint shows degraded status
```

### Event Dispatch Errors

```python
# Errors in one handler don't affect others
async def handler(data):
    try:
        # Process event
        pass
    except Exception as e:
        logger.error(f"Handler error: {e}")
        # Event continues to other handlers
```

### Timeout Handling

```python
# Socket.io client has built-in timeout
# Reconnection attempts: 10 (configurable)
# Reconnection delay: 5 seconds (exponential backoff)
```

## Health Monitoring

### Health Check Endpoint

```bash
curl http://localhost:8000/api/socket-bridge/health
```

**Response:**
```json
{
  "status": "healthy",
  "bridge": {
    "connected": true,
    "cad_url": "http://localhost:3000",
    "last_connection": "2024-01-27T10:00:00Z",
    "connection_attempts": 0,
    "last_error": null,
    "event_handlers_registered": 8,
    "uptime_seconds": 3600
  },
  "timestamp": "2024-01-27T11:00:00Z"
}
```

### Monitoring Metrics

Key metrics to monitor:
- Connection status (connected/disconnected)
- Connection attempts (alert if > 5)
- Uptime percentage (target: 99.9%)
- Event processing time (target: < 100ms)
- Failed event emissions (alert if > 0)

### Alerting

Set up alerts for:
- Bridge disconnected for > 5 minutes
- Connection attempts > 5 in 10 minutes
- Health check returning 503
- Event processing errors

## Production Deployment

### Docker Configuration

```dockerfile
# Ensure Socket.io dependencies are installed
RUN pip install python-socketio aiohttp
```

### Environment Variables

```bash
# Production settings
CAD_BACKEND_URL=https://cad.fusonems.com
CAD_BACKEND_AUTH_TOKEN=<strong-random-token>
```

### Networking

- Ensure FastAPI backend can reach CAD backend
- Configure firewall rules for Socket.io port (default: 3000)
- Use TLS/SSL for production connections
- Consider using internal network for backend communication

### Logging

```python
# Configure logging level
LOG_LEVEL=INFO  # Use DEBUG for troubleshooting

# Log locations
/var/log/fusonems/socket-bridge.log
```

## Testing

### Run Tests

```bash
cd backend
pytest tests/test_socket_bridge.py -v
```

### Manual Testing

```bash
# Start CAD backend
cd cad-backend
npm run dev

# Start FastAPI backend (bridge auto-connects)
cd backend
uvicorn main:app --reload

# Check health
curl http://localhost:8000/api/socket-bridge/health

# Send test assignment
curl -X POST http://localhost:8000/api/socket-bridge/assignments/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "unit_id": "UNIT-1",
    "incident_id": "TEST-001",
    "incident_type": "Chest Pain",
    "address": "123 Test St",
    "priority": 2
  }'
```

## Performance

### Benchmarks

- Connection establishment: < 500ms
- Event emission: < 50ms
- Event dispatch: < 100ms
- Reconnection: < 5 seconds

### Optimization

- Use connection pooling for database queries in handlers
- Implement event batching for high-frequency updates
- Cache frequently accessed data (unit locations, statuses)
- Use Redis for distributed event handling

## Troubleshooting

### Bridge Won't Connect

1. Check CAD backend is running
   ```bash
   curl http://localhost:3000/health
   ```

2. Verify auth token matches in both .env files
   ```bash
   grep CAD_BACKEND_AUTH_TOKEN backend/.env
   grep CAD_BACKEND_AUTH_TOKEN cad-backend/.env
   ```

3. Check firewall rules
   ```bash
   telnet localhost 3000
   ```

4. Review logs
   ```bash
   tail -f /var/log/fusonems/backend.log | grep socket
   ```

### Events Not Received

1. Check event handler registration
   ```python
   bridge = get_socket_bridge()
   print(bridge.event_handlers.keys())
   ```

2. Verify Socket.io room membership
   ```python
   # Check if joined appropriate rooms
   await bridge.join_room('incident:INC-001')
   ```

3. Enable debug logging
   ```python
   import logging
   logging.getLogger('socketio').setLevel(logging.DEBUG)
   ```

### High Latency

1. Check network latency
   ```bash
   ping localhost  # Should be < 1ms
   ```

2. Monitor event queue size
   ```python
   # Add metrics to handlers
   start_time = time.time()
   # ... process event ...
   duration = time.time() - start_time
   logger.info(f"Event processed in {duration}ms")
   ```

3. Review database query performance
   ```python
   # Use EXPLAIN ANALYZE for slow queries
   ```

## Future Enhancements

- [ ] Add event replay for missed events during disconnection
- [ ] Implement event compression for bandwidth optimization
- [ ] Add support for multiple CAD backends (load balancing)
- [ ] Create admin dashboard for bridge monitoring
- [ ] Add metrics export for Prometheus/Grafana
- [ ] Implement event filtering/routing rules
- [ ] Add support for Socket.io namespaces
- [ ] Create automated integration tests

## Support

For issues or questions:
- Check logs: `/var/log/fusonems/backend.log`
- Health endpoint: `/api/socket-bridge/health`
- Contact: support@fusonems.com
