# Founder Dashboard - System Health & Storage Integration

## Overview

The Founder Dashboard now provides complete visibility into all critical platform systems, including:

- **Storage System** (DigitalOcean Spaces)
- **Validation Rule Builder**
- **NEMSIS System** (EMS data compliance)
- **Export System** (EPCR exports)

## New API Endpoints

### 1. Unified System Health

**GET `/api/founder/system/health`**

Returns overall system status across all subsystems.

**Response**:
```json
{
  "overall_status": "HEALTHY|WARNING|DEGRADED|CRITICAL",
  "overall_message": "All systems healthy",
  "timestamp": "2026-01-26T12:34:56Z",
  "subsystems": {
    "storage": {
      "status": "HEALTHY",
      "message": "Storage system operating normally",
      "configured": true,
      "bucket": "fusonems-quantum-storage",
      "region": "nyc3",
      "metrics": {
        "total_files": 1234,
        "total_size_gb": 45.67,
        "quota_usage_pct": 18.3,
        "operations_24h": 567,
        "failed_operations_24h": 0,
        "error_rate_24h_pct": 0.0
      }
    },
    "validation_rules": {
      "status": "HEALTHY",
      "message": "Validation system operating normally",
      "metrics": {
        "total_rules": 45,
        "active_rules": 42,
        "open_issues": 3,
        "high_severity_issues": 0
      }
    },
    "nemsis": {
      "status": "HEALTHY",
      "message": "NEMSIS system operating normally",
      "metrics": {
        "total_patients": 892,
        "finalized_patients": 850,
        "locked_charts": 850,
        "avg_qa_score": 94.5
      }
    },
    "exports": {
      "status": "HEALTHY",
      "message": "Export system operating normally",
      "metrics": {
        "total_exports": 156,
        "recent_exports_24h": 5,
        "failed_exports_24h": 0,
        "pending_exports": 0,
        "failure_rate_pct": 0.0
      }
    }
  },
  "critical_issues": [],
  "warnings": [],
  "requires_immediate_attention": false
}
```

**Status Levels**:
- `HEALTHY` - All systems operational
- `WARNING` - Minor issues, no immediate action required
- `DEGRADED` - Reduced functionality, attention needed soon
- `CRITICAL` - System failure or critical threshold exceeded, immediate action required

---

### 2. Storage System Health

**GET `/api/founder/storage/health`**

Detailed storage system health and metrics.

**Response**:
```json
{
  "status": "HEALTHY",
  "configured": true,
  "message": "Storage system operating normally",
  "bucket": "fusonems-quantum-storage",
  "region": "nyc3",
  "metrics": {
    "total_files": 1234,
    "total_size_gb": 45.67,
    "deleted_files": 23,
    "quota_gb": 250.0,
    "quota_usage_pct": 18.3,
    "operations_24h": 567,
    "failed_operations_24h": 0,
    "error_rate_24h_pct": 0.0,
    "operations_1h": 45,
    "failed_operations_1h": 0,
    "error_rate_1h_pct": 0.0
  },
  "last_upload": "2026-01-26T12:30:00Z",
  "last_failure": null,
  "last_failure_message": null
}
```

---

### 3. Storage Activity

**GET `/api/founder/storage/activity?limit=20`**

Recent storage operations (uploads, downloads, deletions).

**Response**:
```json
{
  "activity": [
    {
      "timestamp": "2026-01-26T12:30:00Z",
      "action_type": "UPLOAD",
      "file_path": "org-123/accounting/receipt/receipt-456/receipt.jpg",
      "user_id": 5,
      "success": true,
      "error_message": null
    }
  ],
  "count": 20
}
```

---

### 4. Storage Breakdown

**GET `/api/founder/storage/breakdown`**

Storage usage by system (workspace, accounting, etc.).

**Response**:
```json
{
  "by_system": [
    {
      "system": "accounting",
      "file_count": 567,
      "size_mb": 12345.67,
      "size_gb": 12.05
    },
    {
      "system": "workspace",
      "file_count": 432,
      "size_mb": 8901.23,
      "size_gb": 8.69
    }
  ],
  "total_systems": 4
}
```

---

### 5. Storage Failures

**GET `/api/founder/storage/failures?limit=50`**

Recent failed storage operations.

**Response**:
```json
{
  "failures": [
    {
      "timestamp": "2026-01-26T10:15:00Z",
      "action_type": "UPLOAD",
      "file_path": "org-123/workspace/doc/doc-789/large-file.pdf",
      "user_id": 3,
      "error_message": "File size exceeds limit",
      "ip_address": "192.168.1.100"
    }
  ],
  "count": 1
}
```

---

### 6. Builder Systems Health

**GET `/api/founder/builders/health`**

Health status of all builder systems (Validation Rules, NEMSIS, Exports).

**Response**:
```json
{
  "builders": {
    "validation_rules": {
      "status": "HEALTHY",
      "message": "Validation system operating normally",
      "metrics": {
        "total_rules": 45,
        "active_rules": 42,
        "inactive_rules": 3,
        "open_issues": 3,
        "recent_issues_24h": 5,
        "high_severity_issues": 0
      }
    },
    "nemsis": {
      "status": "HEALTHY",
      "message": "NEMSIS system operating normally",
      "metrics": {
        "total_patients": 892,
        "finalized_patients": 850,
        "locked_charts": 850,
        "recent_charts_24h": 12,
        "avg_qa_score": 94.5
      }
    },
    "exports": {
      "status": "HEALTHY",
      "message": "Export system operating normally",
      "metrics": {
        "total_exports": 156,
        "recent_exports_24h": 5,
        "failed_exports_24h": 0,
        "pending_exports": 0,
        "completed_exports_24h": 5,
        "failure_rate_pct": 0.0
      }
    }
  },
  "timestamp": "2026-01-26T12:34:56Z"
}
```

---

## Health Status Thresholds

### Storage System

| Metric | WARNING | DEGRADED | CRITICAL |
|--------|---------|----------|----------|
| Error rate (1h) | > 0 failures | > 5% | > 10% |
| Quota usage | > 80% | - | > 95% |
| Failed operations | Any in last hour | - | - |

### Validation Rules

| Metric | WARNING | DEGRADED | CRITICAL |
|--------|---------|----------|----------|
| Open issues | > 50 | - | - |
| High severity issues | - | > 5 | > 10 |

### NEMSIS System

| Metric | WARNING | DEGRADED | CRITICAL |
|--------|---------|----------|----------|
| Avg QA score | - | < 70 | - |
| Billing-ready patients | 0 (if total > 0) | - | - |

### Exports

| Metric | WARNING | DEGRADED | CRITICAL |
|--------|---------|----------|----------|
| Pending exports | > 10 | - | - |
| Failure rate (24h) | - | > 10% | > 20% |

---

## Founder Dashboard Widget Examples

### System Health Status Card

```typescript
// Frontend component
import { useEffect, useState } from 'react';

function SystemHealthWidget() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/founder/system/health', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setHealth);
  }, []);

  if (!health) return <div>Loading...</div>;

  const statusColor = {
    HEALTHY: 'green',
    WARNING: 'yellow',
    DEGRADED: 'orange',
    CRITICAL: 'red'
  }[health.overall_status];

  return (
    <div className="health-widget">
      <h2>System Health</h2>
      <div className={`status ${statusColor}`}>
        {health.overall_status}
      </div>
      <p>{health.overall_message}</p>
      
      {health.critical_issues.length > 0 && (
        <div className="critical-issues">
          <h3>⚠️ Immediate Attention Required</h3>
          <ul>
            {health.critical_issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {health.warnings.length > 0 && (
        <div className="warnings">
          <h3>⚡ Warnings</h3>
          <ul>
            {health.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="subsystems">
        {Object.entries(health.subsystems).map(([name, data]) => (
          <SubsystemStatus key={name} name={name} data={data} />
        ))}
      </div>
    </div>
  );
}
```

### Storage Quota Widget

```typescript
function StorageQuotaWidget() {
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    fetch('/api/founder/storage/health', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setStorage);
  }, []);

  if (!storage) return <div>Loading...</div>;

  const { total_size_gb, quota_gb, quota_usage_pct } = storage.metrics;

  return (
    <div className="storage-quota-widget">
      <h3>Storage Usage</h3>
      <div className="quota-bar">
        <div 
          className="usage" 
          style={{ width: `${quota_usage_pct}%` }}
        />
      </div>
      <p>{total_size_gb.toFixed(2)} GB / {quota_gb} GB</p>
      <p>{quota_usage_pct.toFixed(1)}% used</p>
      
      {quota_usage_pct > 80 && (
        <div className="warning">
          ⚠️ Approaching quota limit
        </div>
      )}
    </div>
  );
}
```

### Recent Activity Feed

```typescript
function RecentActivityWidget() {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    fetch('/api/founder/storage/activity?limit=10', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setActivity(data.activity));
  }, []);

  return (
    <div className="activity-feed">
      <h3>Recent Storage Activity</h3>
      <ul>
        {activity.map((item, i) => (
          <li key={i} className={item.success ? 'success' : 'failed'}>
            <span className="time">{new Date(item.timestamp).toLocaleTimeString()}</span>
            <span className="action">{item.action_type}</span>
            <span className="file">{item.file_path.split('/').pop()}</span>
            {!item.success && <span className="error">❌ {item.error_message}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Operational Dashboard Layout

Recommended layout for Founder Dashboard:

```
┌─────────────────────────────────────────────────────────┐
│  Founder Dashboard                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │ System Health │  │ Storage Quota │  │ Validation │ │
│  │ HEALTHY ✓     │  │ 45.67 / 250GB │  │ 42 active  │ │
│  │               │  │ █████░░░░░░░  │  │ 3 issues   │ │
│  └───────────────┘  └───────────────┘  └────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Recent Storage Activity                          │  │
│  │ • 12:30 PM - UPLOAD - receipt.jpg ✓              │  │
│  │ • 12:15 PM - SIGNED_URL - report.pdf ✓           │  │
│  │ • 11:45 AM - DELETE - old-file.docx ✓            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Builder Systems Status                           │  │
│  │ • NEMSIS: HEALTHY - 850 finalized charts         │  │
│  │ • Exports: HEALTHY - 0 failures (24h)            │  │
│  │ • Validation: HEALTHY - 0 high-severity issues   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Critical Issues & Warnings                       │  │
│  │ (empty - all systems healthy)                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Alert Configuration

### Critical Alerts (Immediate Notification)

1. **Storage system CRITICAL** - High error rate or quota exceeded
2. **Validation: 10+ high-severity issues**
3. **Exports: >20% failure rate**
4. **Audit log write failure** (from storage system)

### Warning Alerts (Founder Dashboard notification)

1. **Storage quota >80%**
2. **Validation: 5+ high-severity issues**
3. **NEMSIS: Avg QA score <70**
4. **Exports: 10+ pending**

---

## Implementation Files

### Backend
- `/backend/services/storage/health_service.py` - Storage health calculations
- `/backend/services/founder/system_health_service.py` - Unified system health
- `/backend/services/founder/founder_router.py` - API endpoints (updated)

### New Endpoints Added to Founder Router
- `GET /api/founder/system/health` - Unified system health
- `GET /api/founder/storage/health` - Storage system health
- `GET /api/founder/storage/activity` - Recent storage activity
- `GET /api/founder/storage/breakdown` - Storage by system
- `GET /api/founder/storage/failures` - Failed operations
- `GET /api/founder/builders/health` - Builder systems health

---

## Testing

### Test System Health Endpoint

```bash
# Get system health
curl -X GET http://localhost:8000/api/founder/system/health \
  -H "Authorization: Bearer $FOUNDER_TOKEN" \
  | jq .

# Get storage health
curl -X GET http://localhost:8000/api/founder/storage/health \
  -H "Authorization: Bearer $FOUNDER_TOKEN" \
  | jq .

# Get builders health
curl -X GET http://localhost:8000/api/founder/builders/health \
  -H "Authorization: Bearer $FOUNDER_TOKEN" \
  | jq .
```

---

## Next Steps

1. **Frontend Implementation**
   - Create React components for health widgets
   - Add to Founder Dashboard page
   - Implement real-time updates (polling or WebSocket)

2. **Alerting**
   - Configure alerts for CRITICAL status
   - Set up email/SMS notifications for founders
   - Add push notifications to PWA

3. **Monitoring**
   - Add Prometheus metrics
   - Set up Grafana dashboards
   - Configure alert rules

---

**Status**: ✅ Backend implementation complete  
**Date**: 2026-01-26  
**Next**: Frontend integration and alerting setup
