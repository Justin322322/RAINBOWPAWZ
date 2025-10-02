# Application Status Migration

## Overview
This migration adds the `reviewing` status to the `application_status` enum in the `service_providers` table, allowing applications to be marked as "Under Review" in the admin interface.

## Running the Migration

### Via API Route (Recommended)
```bash
# Using curl
curl -X POST "http://localhost:3000/api/admin/migrate-application-status" \
  -H "Authorization: Bearer admin-migration-token" \
  -H "Content-Type: application/json"

# Using PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/migrate-application-status" `
  -Method POST `
  -Headers @{"Authorization"="Bearer admin-migration-token"; "Content-Type"="application/json"}
```

### Expected Response
```json
{
  "success": true,
  "message": "Application status enum migration completed successfully - added \"reviewing\" status",
  "previousEnum": "enum('pending','declined','approved','restricted')",
  "updatedEnum": "enum('pending','reviewing','approved','declined','restricted','documents_required')"
}
```

## What This Migration Does

1. **Adds `reviewing` status** to the `application_status` enum
2. **Maintains existing statuses**: `pending`, `approved`, `declined`, `restricted`
3. **Includes `documents_required`** status (used when applications need additional documents)

## Updated Status Flow

```
pending → reviewing → approved/declined
pending → documents_required → reviewing → approved/declined
```

## UI Changes

The admin applications interface now supports:
- **Filter by "Under Review"** status
- **Display "Under Review"** badge with blue styling
- **Display "Documents Required"** badge with orange styling

## Status Meanings

- **Pending**: Initial application state
- **Under Review**: Admin is actively reviewing the application
- **Documents Required**: Application needs additional documents from applicant
- **Approved**: Application accepted
- **Declined**: Application rejected
- **Restricted**: Business account restricted

## Authentication

The migration route requires the `ADMIN_MIGRATION_TOKEN` environment variable or defaults to `admin-migration-token`.