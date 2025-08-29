# Database Migrations

This directory contains database migration scripts for the Rainbow Paws project.

## Email Normalization Migration (001_add_case_insensitive_email_index.sql)

**Purpose**: Ensures email uniqueness is case-insensitive to prevent duplicates like `user@example.com` and `USER@EXAMPLE.COM`.

### What This Migration Does

1. **Drops existing case-sensitive email unique constraint**
2. **Creates case-insensitive unique index** using `LOWER(email)`
3. **Adds normalized email index** for efficient lookups
4. **Updates composite index** to use normalized email
5. **Checks for existing duplicates** before applying changes

### Before Running Migration

The migration will check for existing email duplicates and fail if any are found. If duplicates exist, you must resolve them first:

```sql
-- Check for duplicates
SELECT
    LOWER(email) as normalized_email,
    COUNT(*) as count,
    GROUP_CONCAT(email SEPARATOR ', ') as original_emails
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;
```

**Resolution Options:**
1. **Update one email to a different address:**
   ```sql
   UPDATE users SET email = 'newemail@example.com' WHERE user_id = 123;
   ```

2. **Delete duplicate accounts** (keep only one)

3. **Merge duplicate accounts** (transfer data to one account, delete others)

### How to Run the Migration

#### Option 1: Using the Migration Runner (Recommended)
```bash
# Make sure you're in the project root directory
cd /path/to/rainbow-paws

# Run the migration script
node migrations/run-migration.js
```

#### Option 2: Manual SQL Execution
1. Connect to your MySQL database
2. Execute the SQL statements in `001_add_case_insensitive_email_index.sql` in order
3. Verify no duplicates exist before proceeding

#### Option 3: Through Database Admin Tools
- Copy the contents of `001_add_case_insensitive_email_index.sql`
- Paste and execute in your database administration tool (phpMyAdmin, MySQL Workbench, etc.)

### Application Code Changes

The following application files have been updated to work with the new case-insensitive email handling:

1. **Login Route** (`src/app/api/auth/login/route.ts`)
   - Updated to use `LOWER(email)` in queries
   - Leverages the new case-insensitive index

2. **Registration Route** (`src/app/api/auth/register/route.ts`)
   - Updated duplicate check to use `LOWER(email)`
   - Prevents case-variant duplicates during signup

### Testing the Changes

After applying the migration and deploying the code changes:

1. **Test Login with Different Cases:**
   ```bash
   # These should all work with the same account:
   curl -X POST /api/auth/login -d '{"email":"user@example.com","password":"..."}'
   curl -X POST /api/auth/login -d '{"email":"USER@EXAMPLE.COM","password":"..."}'
   curl -X POST /api/auth/login -d '{"email":"User@Example.Com","password":"..."}'
   ```

2. **Test Duplicate Prevention:**
   ```bash
   # This should fail if user@example.com already exists:
   curl -X POST /api/auth/register -d '{"email":"USER@EXAMPLE.COM",...}'
   ```

3. **Verify Index Usage:**
   ```sql
   EXPLAIN SELECT * FROM users WHERE LOWER(email) = LOWER('user@example.com');
   -- Should show "Using index" in the Extra column
   ```

### Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop the new case-insensitive index
DROP INDEX idx_users_email_case_insensitive ON users;

-- Recreate the original case-sensitive unique constraint
ALTER TABLE users ADD CONSTRAINT email UNIQUE (email);

-- The original indexes should still exist
-- idx_users_email and idx_users_auth_composite
```

### Performance Impact

**Positive:**
- Faster email lookups due to proper indexing
- Prevents table scans on email queries
- Consistent email handling across the application

**Neutral:**
- Slight storage overhead for additional indexes
- Minimal query performance impact (uses same execution plan)

### Security Benefits

1. **Prevents Email Enumeration:** Case-insensitive uniqueness prevents attackers from determining which email variants exist
2. **Consistent User Experience:** Users can login with any email case variant
3. **Data Integrity:** Ensures true email uniqueness in the database
4. **Performance:** Proper indexing prevents potential DoS through expensive table scans

---

## Migration History

- **001_add_case_insensitive_email_index.sql** - Case-insensitive email uniqueness and indexing
