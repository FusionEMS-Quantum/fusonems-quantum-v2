# Storage Service - Quick Reference

## Environment Variables

```bash
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_BUCKET=your-bucket-name
SPACES_ACCESS_KEY=your-access-key
SPACES_SECRET_KEY=your-secret-key
SPACES_CDN_ENDPOINT=https://your-cdn.com  # Optional
```

## File Path Convention

```
/{orgId}/{system}/{objectType}/{objectId}/{filename}
```

**Systems**: `workspace`, `accounting`, `communications`, `app-builder`

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/storage/upload` | Upload file |
| POST | `/api/storage/signed-url` | Get access URL |
| DELETE | `/api/storage/delete` | Delete file |
| GET | `/api/storage/metadata/{path}` | Get metadata |
| POST | `/api/storage/receipt-upload` | Upload receipt |
| POST | `/api/storage/app-zip-upload` | Upload app ZIP |
| GET | `/api/storage/audit-logs` | Query audit logs |

## Python Usage

```python
from services.storage import get_storage_service, UploadContext

# Initialize
storage = get_storage_service()

# Upload
context = UploadContext(
    org_id="org-123",
    system="accounting",
    object_type="receipt",
    object_id="receipt-456",
    user_id=1
)
metadata = storage.upload_file(file_bytes, "receipt.jpg", context)

# Generate signed URL
url = storage.generate_signed_url(metadata.file_path, expires_in=600)

# Delete
storage.delete_file(metadata.file_path)
```

## cURL Examples

### Upload
```bash
curl -X POST https://api.your-domain.com/api/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@receipt.jpg" \
  -F "org_id=org-123" \
  -F "system=accounting" \
  -F "object_type=receipt" \
  -F "object_id=receipt-456"
```

### Get Signed URL
```bash
curl -X POST https://api.your-domain.com/api/storage/signed-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_path":"org-123/accounting/receipt/receipt-456/receipt.jpg","expires_in":600}'
```

## Database Queries

### Recent uploads
```sql
SELECT file_path, original_filename, created_at
FROM file_records
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Audit logs for a file
```sql
SELECT timestamp, action_type, user_id, success
FROM storage_audit_logs
WHERE file_path = 'org-123/accounting/receipt/receipt-456/receipt.jpg'
ORDER BY timestamp DESC;
```

### Storage usage by org
```sql
SELECT org_id, 
       COUNT(*) as files,
       SUM(file_size) / (1024*1024*1024) as gb
FROM file_records
WHERE deleted = 'false'
GROUP BY org_id
ORDER BY gb DESC;
```

## Health Check

```bash
python3 << 'EOF'
from services.storage import get_storage_service, UploadContext

storage = get_storage_service()
test_data = b"test"
context = UploadContext(org_id="system", system="accounting", 
                        object_type="export", object_id="health")
metadata = storage.upload_file(test_data, "test.txt", context, add_timestamp=False)
url = storage.generate_signed_url(metadata.file_path, 60)
storage.delete_file(metadata.file_path)
print("✅ Storage service healthy")
EOF
```

## Signed URL Expiration Times

- Document viewing: **15 minutes**
- Receipt viewing: **10 minutes**
- Invoice PDF: **15 minutes**
- App ZIP: **5 minutes**

## Database Tables

- `storage_audit_logs` - Audit trail
- `file_records` - File metadata

## Audit Action Types

- `UPLOAD` - File uploaded
- `VIEW` - File viewed
- `EDIT` - File edited
- `DELETE` - File deleted
- `SIGNED_URL_GENERATED` - Access URL created
- `DOWNLOAD` - File downloaded

## Common Issues

| Issue | Solution |
|-------|----------|
| 500 on upload | Check Spaces credentials, test connectivity |
| 403 on signed URL | URL expired or bucket permissions wrong |
| Audit log failure | Check database connection, verify schema |
| Quota exceeded | Run cleanup job, upgrade Spaces quota |

## Documentation

- **Developer Guide**: `/docs/storage/DEVELOPER_GUIDE.md`
- **Operational Runbook**: `/docs/storage/OPERATIONAL_RUNBOOK.md`
- **Implementation Summary**: `/docs/storage/IMPLEMENTATION_SUMMARY.md`
