-- Migration: Add case-insensitive email unique index
-- Date: 2024-12-19
-- Description: Ensures email uniqueness is case-insensitive to prevent duplicates like user@example.com and USER@EXAMPLE.COM

-- Step 1: First, we need to check if there are any existing case-variant email duplicates
-- This query will identify any potential conflicts before applying the constraint
SELECT
    LOWER(email) as normalized_email,
    COUNT(*) as count,
    GROUP_CONCAT(email SEPARATOR ', ') as original_emails
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- If the above query returns any rows, you need to resolve the duplicates manually before proceeding
-- You can either:
-- 1. Update one of the duplicate emails to a different address
-- 2. Delete duplicate accounts (keeping only one)
-- 3. Merge the duplicate accounts

-- Step 2: Drop the existing case-sensitive unique constraint on email
-- (This will be replaced with a functional index using LOWER(email))
ALTER TABLE users DROP INDEX email;

-- Step 3: Create a new unique index that uses LOWER(email) for case-insensitive uniqueness
-- This ensures that emails like "user@example.com" and "USER@EXAMPLE.COM" are treated as duplicates
CREATE UNIQUE INDEX idx_users_email_case_insensitive ON users ((LOWER(email)));

-- Step 4: Create or replace an index for efficient email lookups using LOWER(email)
-- This will be used by queries that search by email (login, registration checks, etc.)
CREATE INDEX idx_users_email_normalized ON users ((LOWER(email)));

-- Step 5: Update existing composite index to use normalized email for better performance
-- Drop the existing composite index first
DROP INDEX idx_users_auth_composite ON users;

-- Recreate the composite index with normalized email
CREATE INDEX idx_users_auth_composite ON users ((LOWER(email)), status, is_verified);

-- Verification: Test the new index works correctly
-- This should return no rows (no duplicates)
SELECT
    LOWER(email) as normalized_email,
    COUNT(*) as count
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;
