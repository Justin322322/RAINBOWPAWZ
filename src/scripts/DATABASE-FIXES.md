# Database Fixes for Rainbow Paws

This document explains the database fixes implemented to resolve issues with service provider status fields and service counts.

## Issues Fixed

1. **Status Field Consolidation**
   - Previously, the `service_providers` table had redundant status fields (`verification_status`, `application_status`, and `status`).
   - These fields could get out of sync, causing inconsistent status displays.
   - Fixed by consolidating to use `application_status` as the primary status field.

2. **Service Count Accuracy**
   - The admin dashboard was not showing accurate service counts for cremation centers.
   - Fixed by:
     - Adding an `is_active` field to the `service_packages` table
     - Adding an `active_service_count` field to the `service_providers` table
     - Implementing dynamic counting of active services per provider

3. **Status Display Inconsistencies**
   - The UI was showing inconsistent status badges on the admin/users/cremation page.
   - Fixed by updating the `getStatusBadge` function to properly check both `application_status` and `verification_status`.

4. **Restrict/Unrestrict Functionality**
   - The error "Failed to update business status" occurred when unrestricting a business.
   - Fixed by updating the restrict/unrestrict endpoint to update both status fields.

## Scripts Included

### 1. `migrate-status-fields.js`
Consolidates status fields in the `service_providers` table:
- Adds `application_status` if missing
- Migrates values from `verification_status` to `application_status`
- Removes the redundant `status` field

### 2. `fix-database-schema.sql`
SQL script to fix overall database schema issues:
- Adds `application_status` if it doesn't exist
- Updates status values across fields for consistency
- Creates stats view for dashboard using `application_status`

### 3. `optimize-service-packages.sql`
Ensures the `service_packages` table has the correct structure:
- Adds `is_active` column to track active services
- Ensures service provider relationship is properly defined
- Creates indexes for better performance

### 4. `run-database-fixes.js`
Master script that runs all the database fixes:
- Runs all the SQL scripts in the correct order
- Performs status field migration
- Updates service counts for all providers

## How to Apply Fixes

1. Make sure your database is backed up
2. Run the master fix script:
   ```bash
   node src/scripts/run-database-fixes.js
   ```

## Schema Changes

### `service_providers` table:
- Added `application_status` ENUM field (primary status field)
- Made `verification_status` field deprecated (kept for backward compatibility)
- Removed redundant `status` field
- Added `active_service_count` INT field to cache service counts

### `service_packages` table:
- Ensured `is_active` field exists (TINYINT)
- Ensured provider relationship field exists (`service_provider_id`)
- Created index for provider ID field

## UI Changes

1. Updated status badge display logic to prioritize:
   - First: Check for 'restricted' status
   - Second: Check for 'approved'/'verified' status
   - Third: Check for 'pending' status

2. Modified service count display to fetch accurate counts from service_packages table

3. Fixed unrestriction functionality to properly update all status fields

## API Endpoint Updates

1. Updated `/api/admin/cremation-businesses/restrict` to handle application_status
2. Added `/api/admin/services` endpoint to fetch services for a provider
3. Updated `/api/admin/dashboard-stats` to count active services

## Future Recommendations

1. Only use `application_status` for new code - don't rely on `verification_status`
2. When building new features, use the `active_service_count` field for better performance
3. Consider eventually dropping the `verification_status` field when all code has been updated 