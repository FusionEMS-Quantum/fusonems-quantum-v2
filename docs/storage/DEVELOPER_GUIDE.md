# DigitalOcean Spaces Storage Service - Developer Documentation

## Overview

The Storage Service is the **single, centralized interface** for all file operations in the FusonEMS Quantum platform. It provides secure, auditable, and compliant file storage using DigitalOcean Spaces as the backend.

## Core Principles

1. **Centralization**: Only the Storage Service communicates with DigitalOcean Spaces
2. **Security**: All files are private by default, accessed via short-lived signed URLs
3. **Auditability**: Every file operation is logged to the database
4. **Compliance**: Supports soft deletes, retention policies, and PHI/PII protection

## Architecture

```
Frontend Modules (Workspace, Accounting, Communications, App Builder, PWA)
    ↓
Storage API Routes (/api/storage/*)
    ↓
Storage Service (services/storage/storage_service.py)
    ↓
DigitalOcean Spaces + Audit Logger
    ↓
Database (file_records, storage_audit_logs)
```

## File Path Convention

All files follow a strict path convention:

```
/{orgId}/{system}/{objectType}/{objectId}/{filename}
```

### Valid System Values
- `workspace` - Documents, spreadsheets, presentations, PDFs
- `accounting` - Receipts, invoices, exports
- `communications` - Email and message attachments
- `app-builder` - Application source ZIPs and build artifacts

### Valid Object Types by System

**workspace**:
- `doc` - Documents
- `sheet` - Spreadsheets
- `slide` - Presentations
- `pdf` - PDF files

**accounting**:
- `receipt` - Receipt images/documents
- `invoice` - Invoice PDFs
- `export` - Financial exports (P&L, GL, etc.)

**communications**:
- `email-attachment` - Email attachments
- `message-attachment` - Portal message attachments

**app-builder**:
- `source` - Application source ZIP files
- `build` - Build artifacts and logs

### Path Examples

```
org-123/workspace/doc/abc-def-123/report.docx
org-123/accounting/receipt/receipt-456/20260126_153045_IMG_2024.jpg
org-123/communications/email-attachment/msg-789/contract.pdf
org-123/app-builder/source/app-101/app.zip
```

## Storage Service API Reference

### Core Methods

#### `upload_file(file_data, filename, context, mime_type, add_timestamp)`

Uploads a file to Spaces with automatic path generation.

**Parameters**:
- `file_data` (bytes): File content
- `filename` (str): Original filename
- `context` (UploadContext): Upload context with org_id, system, object_type, object_id, user info
- `mime_type` (str): MIME type (default: "application/octet-stream")
- `add_timestamp` (bool): Prepend timestamp to filename (default: True)

**Returns**: `FileMetadata` with file_path, size, mime_type, uploaded_at, original_filename

**Raises**: 
- `ValueError`: Invalid system or object_type
- `RuntimeError`: Upload failed

**Example**:
```python
from services.storage import get_storage_service, UploadContext

storage = get_storage_service()

context = UploadContext(
    org_id="org-123",
    system="accounting",
    object_type="receipt",
    object_id="receipt-456",
    user_id=1,
    role="accountant"
)

metadata = storage.upload_file(
    file_data=file_bytes,
    filename="receipt.jpg",
    context=context,
    mime_type="image/jpeg"
)

print(metadata.file_path)  # org-123/accounting/receipt/receipt-456/20260126_153045_receipt.jpg
```

#### `generate_signed_url(file_path, expires_in, context)`

Generates a time-limited signed URL for file access.

**Parameters**:
- `file_path` (str): Full path to file in Spaces
- `expires_in` (int): URL expiration in seconds (default: 600 = 10 minutes)
- `context` (UploadContext, optional): Context for audit logging

**Returns**: `str` - Signed URL

**Raises**: `RuntimeError` if generation fails

**Example**:
```python
url = storage.generate_signed_url(
    file_path="org-123/accounting/receipt/receipt-456/receipt.jpg",
    expires_in=600  # 10 minutes
)
```

#### `delete_file(file_path, context)`

Permanently deletes a file from Spaces (hard delete).

**Parameters**:
- `file_path` (str): Full path to file
- `context` (UploadContext, optional): Context for audit logging

**Returns**: `bool` - True if successful

**Example**:
```python
storage.delete_file("org-123/accounting/receipt/receipt-456/old.jpg")
```

#### `file_exists(file_path)`

Check if a file exists in Spaces.

**Returns**: `bool`

#### `get_file_metadata(file_path)`

Retrieve file metadata from Spaces.

**Returns**: `dict` with size, mime_type, last_modified, metadata

## REST API Endpoints

### POST /api/storage/upload

Upload a file with context metadata.

**Request** (multipart/form-data):
```
file: <binary file data>
org_id: "org-123"
system: "accounting"
object_type: "receipt"
object_id: "receipt-456"
related_object_type: "invoice" (optional)
related_object_id: "inv-789" (optional)
```

**Response**:
```json
{
  "success": true,
  "file_path": "org-123/accounting/receipt/receipt-456/20260126_153045_receipt.jpg",
  "metadata": {
    "size": 245678,
    "mime_type": "image/jpeg",
    "uploaded_at": "2026-01-26T15:30:45Z",
    "original_filename": "receipt.jpg"
  }
}
```

**Authentication**: Required (JWT or session)

**Rate Limit**: Standard per-user limits apply

---

### POST /api/storage/signed-url

Generate a signed URL for file access.

**Request**:
```json
{
  "file_path": "org-123/accounting/receipt/receipt-456/receipt.jpg",
  "expires_in": 600,
  "related_object_type": "invoice",
  "related_object_id": "inv-789"
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://bucket.nyc3.digitaloceanspaces.com/...",
  "expires_at": "2026-01-26T15:40:45Z"
}
```

**Authentication**: Required

**Access Control**: User must have access to the related business object

---

### DELETE /api/storage/delete

Delete a file (soft or hard delete).

**Request**:
```json
{
  "file_path": "org-123/accounting/receipt/receipt-456/receipt.jpg",
  "hard_delete": false,
  "related_object_type": "receipt",
  "related_object_id": "receipt-456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File soft-deleted (marked as deleted in database)"
}
```

**Authentication**: Required

**Notes**:
- Soft delete (default): Marks file as deleted in database, file remains in Spaces
- Hard delete: Immediately removes file from Spaces (requires elevated permissions)

---

### GET /api/storage/metadata/{file_path}

Retrieve file metadata from database.

**Response**:
```json
{
  "success": true,
  "file_path": "org-123/accounting/receipt/receipt-456/receipt.jpg",
  "size": 245678,
  "mime_type": "image/jpeg",
  "uploaded_at": "2026-01-26T15:30:45Z",
  "original_filename": "receipt.jpg",
  "system": "accounting",
  "object_type": "receipt",
  "deleted": false
}
```

---

### POST /api/storage/receipt-upload

Specialized endpoint for accounting receipts.

**Request** (multipart/form-data):
```
file: <binary file data>
org_id: "org-123"
object_id: "receipt-456"
related_object_type: "invoice" (optional)
related_object_id: "inv-789" (optional)
```

Automatically sets `system="accounting"` and `object_type="receipt"`.

---

### POST /api/storage/app-zip-upload

Specialized endpoint for App Builder ZIP uploads.

**Request** (multipart/form-data):
```
file: <binary ZIP file>
org_id: "org-123"
object_id: "app-101"
```

**Validation**: Only `.zip` files allowed

Automatically sets `system="app-builder"` and `object_type="source"`.

---

### GET /api/storage/audit-logs

Retrieve audit logs for file operations.

**Query Parameters**:
- `file_path` (optional): Filter by file path
- `action_type` (optional): Filter by action (UPLOAD, VIEW, EDIT, DELETE, SIGNED_URL_GENERATED)
- `limit` (optional): Max results (default: 100)

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 123,
      "user_id": 1,
      "role": "accountant",
      "timestamp": "2026-01-26T15:30:45Z",
      "action_type": "UPLOAD",
      "file_path": "org-123/accounting/receipt/receipt-456/receipt.jpg",
      "related_object_type": "invoice",
      "related_object_id": "inv-789",
      "metadata": {
        "file_size": 245678,
        "mime_type": "image/jpeg"
      },
      "success": "true"
    }
  ],
  "count": 1
}
```

## Audit Logging

Every file operation is logged to the `storage_audit_logs` table.

### Audit Action Types
- `UPLOAD` - File uploaded to Spaces
- `VIEW` - Signed URL generated for viewing
- `EDIT` - File updated/overwritten
- `DELETE` - File deleted (soft or hard)
- `SIGNED_URL_GENERATED` - Access URL created
- `DOWNLOAD` - File downloaded (future use)

### Audit Log Fields
- `id` - Primary key
- `user_id` - User who performed the action
- `role` - User's role at time of action
- `timestamp` - When the action occurred
- `ip_address` - Client IP address
- `device_info` - User agent / device information
- `action_type` - Type of action
- `file_path` - File path in Spaces
- `related_object_type` - Related business object type
- `related_object_id` - Related business object ID
- `metadata` - JSON field with additional context
- `success` - "true" or "false"
- `error_message` - Error details if failed

### Querying Audit Logs

```python
from services.storage.audit_service import AuditLogger
from models.storage import AuditActionType

# Get all uploads by a user
logs = AuditLogger.get_audit_logs(
    db=db,
    user_id=1,
    action_type=AuditActionType.UPLOAD,
    limit=50
)

# Get all actions on a specific file
logs = AuditLogger.get_audit_logs(
    db=db,
    file_path="org-123/accounting/receipt/receipt-456/receipt.jpg"
)
```

## File Records

The `file_records` table stores metadata for all files in the system.

### Fields
- `id` - Primary key
- `org_id` - Organization ID
- `file_path` - Full path in Spaces (unique)
- `original_filename` - Original filename
- `file_size` - Size in bytes
- `mime_type` - MIME type
- `system` - System category
- `object_type` - Object type within system
- `object_id` - Related object ID
- `uploaded_by` - User who uploaded the file
- `deleted` - "true" or "false" (soft delete flag)
- `deleted_at` - When deleted (if soft-deleted)
- `deleted_by` - User who deleted the file
- `version` - File version (for versioning)
- `created_at` - Upload timestamp
- `updated_at` - Last update timestamp

### Soft Delete

Soft delete marks a file as deleted in the database without removing it from Spaces.

```python
from services.storage.audit_service import FileRecordService

# Soft delete a file
FileRecordService.soft_delete_file(
    db=db,
    file_path="org-123/accounting/receipt/receipt-456/old.jpg",
    deleted_by=user_id
)

# List files (excluding deleted)
files = FileRecordService.list_files_by_context(
    db=db,
    org_id="org-123",
    system="accounting",
    object_type="receipt",
    include_deleted=False
)
```

## Signed URL Expiration Times

**Recommended expiration times by use case**:
- Document viewing: **15 minutes** (900 seconds)
- Receipt viewing: **10 minutes** (600 seconds)
- Invoice PDF: **15 minutes** (900 seconds)
- App ZIP (internal use): **5 minutes** (300 seconds)

## Security & Compliance

### Security Checklist
- ✅ All files are **private by default** (ACL='private')
- ✅ Signed URLs are **short-lived** (5–15 minutes)
- ✅ No Spaces credentials exposed to frontend
- ✅ File uploads validated (size, type)
- ✅ HTTPS-only access enforced
- ✅ Role-based access control on all routes
- ✅ Audit logs are immutable

### Compliance (HIPAA, Financial)
- ✅ All file access is audited
- ✅ Files containing PHI/PII encrypted at rest (Spaces-side)
- ✅ Audit logs retained per policy (7 years for financial)
- ✅ Soft delete prevents accidental data loss
- ✅ Access to audit logs is restricted

## Error Handling

### Common Errors

**400 Bad Request**:
- Invalid system or object_type
- Missing required fields
- Invalid file type (e.g., non-ZIP for app upload)

**404 Not Found**:
- File not found in database
- File has been soft-deleted

**500 Internal Server Error**:
- Spaces connection failure
- Audit log write failure (CRITICAL)
- Unexpected errors

### Example Error Response
```json
{
  "detail": "Invalid system: invalid-system"
}
```

## Frontend Integration Examples

### JavaScript/TypeScript (Upload)

```typescript
async function uploadReceipt(file: File, orgId: string, objectId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('org_id', orgId);
  formData.append('object_id', objectId);

  const response = await fetch('/api/storage/receipt-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData
  });

  const result = await response.json();
  return result;
}
```

### JavaScript/TypeScript (View with Signed URL)

```typescript
async function viewFile(filePath: string) {
  const response = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      file_path: filePath,
      expires_in: 600
    })
  });

  const result = await response.json();
  
  // Open signed URL in new tab or embed in viewer
  window.open(result.url, '_blank');
}
```

## Configuration

### Environment Variables

Required for production:

```bash
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_BUCKET=your-bucket-name
SPACES_ACCESS_KEY=your-access-key
SPACES_SECRET_KEY=your-secret-key
SPACES_CDN_ENDPOINT=https://your-cdn-endpoint.com (optional)
```

### DigitalOcean Spaces Setup

1. Create a Spaces bucket in DigitalOcean
2. Set bucket ACL to **Private**
3. Configure CORS policy:
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
4. Generate Spaces access key and secret
5. Add credentials to backend `.env` file

## Monitoring & Alerts

### Key Metrics to Monitor
- Spaces API latency (upload, signed URL generation)
- Spaces API error rate (4xx, 5xx responses)
- Storage usage (total GB, growth rate)
- Upload success/failure rate
- Audit log write failures (CRITICAL)

### Recommended Alerts
- Spaces API downtime or high error rate
- Audit log write failures (compliance-critical)
- Storage quota approaching limit
- Unusual upload volume (potential abuse)

## Troubleshooting

### Upload Fails with "Storage service not properly configured"

**Cause**: Missing Spaces credentials

**Solution**: Verify all `SPACES_*` environment variables are set

---

### Signed URL Returns 403 Forbidden

**Cause**: URL expired or incorrect bucket permissions

**Solution**: 
1. Check URL expiration time
2. Verify Spaces bucket ACL is set to Private
3. Confirm Spaces credentials are correct

---

### Audit Log Write Failure

**Cause**: Database connection issue or constraint violation

**Solution**:
1. Check database connectivity
2. Verify `users` table exists (foreign key constraint)
3. Check audit log for stack trace

---

### File Not Found (404) After Upload

**Cause**: Soft-deleted file or database/Spaces mismatch

**Solution**:
1. Query `file_records` table to check `deleted` flag
2. Verify file exists in Spaces using Spaces console
3. Check audit logs for deletion events

## Best Practices

1. **Always use the Storage API routes** - Never access Spaces directly from frontend
2. **Set appropriate expiration times** - Balance security vs. user experience
3. **Monitor audit logs** - Regular review for suspicious activity
4. **Implement rate limiting** - Prevent abuse of upload endpoints
5. **Use soft delete by default** - Allows recovery and maintains audit trail
6. **Organize files by context** - Use consistent org_id, system, object_type, object_id
7. **Validate file types** - Check MIME type and file extensions before upload
8. **Handle errors gracefully** - Provide user-friendly error messages

## Future Enhancements

- **Virus scanning**: Integrate with ClamAV or similar on upload
- **File versioning**: Automatic versioning with rollback capability
- **Retention policies**: Automated cleanup of old/deleted files
- **CDN integration**: Serve files via DigitalOcean CDN for performance
- **Thumbnails**: Auto-generate thumbnails for images
- **Encryption**: Client-side encryption before upload
- **Multi-region**: Replicate files across regions for HA
