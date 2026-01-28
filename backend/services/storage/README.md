# Storage Service

**Centralized file storage service for FusonEMS Quantum Platform**

## Overview

The Storage Service is the single, authoritative interface for all file operations in the platform. It uses DigitalOcean Spaces (S3-compatible object storage) as the backend and provides secure, auditable, and compliant file management.

## Key Features

- ✅ **Centralized**: Only interface to DigitalOcean Spaces
- ✅ **Secure**: Private files, signed URLs, role-based access
- ✅ **Auditable**: Full logging of all file operations
- ✅ **Compliant**: Soft deletes, retention policies, PHI/PII protection
- ✅ **Organized**: Strict file path conventions by org/system/object type

## Architecture

```
Frontend → API Routes → Storage Service → DigitalOcean Spaces
                              ↓
                       Audit Logger → Database
```

## File Organization

All files follow this path structure:

```
/{orgId}/{system}/{objectType}/{objectId}/{filename}
```

**Systems**: `workspace`, `accounting`, `communications`, `app-builder`

## Quick Start

### 1. Configuration

Add to `.env`:
```bash
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_BUCKET=your-bucket-name
SPACES_ACCESS_KEY=your-access-key
SPACES_SECRET_KEY=your-secret-key
```

### 2. Database Migration

```bash
alembic upgrade head
```

### 3. Usage

```python
from services.storage import get_storage_service, UploadContext

storage = get_storage_service()

# Upload file
context = UploadContext(
    org_id="org-123",
    system="accounting",
    object_type="receipt",
    object_id="receipt-456",
    user_id=1
)

metadata = storage.upload_file(
    file_data=file_bytes,
    filename="receipt.jpg",
    context=context,
    mime_type="image/jpeg"
)

# Generate signed URL (10 min expiration)
url = storage.generate_signed_url(metadata.file_path, expires_in=600)

# Delete file
storage.delete_file(metadata.file_path)
```

## API Endpoints

- `POST /api/storage/upload` - Upload file
- `POST /api/storage/signed-url` - Generate access URL
- `DELETE /api/storage/delete` - Delete file (soft/hard)
- `GET /api/storage/metadata/{path}` - Get file metadata
- `POST /api/storage/receipt-upload` - Upload accounting receipt
- `POST /api/storage/app-zip-upload` - Upload app builder ZIP
- `GET /api/storage/audit-logs` - Query audit logs

## Modules

| Module | Purpose |
|--------|---------|
| `storage_service.py` | Core storage operations |
| `audit_service.py` | Audit logging and file records |
| `path_utils.py` | Path construction and validation |
| `schemas.py` | Pydantic request/response models |
| `storage_router.py` | FastAPI routes |

## Database Tables

- `storage_audit_logs` - Immutable audit trail
- `file_records` - File metadata and soft delete tracking

## Documentation

📖 **[Developer Guide](../../docs/storage/DEVELOPER_GUIDE.md)** - API reference, integration examples  
📖 **[Operational Runbook](../../docs/storage/OPERATIONAL_RUNBOOK.md)** - Health checks, troubleshooting  
📖 **[Implementation Summary](../../docs/storage/IMPLEMENTATION_SUMMARY.md)** - Architecture overview  
📖 **[Quick Reference](../../docs/storage/QUICK_REFERENCE.md)** - Commands, queries, examples

## Security

- All files **private by default** (ACL='private')
- Access via **short-lived signed URLs** (5–15 minutes)
- **Full audit logging** of every operation
- **Role-based access control** on all API routes
- **No Spaces credentials** exposed to frontend

## Compliance

- ✅ HIPAA-compliant audit trails
- ✅ Soft delete for data retention
- ✅ Immutable audit logs
- ✅ PHI/PII-safe logging (no sensitive content in logs)
- ✅ Encryption at rest (DigitalOcean Spaces)

## Support

For issues or questions:
1. Check [Developer Guide](../../docs/storage/DEVELOPER_GUIDE.md)
2. Review [Operational Runbook](../../docs/storage/OPERATIONAL_RUNBOOK.md)
3. Contact Platform Engineering
