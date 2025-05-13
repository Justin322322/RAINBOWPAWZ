# Database Migrations

This directory contains SQL migrations for database schema changes.

## How to Apply Migrations

### Using MySQL CLI

1. Connect to your MySQL database:

```bash
mysql -u username -p
```

2. Select the Rainbow Paws database:

```sql
USE rainbow_paws;
```

3. Apply the migration scripts in sequence:

```sql
SOURCE /path/to/cremation_document_fields.sql;
```

### Using phpMyAdmin

1. Access your phpMyAdmin interface
2. Select the Rainbow Paws database
3. Go to the "SQL" tab
4. Copy the content of the migration file
5. Paste it into the SQL query box
6. Click "Go" to execute the query

## Migration Files

- `cremation_document_fields.sql`: Adds document file path fields to the businesses table for cremation center registration
- `refactor_verification.sql`: Refactors the verification system for a more sensible user verification flow

## Verification System Refactoring

The `refactor_verification.sql` script makes the following changes:

1. Standardizes the `verification_status` column in the `business_profiles` table to use an ENUM with values:
   - `pending` (default)
   - `verified`
   - `restricted`

2. Removes redundant columns:
   - Removes `status` column (using `verification_status` instead)
   - Removes `is_verified` column (using `verification_status` instead)

3. Adds or standardizes related columns:
   - `verification_date` - Timestamp when verification occurred
   - `verification_notes` - Text field for admin notes about verification
   - `business_permit_path` - Path to uploaded business permit document

4. Updates the `users` table:
   - Ensures `is_verified` column exists as a boolean

5. Creates a view for easier querying:
   - `verified_businesses` - Shows only verified businesses

6. Adds indexes for better performance:
   - Index on `business_profiles.verification_status`
   - Index on `users.is_verified`

### Running the Refactoring Script

You can run the refactoring script using the provided Node.js script:

```bash
npm run refactor-db
```

This will apply all the changes in the `refactor_verification.sql` file.