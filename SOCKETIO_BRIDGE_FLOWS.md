# Socket.io Bridge - Message Flow Diagrams

## Complete Incident Lifecycle Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Dispatcher │         │   FastAPI   │         │ CAD Backend │         │   MDT PWA   │
│   Console   │         │   Backend   │         │  (Socket.io)│         │   (Crew)    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                        │                        │
       │ 1. Create Incident    │                        │                        │
       ├──────────────────────►│                        │                        │
       │                       │                        │                        │
       │                       │ 2. incident:created    │                        │
       │                       ├───────────────────────►│                        │
       │                       │                        │                        │
       │                       │                        │ 3. incident:new        │
       │                       │                        ├───────────────────────►│
       │                       │                        │                        │
       │ 4. Assign Unit        │                        │                        │
       ├──────────────────────►│                        │                        │
       │                       │                        │                        │
       │                       │ 5. assignment:sent     │                        │
       │                       ├───────────────────────►│                        │
       │                       │                        │                        │
       │                       │                        │ 6. assignment:received │
       │                       │                        ├───────────────────────►│
       │                       │                        │                        │
       │                       │                        │ 7. Crew accepts        │
       │                       │                        │◄───────────────────────┤
       │                       │                        │                        │
       │                       │ 8. unit:status         │                        │
       │                       │   (enroute)            │                        │
       │                       │◄───────────────────────┤                        │
       │                       │                        │                        │
       │ 9. Status updated     │                        │                        │
       │◄──────────────────────┤                        │                        │
       │                       │                        │                        │
       │                       │                        │ 10. GPS updates        │
       │                       │ unit:location          │◄───────────────────────┤
       │                       │◄───────────────────────┤  (continuous)          │
       │                       │                        │                        │
       │                       │                        │ 11. Arrive on scene    │
       │                       │ unit:status            │◄───────────────────────┤
       │                       │   (onscene)            │                        │
       │                       │◄───────────────────────┤                        │
       │                       │                        │                        │
       │                       │                        │ 12. Crew fills ePCR    │
       │                       │                        │                        │
       │                       │ ePCR data via REST API │                        │
       │                       │◄───────────────────────┼────────────────────────┤
       │                       │                        │                        │
       │                       │                        │ 13. Transport patient  │
       │                       │ unit:status            │◄───────────────────────┤
       │                       │   (transport)          │                        │
       │                       │◄───────────────────────┤                        │
       │                       │                        │                        │
       │                       │                        │ 14. Arrive hospital    │
       │                       │ unit:status            │◄───────────────────────┤
       │                       │   (hospital)           │                        │
       │                       │◄───────────────────────┤                        │
       │                       │                        │                        │
       │                       │ 15. Complete ePCR      │                        │
       │                       │◄───────────────────────┼────────────────────────┤
       │                       │                        │                        │
       │                       │ 16. transport:completed│                        │
       │                       ├───────────────────────►│                        │
       │                       │                        │                        │
       │                       │ 17. Billing record     │                        │
┌──────┴──────┐               │    created             │                        │
│   Billing   │◄──────────────┤                        │                        │
│   System    │               │                        │                        │
└─────────────┘               │                        │                        │
                               │                        │ 18. Unit available     │
                               │ unit:status            │◄───────────────────────┤
                               │   (available)          │                        │
                               │◄───────────────────────┤                        │
                               │                        │                        │
```

## GPS Tracking Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   MDT PWA   │         │ CAD Backend │         │   FastAPI   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                        │
       │ GPS Update            │                        │
       │ (every 5-30 sec)      │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │                       │ Store in PostGIS       │
       │                       │ + Broadcast            │
       │                       │                        │
       │                       │ unit:location:updated  │
       │                       ├───────────────────────►│
       │                       │                        │
       │                       │                        │ Store in DB
       │                       │                        │ + Calculate ETA
       │                       │                        │ + Geofence check
       │                       │                        │
```

## Billing Trigger Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    ePCR     │    │   FastAPI   │    │ CAD Backend │    │   Billing   │
│  Completed  │    │   Backend   │    │             │    │   Service   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                   │                   │
       │ 1. ePCR done     │                   │                   │
       ├─────────────────►│                   │                   │
       │                  │                   │                   │
       │                  │ 2. Extract billing│                   │
       │                  │    data from ePCR │                   │
       │                  │                   │                   │
       │                  │ 3. transport:     │                   │
       │                  │    completed      │                   │
       │                  ├──────────────────►│                   │
       │                  │                   │                   │
       │                  │                   │ 4. Forward event  │
       │                  │                   ├──────────────────►│
       │                  │                   │                   │
       │                  │                   │                   │ 5. Create claim
       │                  │                   │                   │    Validate data
       │                  │                   │                   │    Check insurance
       │                  │                   │                   │
       │                  │ 6. billing:created│                   │
       │                  │◄──────────────────┼───────────────────┤
       │                  │                   │                   │
       │ 7. Notify crew   │                   │                   │
       │◄─────────────────┤                   │                   │
       │                  │                   │                   │
```

## Founder Dashboard Metrics Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Metrics    │         │   FastAPI   │         │ CAD Backend │
│  Service    │         │   Backend   │         │             │
│  (cron)     │         │             │         │             │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                        │
       │ Every 1 min:          │                        │
       │ Calculate metrics     │                        │
       │                       │                        │
       │ metrics:updated       │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │                       │ broadcast              │
       │                       ├───────────────────────►│
       │                       │                        │
       │                       │                        │
       │                       │                        ▼
       │                       │                 All connected
       │                       │                 dashboards
       │                       │                        │
       │                       │                        │
┌──────┴──────┐         ┌──────┴──────┐         ┌──────┴──────┐
│  Dashboard  │◄────────┤  Dashboard  │◄────────┤  Dashboard  │
│   User 1    │         │   User 2    │         │   User 3    │
└─────────────┘         └─────────────┘         └─────────────┘
```

## Multi-Client Synchronization

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Dispatcher │    │ CAD Backend │    │  Supervisor │
│   Client    │    │  (Socket.io)│    │   Client    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                   │
       │ 1. Update        │                   │
       │    incident      │                   │
       ├─────────────────►│                   │
       │                  │                   │
       │                  │ 2. Broadcast to   │
       │                  │    all clients    │
       │                  │                   │
       │ 3. Confirmed     │ 4. Update shown   │
       │◄─────────────────┼──────────────────►│
       │                  │                   │
       │                  │                   │
       │                  ▼                   │
       │           Store in PostGIS           │
       │           + Send to FastAPI          │
       │                  │                   │
       │                  ▼                   │
       │            FastAPI Backend           │
       │              stores data             │
       │                  │                   │
```

## Error Handling & Reconnection Flow

```
┌─────────────┐         ┌─────────────┐
│   FastAPI   │         │ CAD Backend │
│   Bridge    │         │             │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ Normal operation      │
       │◄─────────────────────►│
       │                       │
       │                       ✗ Connection lost
       │                       │
       │ disconnect event      │
       │◄──────────────────────┤
       │                       │
       │ Attempt reconnect #1  │
       ├──────────────────────►✗ Failed
       │                       │
       │ Wait 5 seconds        │
       │                       │
       │ Attempt reconnect #2  │
       ├──────────────────────►✗ Failed
       │                       │
       │ Wait 10 seconds       │
       │                       │
       │ Attempt reconnect #3  │
       ├──────────────────────►│
       │                       │
       │ connect event         │
       │◄──────────────────────┤
       │                       │
       │ Re-authenticate       │
       ├──────────────────────►│
       │                       │
       │ authenticated         │
       │◄──────────────────────┤
       │                       │
       │ Resume operations     │
       │◄─────────────────────►│
       │                       │
```

## Event Handler Registration

```
┌─────────────┐         ┌─────────────┐
│ Application │         │   Socket    │
│  Startup    │         │   Bridge    │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ initialize_bridge()   │
       ├──────────────────────►│
       │                       │
       │                       │ Create Socket.io client
       │                       │ Register internal handlers
       │                       │
       │ register_handlers()   │
       ├──────────────────────►│
       │                       │
       │                       │ bridge.on('unit:location:updated', handler)
       │                       │ bridge.on('unit:status:updated', handler)
       │                       │ bridge.on('incident:new', handler)
       │                       │ bridge.on('transport:completed', handler)
       │                       │ ... (8 total handlers)
       │                       │
       │ connect()             │
       ├──────────────────────►│
       │                       │
       │                       ├──────────┐
       │                       │          │ Connect to CAD
       │                       │◄─────────┘
       │                       │
       │ Ready                 │
       │◄──────────────────────┤
       │                       │
```

## Room-Based Messaging

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  MDT-A      │         │ CAD Backend │         │  MDT-B      │
│  (Unit-1)   │         │             │         │  (Unit-2)   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                        │
       │ join:unit (Unit-1)    │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │                       │    join:unit (Unit-2)  │
       │                       │◄───────────────────────┤
       │                       │                        │
       │ GPS update            │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │                       │ Broadcast to all       │
       │                       │ (both units see it)    │
       │◄──────────────────────┼───────────────────────►│
       │                       │                        │
       │                       │                        │
┌──────┴──────┐         ┌──────┴──────┐         ┌──────┴──────┐
│ Supervisor  │         │  Dispatcher │         │   FastAPI   │
│   Client    │         │   Console   │         │   Bridge    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                        │
       │                       │                        │
       │ All receive GPS update broadcast               │
       │◄───────────────────────┼────────────────────────┤
       │                       │                        │
```

## Authentication Sequence

```
┌─────────────┐         ┌─────────────┐
│   FastAPI   │         │ CAD Backend │
│   Bridge    │         │   Socket    │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ Connect request       │
       │ (with auth token)     │
       ├──────────────────────►│
       │                       │
       │                       ├──────────┐
       │                       │          │ Verify token
       │                       │◄─────────┘
       │                       │
       │ connect event         │
       │◄──────────────────────┤
       │                       │
       │ fastapi:authenticate  │
       │ (send token again)    │
       ├──────────────────────►│
       │                       │
       │                       ├──────────┐
       │                       │          │ Validate token
       │                       │          │ Join 'fastapi-bridge' room
       │                       │◄─────────┘
       │                       │
       │ authenticated event   │
       │ (success: true)       │
       │◄──────────────────────┤
       │                       │
       │ Authenticated!        │
       │ All events allowed    │
       │                       │
```

---

## Legend

```
├──────►  Outbound request/event
◄───────┤  Inbound response/event
◄──────►  Bidirectional communication
✗         Failed/error
```

## Key Takeaways

1. **Bidirectional**: Messages flow both directions seamlessly
2. **Real-time**: All clients receive updates instantly
3. **Resilient**: Automatic reconnection on failure
4. **Secure**: Token-based authentication required
5. **Scalable**: Room-based messaging for targeted updates
6. **Integrated**: Full platform integration (ePCR, Billing, CAD, etc.)
