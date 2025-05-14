# Database Schema Refactoring

This document explains the changes made to the database schema to fix status inconsistencies and improve application performance.

## Problem

The database had several inconsistencies and design flaws:

1. **Multiple status fields**: The `service_providers` table had both `status` and `verification_status` fields that served similar purposes but often contained conflicting values.

2. **Status inconsistencies**: When declining an application, the status wasn't updated correctly, resulting in applications showing as "pending" even after they were declined.

3. **Confusing naming conventions**: The meaning of each status field wasn't clear, making it hard to know which field to use for different purposes.

4. **No separation between application status and account status**: There was no clear distinction between the status of an application and the status of the user account.

## Solution

We've refactored the database schema to address these issues:

### 1. Service Providers Table

The `service_providers` table now has been streamlined with a consolidated status approach:

- **application_status**: The primary status field that tracks the application status (pending, reviewing, documents_required, approved, declined, verified, rejected, restricted)
  
- **verification_status**: DEPRECATED - Kept for backward compatibility but marked as deprecated in the schema
  
- **status**: Account status for controlling access (active, inactive, suspended, restricted)

### 2. Users Table

The `users` table has been standardized with consistent status values:

- **role**: User role (fur_parent, business, admin)
  
- **status**: Account status (active, inactive, suspended, restricted)

### 3. New Statistics View

A new database view `business_application_stats` was created to provide consistent statistics based on the new schema:

```sql
CREATE VIEW business_application_stats AS
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN application_status = 'approved' OR application_status = 'verified' THEN 1 ELSE 0 END) AS approved,
  SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN application_status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
  SUM(CASE WHEN application_status = 'declined' OR application_status = 'rejected' THEN 1 ELSE 0 END) AS declined,
  SUM(CASE WHEN application_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required,
  SUM(CASE WHEN application_status = 'restricted' THEN 1 ELSE 0 END) AS restricted
FROM
  service_providers
```

## API Updates

The following API endpoints have been updated to work with the new schema:

1. **Business Application Status API**: Uses the consolidated `application_status` field for more accurate status reporting

2. **Dashboard Statistics API**: Now properly tracks active and restricted users based on the new schema

3. **Decline Application API**: Updates only `application_status` when declining an application (with backward compatibility for `verification_status`)

## Status Field Consolidation

In the latest update, we've made the following changes:

1. **Consolidated status fields**: We've merged `verification_status` and `application_status` functionality into a single `application_status` field to reduce confusion and ensure consistent status tracking.

2. **Deprecated verification_status**: The `verification_status` field is kept for backward compatibility but is now considered deprecated.

3. **Enhanced application_status enum**: The `application_status` field now includes all possible status values from both fields.

4. **Status transition consistency**: All status updates now prioritize updating `application_status` first, with `verification_status` updated as a fallback for backward compatibility.

## Backwards Compatibility

All changes maintain backwards compatibility with the old schema. The APIs check if the `application_status` column exists, and if not, fall back to using `verification_status`.

## Migration Scripts

The following scripts were created to implement these changes:

1. **src/scripts/refactor-verification.js**: Initial refactoring to add `application_status` field

2. **src/scripts/refactor-db-schema.js**: Comprehensive database schema refactoring

3. **src/scripts/consolidate-status-fields.js**: Consolidation of status fields into a single primary status field

## Testing

To verify the changes are working correctly:

1. Create a new application (it should show as "pending")
2. Review the application (it should show as "reviewing")
3. Decline the application (it should show as "declined")
4. Approve an application (it should show as "approved")
5. Check the dashboard statistics to ensure they reflect the correct numbers

## Scripts

The refactoring process is implemented in two scripts:

- `src/scripts/refactor-verification.js` - Initial refactoring of the service_providers table
- `src/scripts/refactor-db-schema.js` - Comprehensive database schema refactoring 