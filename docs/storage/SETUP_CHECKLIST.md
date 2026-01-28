# DigitalOcean Spaces Storage Service - Setup Checklist

## Pre-Deployment Checklist

### ☐ DigitalOcean Spaces Configuration

1. **Create Spaces Bucket**
   - [ ] Log into DigitalOcean Console
   - [ ] Navigate to Spaces → Create a Space
   - [ ] Choose region (e.g., NYC3, SFO3, AMS3)
   - [ ] Name bucket: `fusonems-quantum-storage` (or your choice)
   - [ ] Set File Listing to **Restricted** (Private)
   - [ ] Note the endpoint URL (e.g., `https://nyc3.digitaloceanspaces.com`)

2. **Generate Access Keys**
   - [ ] Navigate to API → Spaces Keys
   - [ ] Click "Generate New Key"
   - [ ] Name: "FusonEMS Quantum Storage"
   - [ ] Save Access Key ID and Secret Access Key securely
   - [ ] ⚠️ Store in password manager - secret shown only once

3. **Configure CORS Policy**
   - [ ] In Spaces bucket settings, navigate to CORS
   - [ ] Add rule:
     ```json
     {
       "CORSRules": [
         {
           "AllowedOrigins": ["https://your-production-domain.com", "http://localhost:5173"],
           "AllowedMethods": ["GET", "HEAD"],
           "AllowedHeaders": ["*"],
           "MaxAgeSeconds": 3000
         }
       ]
     }
     ```
   - [ ] Save CORS configuration

4. **Verify Bucket Settings**
   - [ ] Bucket ACL set to **Private**
   - [ ] HTTPS-only access enabled
   - [ ] CDN optional (can enable later for performance)

---

### ☐ Backend Configuration

1. **Update Environment Variables**
   - [ ] Copy `.env.example` to `.env` (if not already done)
   - [ ] Add Spaces credentials to `/backend/.env`:
     ```bash
     SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
     SPACES_REGION=nyc3
     SPACES_BUCKET=fusonems-quantum-storage
     SPACES_ACCESS_KEY=your-access-key-here
     SPACES_SECRET_KEY=your-secret-key-here
     SPACES_CDN_ENDPOINT=  # Optional, leave empty for now
     ```
   - [ ] Verify no trailing slashes in endpoint URLs
   - [ ] Ensure credentials are enclosed properly (no quotes needed in .env)

2. **Install Dependencies**
   ```bash
   cd /root/fusonems-quantum-v2/backend
   pip install boto3
   # Or install all requirements
   pip install -r requirements.txt
   ```
   - [ ] Verify `boto3` installed: `pip show boto3`

3. **Run Database Migration**
   ```bash
   cd /root/fusonems-quantum-v2/backend
   alembic upgrade head
   ```
   - [ ] Verify migration applied successfully
   - [ ] Check tables created:
     ```sql
     \d storage_audit_logs
     \d file_records
     ```

---

### ☐ Test Storage Service

1. **Health Check Script**
   ```bash
   cd /root/fusonems-quantum-v2/backend
   python3 << 'EOF'
   from services.storage import get_storage_service, UploadContext
   
   print("Initializing Storage Service...")
   storage = get_storage_service()
   print(f"✅ Client initialized")
   print(f"   Bucket: {storage.bucket_name}")
   print(f"   Endpoint: {storage.endpoint}")
   print(f"   Region: {storage.region}")
   
   print("\nTesting upload...")
   test_data = b"Storage service health check test"
   context = UploadContext(
       org_id="system",
       system="accounting",
       object_type="export",
       object_id="health-check-test"
   )
   
   try:
       metadata = storage.upload_file(test_data, "health-check.txt", context, add_timestamp=False)
       print(f"✅ Upload successful: {metadata.file_path}")
       
       print("\nTesting signed URL generation...")
       url = storage.generate_signed_url(metadata.file_path, 60)
       print(f"✅ Signed URL generated (expires in 60s)")
       
       print("\nTesting file existence...")
       exists = storage.file_exists(metadata.file_path)
       print(f"✅ File exists: {exists}")
       
       print("\nTesting deletion...")
       storage.delete_file(metadata.file_path)
       print(f"✅ File deleted")
       
       print("\n🎉 All tests passed! Storage service is healthy.")
   except Exception as e:
       print(f"❌ Test failed: {e}")
       import traceback
       traceback.print_exc()
   EOF
   ```
   - [ ] All tests pass
   - [ ] No errors in output

2. **Verify in DigitalOcean Console**
   - [ ] Log into DigitalOcean Spaces console
   - [ ] Navigate to your bucket
   - [ ] Confirm test file was created and deleted (check Spaces browser)

---

### ☐ Test API Endpoints

1. **Start Backend Server**
   ```bash
   cd /root/fusonems-quantum-v2/backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - [ ] Server starts without errors
   - [ ] Storage router registered (check logs for `/api/storage`)

2. **Test Upload Endpoint** (requires authentication)
   ```bash
   # First, get auth token
   TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass"}' \
     | jq -r '.access_token')
   
   # Upload test file
   echo "Test receipt" > test_receipt.txt
   
   curl -X POST http://localhost:8000/api/storage/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@test_receipt.txt" \
     -F "org_id=org-test-123" \
     -F "system=accounting" \
     -F "object_type=receipt" \
     -F "object_id=receipt-test-456" \
     | jq .
   ```
   - [ ] Returns 200 OK
   - [ ] Response includes `file_path` and `metadata`

3. **Test Signed URL Endpoint**
   ```bash
   # Use file_path from upload response
   FILE_PATH="org-test-123/accounting/receipt/receipt-test-456/..."
   
   curl -X POST http://localhost:8000/api/storage/signed-url \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"file_path\":\"$FILE_PATH\",\"expires_in\":600}" \
     | jq .
   ```
   - [ ] Returns 200 OK
   - [ ] Response includes valid `url` and `expires_at`

4. **Test Audit Logs Endpoint**
   ```bash
   curl -X GET "http://localhost:8000/api/storage/audit-logs?limit=10" \
     -H "Authorization: Bearer $TOKEN" \
     | jq .
   ```
   - [ ] Returns 200 OK
   - [ ] Shows recent UPLOAD and SIGNED_URL_GENERATED events

---

### ☐ Verify Database Records

```sql
-- Check file records
SELECT * FROM file_records ORDER BY created_at DESC LIMIT 5;

-- Check audit logs
SELECT 
    timestamp,
    action_type,
    file_path,
    user_id,
    success
FROM storage_audit_logs
ORDER BY timestamp DESC
LIMIT 10;

-- Verify audit logging is working
SELECT COUNT(*) as total_logs FROM storage_audit_logs;
```

- [ ] Test file record exists in `file_records`
- [ ] Audit logs show UPLOAD and SIGNED_URL_GENERATED
- [ ] All logs show `success = 'true'`

---

### ☐ Security Verification

1. **Bucket Privacy**
   - [ ] Attempt to access file via direct Spaces URL (should fail with 403)
   - [ ] Test signed URL access (should succeed within expiration time)
   - [ ] Test expired signed URL (should fail with 403 after expiration)

2. **API Authentication**
   ```bash
   # Test upload without auth token (should fail with 401)
   curl -X POST http://localhost:8000/api/storage/upload \
     -F "file=@test_receipt.txt" \
     -F "org_id=org-test-123" \
     -F "system=accounting" \
     -F "object_type=receipt" \
     -F "object_id=receipt-test-456"
   ```
   - [ ] Returns 401 Unauthorized

3. **Input Validation**
   ```bash
   # Test invalid system (should fail with 400)
   curl -X POST http://localhost:8000/api/storage/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@test_receipt.txt" \
     -F "org_id=org-test-123" \
     -F "system=invalid-system" \
     -F "object_type=receipt" \
     -F "object_id=receipt-test-456"
   ```
   - [ ] Returns 400 Bad Request with validation error

---

### ☐ Monitoring & Alerting (Optional, Recommended)

1. **Configure Monitoring**
   - [ ] Add storage metrics to Prometheus (if applicable)
   - [ ] Set up alerts for:
     - Audit log write failures (CRITICAL)
     - High Spaces API error rate
     - Storage quota approaching limit

2. **Founder Dashboard Integration**
   - [ ] Add storage health status widget
   - [ ] Display recent uploads and storage usage
   - [ ] Show failed operations count

---

### ☐ Scheduled Jobs (Optional, Recommended)

1. **Soft-Delete Cleanup Job**
   - [ ] Create cleanup script (see Operational Runbook)
   - [ ] Schedule monthly cron job:
     ```bash
     # Run on 1st of month at 2 AM
     0 2 1 * * /usr/bin/python3 /path/to/cleanup_deleted_files.py >> /var/log/storage-cleanup.log 2>&1
     ```

---

### ☐ Documentation Review

- [ ] Read [Developer Guide](/docs/storage/DEVELOPER_GUIDE.md)
- [ ] Review [Operational Runbook](/docs/storage/OPERATIONAL_RUNBOOK.md)
- [ ] Bookmark [Quick Reference](/docs/storage/QUICK_REFERENCE.md)

---

## Post-Deployment

### ☐ Module Integration

Integrate storage service into existing modules:

1. **Workspace Module**
   - [ ] Update document upload to use `/api/storage/upload`
   - [ ] Update document viewing to use `/api/storage/signed-url`

2. **Accounting Module**
   - [ ] Update receipt upload to use `/api/storage/receipt-upload`
   - [ ] Update invoice PDF storage

3. **Communications Module**
   - [ ] Update email attachment storage

4. **App Builder Module**
   - [ ] Update app ZIP upload to use `/api/storage/app-zip-upload`

5. **PWA**
   - [ ] Implement offline receipt capture with sync

---

## Rollback Plan

If issues arise:

1. **Disable Storage Routes** (emergency only)
   ```python
   # In main.py, comment out:
   # app.include_router(storage_router)
   ```
   - [ ] Restart backend

2. **Revert Database Migration**
   ```bash
   alembic downgrade -1
   ```

3. **Remove Spaces Configuration**
   - [ ] Clear `SPACES_*` environment variables
   - [ ] Restart backend (will fall back to local storage if configured)

---

## Success Criteria

✅ **Setup Complete When**:
- [ ] DigitalOcean Spaces bucket created and configured
- [ ] Backend environment variables set
- [ ] Database migration applied successfully
- [ ] Health check script passes all tests
- [ ] API endpoints return valid responses
- [ ] Audit logs being written to database
- [ ] File uploads and signed URLs working
- [ ] Security tests pass (auth, validation)

---

## Troubleshooting

### Issue: "Storage service not properly configured"

**Solution**:
- Verify all `SPACES_*` environment variables are set
- Check for typos in `.env` file
- Ensure no trailing slashes in endpoint URLs

### Issue: "Failed to upload file to Spaces"

**Solution**:
- Test Spaces connectivity: `curl -I $SPACES_ENDPOINT`
- Verify access keys are correct
- Check bucket name matches configuration
- Review backend logs for detailed error

### Issue: Database migration fails

**Solution**:
- Verify database connection: `psql $DATABASE_URL -c "SELECT 1"`
- Check if `users` table exists (foreign key dependency)
- Review migration file for syntax errors

---

## Support

Need help?
1. Check [Troubleshooting Guide](/docs/storage/DEVELOPER_GUIDE.md#troubleshooting)
2. Review [Operational Runbook](/docs/storage/OPERATIONAL_RUNBOOK.md)
3. Contact Platform Engineering team

---

**Last Updated**: 2026-01-26  
**Version**: 1.0
