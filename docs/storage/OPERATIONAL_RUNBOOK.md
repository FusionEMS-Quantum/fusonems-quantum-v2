# DigitalOcean Spaces Storage Service - Operational Runbook

## Quick Reference

**Service**: DigitalOcean Spaces Storage Service  
**Criticality**: HIGH (compliance-critical)  
**Owner**: Platform Engineering  
**On-Call**: Founder Dashboard

---

## Service Overview

The Storage Service is the centralized file storage system for the entire FusonEMS Quantum platform. It manages all file uploads, downloads, and access via DigitalOcean Spaces object storage.

### Critical Components
1. **DigitalOcean Spaces** - S3-compatible object storage
2. **Storage Service** - Python service (`services/storage/storage_service.py`)
3. **Storage API Routes** - FastAPI endpoints (`/api/storage/*`)
4. **Audit Logger** - Database audit trail (`storage_audit_logs` table)
5. **File Records** - Database metadata (`file_records` table)

---

## System Health Checks

### 1. Verify Spaces Connectivity

```bash
# SSH into backend server
ssh user@your-backend-server

# Test Spaces connectivity
python3 << 'EOF'
from services.storage import get_storage_service

storage = get_storage_service()
print(f"Bucket: {storage.bucket_name}")
print(f"Endpoint: {storage.endpoint}")
print(f"Region: {storage.region}")

# Test upload
test_data = b"health check test"
try:
    from services.storage.storage_service import UploadContext
    context = UploadContext(
        org_id="system",
        system="accounting",
        object_type="export",
        object_id="health-check"
    )
    metadata = storage.upload_file(test_data, "health.txt", context, add_timestamp=False)
    print(f"✅ Upload successful: {metadata.file_path}")
    
    # Test signed URL generation
    url = storage.generate_signed_url(metadata.file_path, 60)
    print(f"✅ Signed URL generated")
    
    # Test delete
    storage.delete_file(metadata.file_path)
    print(f"✅ Delete successful")
except Exception as e:
    print(f"❌ Health check failed: {e}")
EOF
```

### 2. Check Audit Log Health

```bash
# Connect to database
psql $DATABASE_URL

-- Check recent audit logs
SELECT COUNT(*) as total_logs, 
       MAX(timestamp) as latest_log,
       MIN(timestamp) as oldest_log
FROM storage_audit_logs;

-- Check for failed operations
SELECT COUNT(*) as failed_ops,
       action_type,
       MAX(timestamp) as latest_failure
FROM storage_audit_logs
WHERE success = 'false'
GROUP BY action_type;

-- Check audit log write rate (last hour)
SELECT COUNT(*) as logs_last_hour
FROM storage_audit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

### 3. Monitor Storage Usage

```bash
# Query Spaces API for usage stats
python3 << 'EOF'
from services.storage import get_storage_service

storage = get_storage_service()
files = storage.list_files(prefix="", max_keys=1000)

total_size = sum(f['size'] for f in files)
total_files = len(files)

print(f"Total files: {total_files}")
print(f"Total size: {total_size / (1024**3):.2f} GB")
print(f"Average file size: {total_size / total_files / 1024:.2f} KB")
EOF
```

### 4. Check File Record Integrity

```sql
-- Files in database vs Spaces
SELECT 
    system,
    COUNT(*) as db_count,
    SUM(file_size) / (1024*1024*1024) as total_gb
FROM file_records
WHERE deleted = 'false'
GROUP BY system;

-- Recently uploaded files
SELECT file_path, original_filename, file_size, created_at
FROM file_records
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Soft-deleted files pending cleanup
SELECT COUNT(*) as soft_deleted,
       SUM(file_size) / (1024*1024*1024) as total_gb
FROM file_records
WHERE deleted = 'true'
  AND deleted_at < NOW() - INTERVAL '90 days';
```

---

## Common Operational Tasks

### Configure New Spaces Bucket

1. **Create bucket in DigitalOcean Console**:
   - Navigate to Spaces → Create a Space
   - Choose region (e.g., NYC3, SFO3)
   - Name: `fusonems-quantum-storage`
   - Set File Listing to **Restricted** (Private)

2. **Generate Spaces Access Keys**:
   - Navigate to API → Spaces Keys → Generate New Key
   - Save Access Key ID and Secret Access Key securely

3. **Configure CORS Policy**:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://your-domain.com"],
         "AllowedMethods": ["GET", "HEAD"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

4. **Update Backend Environment**:
   ```bash
   # Edit .env file
   SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
   SPACES_REGION=nyc3
   SPACES_BUCKET=fusonems-quantum-storage
   SPACES_ACCESS_KEY=<your-access-key>
   SPACES_SECRET_KEY=<your-secret-key>
   SPACES_CDN_ENDPOINT=https://your-cdn.digitaloceanspaces.com  # Optional
   ```

5. **Restart Backend Service**:
   ```bash
   systemctl restart fusonems-backend
   ```

6. **Verify Configuration**:
   ```bash
   # Run health check (see above)
   ```

---

### Query Audit Logs

#### Find All Actions by a User

```sql
SELECT 
    timestamp,
    action_type,
    file_path,
    related_object_type,
    related_object_id,
    success
FROM storage_audit_logs
WHERE user_id = 123
ORDER BY timestamp DESC
LIMIT 50;
```

#### Find All Actions on a Specific File

```sql
SELECT 
    timestamp,
    user_id,
    role,
    action_type,
    ip_address,
    success
FROM storage_audit_logs
WHERE file_path = 'org-123/accounting/receipt/receipt-456/receipt.jpg'
ORDER BY timestamp DESC;
```

#### Find Failed Upload Attempts

```sql
SELECT 
    timestamp,
    user_id,
    file_path,
    error_message
FROM storage_audit_logs
WHERE action_type = 'UPLOAD'
  AND success = 'false'
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

#### Audit Log Statistics

```sql
SELECT 
    DATE(timestamp) as date,
    action_type,
    COUNT(*) as count
FROM storage_audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp), action_type
ORDER BY date DESC, count DESC;
```

---

### Handle File Deletion Requests

#### Soft Delete (Default)

```bash
# Via API
curl -X DELETE https://api.your-domain.com/api/storage/delete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "org-123/accounting/receipt/receipt-456/old.jpg",
    "hard_delete": false
  }'
```

#### Hard Delete (Immediate Physical Removal)

```bash
# Via API (requires elevated permissions)
curl -X DELETE https://api.your-domain.com/api/storage/delete \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "org-123/accounting/receipt/receipt-456/old.jpg",
    "hard_delete": true
  }'
```

#### Manual Hard Delete (Emergency)

```bash
# Direct Spaces deletion (use with extreme caution)
python3 << 'EOF'
from services.storage import get_storage_service

storage = get_storage_service()
file_path = "org-123/accounting/receipt/receipt-456/old.jpg"

# Verify file exists
if storage.file_exists(file_path):
    storage.delete_file(file_path)
    print(f"✅ Deleted: {file_path}")
else:
    print(f"❌ File not found: {file_path}")
EOF
```

---

### Cleanup Soft-Deleted Files

Run this scheduled job monthly to remove files soft-deleted > 90 days ago:

```python
# scripts/cleanup_deleted_files.py
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from services.storage import get_storage_service
from models.storage import FileRecord
from core.config import settings

engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

storage = get_storage_service()

# Find files deleted > 90 days ago
cutoff_date = datetime.utcnow() - timedelta(days=90)
files_to_delete = db.query(FileRecord).filter(
    FileRecord.deleted == "true",
    FileRecord.deleted_at < cutoff_date
).all()

print(f"Found {len(files_to_delete)} files to physically delete")

for file_record in files_to_delete:
    try:
        # Delete from Spaces
        storage.delete_file(file_record.file_path)
        print(f"✅ Deleted from Spaces: {file_record.file_path}")
        
        # Optionally: Update record or leave for audit trail
        # db.delete(file_record)
        
    except Exception as e:
        print(f"❌ Failed to delete {file_record.file_path}: {e}")

db.commit()
db.close()
```

**Schedule via cron**:
```bash
# Run monthly on 1st at 2 AM
0 2 1 * * /usr/bin/python3 /path/to/scripts/cleanup_deleted_files.py >> /var/log/storage-cleanup.log 2>&1
```

---

### Troubleshoot Upload Failures

#### Symptom: Uploads failing with 500 error

**Step 1**: Check Spaces connectivity
```bash
# Test network connectivity to Spaces endpoint
curl -I https://nyc3.digitaloceanspaces.com
```

**Step 2**: Verify credentials
```bash
# Check environment variables
env | grep SPACES_

# Test authentication
python3 << 'EOF'
from services.storage import get_storage_service
storage = get_storage_service()
print(f"Client initialized: {storage.client is not None}")
EOF
```

**Step 3**: Check backend logs
```bash
tail -f /var/log/fusonems-backend/error.log | grep -i storage
```

**Step 4**: Check audit logs for error messages
```sql
SELECT timestamp, user_id, file_path, error_message
FROM storage_audit_logs
WHERE success = 'false'
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

---

### Troubleshoot Signed URL Issues

#### Symptom: Signed URLs return 403 Forbidden

**Cause 1**: URL expired
- Solution: Check expiration time, regenerate URL

**Cause 2**: Incorrect bucket permissions
```bash
# Verify bucket ACL is set to Private (not Public)
# Check via DigitalOcean Console: Spaces → Bucket → Settings
```

**Cause 3**: Incorrect credentials
```bash
# Regenerate Spaces keys and update .env
```

#### Symptom: Signed URLs not generated

**Check audit logs**:
```sql
SELECT COUNT(*) as signed_url_requests,
       MAX(timestamp) as latest_request
FROM storage_audit_logs
WHERE action_type = 'SIGNED_URL_GENERATED'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

**Test signed URL generation**:
```bash
python3 << 'EOF'
from services.storage import get_storage_service

storage = get_storage_service()
url = storage.generate_signed_url("org-123/workspace/doc/test-123/doc.pdf", 300)
print(f"Signed URL: {url}")
EOF
```

---

### Monitor Storage Quota

```bash
# Get current usage
python3 << 'EOF'
from services.storage import get_storage_service

storage = get_storage_service()
files = storage.list_files(prefix="", max_keys=10000)

total_size_gb = sum(f['size'] for f in files) / (1024**3)
print(f"Total storage used: {total_size_gb:.2f} GB")

# DigitalOcean Spaces: 250 GB free, $5/month per additional 250 GB
if total_size_gb > 250:
    print(f"⚠️  Exceeding free tier by {total_size_gb - 250:.2f} GB")
EOF
```

---

## Incident Response

### Incident: Audit Log Write Failures

**Severity**: CRITICAL (compliance risk)

**Detection**:
- Backend logs show "CRITICAL: Failed to write audit log"
- Monitoring alert triggered

**Response**:
1. **Immediate**: Check database connectivity
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Check storage_audit_logs table schema**:
   ```sql
   \d storage_audit_logs
   ```

3. **Verify foreign key constraints**:
   ```sql
   SELECT * FROM information_schema.table_constraints
   WHERE table_name = 'storage_audit_logs';
   ```

4. **Review recent errors**:
   ```bash
   tail -n 100 /var/log/fusonems-backend/error.log | grep -i audit
   ```

5. **Escalate** if unresolved within 15 minutes

---

### Incident: Spaces API Downtime

**Severity**: HIGH (file operations blocked)

**Detection**:
- Upload/download failures
- 5xx errors from Spaces API

**Response**:
1. **Check DigitalOcean Status**:
   - Visit https://status.digitalocean.com

2. **Enable maintenance mode** (if prolonged outage):
   ```bash
   # Disable file upload routes temporarily
   # Return 503 Service Unavailable
   ```

3. **Notify users** via platform banner

4. **Monitor recovery**:
   - Run health check every 5 minutes
   - Re-enable routes when Spaces is operational

---

### Incident: Storage Quota Exceeded

**Severity**: MEDIUM (prevents new uploads)

**Detection**:
- Upload failures with quota errors
- Monitoring alert

**Response**:
1. **Immediate**: Check current usage
   ```bash
   # See "Monitor Storage Quota" above
   ```

2. **Identify largest files/organizations**:
   ```sql
   SELECT org_id, 
          system,
          COUNT(*) as file_count,
          SUM(file_size) / (1024*1024*1024) as total_gb
   FROM file_records
   WHERE deleted = 'false'
   GROUP BY org_id, system
   ORDER BY total_gb DESC
   LIMIT 10;
   ```

3. **Options**:
   - **Cleanup**: Run soft-delete cleanup job
   - **Upgrade**: Increase Spaces quota via DigitalOcean
   - **Archive**: Move old files to cheaper storage tier

---

## Monitoring & Alerts

### Key Metrics

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| Upload success rate | < 95% | Warning |
| Audit log write failures | > 0 | Critical |
| Spaces API error rate | > 5% | Warning |
| Spaces API latency | > 2s | Warning |
| Storage usage | > 80% quota | Warning |
| Storage usage | > 95% quota | Critical |

### Alert Configuration (Example: Prometheus)

```yaml
groups:
  - name: storage_alerts
    rules:
      - alert: AuditLogWriteFailure
        expr: increase(storage_audit_log_failures_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Audit log write failures detected"
          description: "Storage audit logging is failing - compliance risk"

      - alert: HighStorageUsage
        expr: storage_usage_gb / storage_quota_gb > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Storage usage exceeds 80% of quota"

      - alert: SpacesAPIHighErrorRate
        expr: rate(spaces_api_errors_total[5m]) / rate(spaces_api_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Spaces API error rate > 5%"
```

---

## Backup & Recovery

### Database Backup (Audit Logs & File Records)

```bash
# Automated daily backup
pg_dump $DATABASE_URL -t storage_audit_logs -t file_records > storage_backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < storage_backup_20260126.sql
```

### Spaces Backup (Files)

DigitalOcean Spaces does not have built-in backup. Options:

1. **Manual backup via CLI**:
   ```bash
   # Install s3cmd
   apt-get install s3cmd

   # Configure
   s3cmd --configure

   # Sync to local backup
   s3cmd sync s3://fusonems-quantum-storage /backup/spaces/
   ```

2. **Third-party backup service**:
   - Consider Veeam, CloudBerry, or similar S3-compatible backup tools

---

## Contact & Escalation

**Primary On-Call**: Founder Dashboard  
**Escalation Path**:
1. Platform Engineering Lead
2. CTO
3. Founder

**Emergency Contacts**:
- DigitalOcean Support: https://www.digitalocean.com/support

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Initial runbook creation | Platform Eng |
