-- Refactor verification system for RainbowPaws
-- This script updates the business_profiles table to have a more sensible verification system

-- First, check if the verification_status column exists
SET @column_exists = 0;
SELECT COUNT(*) INTO @column_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'rainbow_paws' 
AND TABLE_NAME = 'business_profiles' 
AND COLUMN_NAME = 'verification_status';

-- If verification_status column exists, ensure it has the correct type
SET @sql = IF(@column_exists > 0, 
    'ALTER TABLE business_profiles MODIFY COLUMN verification_status ENUM("pending", "verified", "restricted") NOT NULL DEFAULT "pending"',
    'ALTER TABLE business_profiles ADD COLUMN verification_status ENUM("pending", "verified", "restricted") NOT NULL DEFAULT "pending" AFTER service_description');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if the status column exists
SET @status_exists = 0;
SELECT COUNT(*) INTO @status_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'rainbow_paws' 
AND TABLE_NAME = 'business_profiles' 
AND COLUMN_NAME = 'status';

-- If status column exists, drop it (we'll use verification_status instead)
SET @sql = IF(@status_exists > 0, 
    'ALTER TABLE business_profiles DROP COLUMN status',
    'SELECT "Status column does not exist, no need to drop it" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if the is_verified column exists
SET @is_verified_exists = 0;
SELECT COUNT(*) INTO @is_verified_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'rainbow_paws' 
AND TABLE_NAME = 'business_profiles' 
AND COLUMN_NAME = 'is_verified';

-- If is_verified column exists, drop it (we'll use verification_status instead)
SET @sql = IF(@is_verified_exists > 0, 
    'ALTER TABLE business_profiles DROP COLUMN is_verified',
    'SELECT "is_verified column does not exist, no need to drop it" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure verification_date column exists
SET @verification_date_exists = 0;
SELECT COUNT(*) INTO @verification_date_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'rainbow_paws' 
AND TABLE_NAME = 'business_profiles' 
AND COLUMN_NAME = 'verification_date';

-- Add verification_date column if it doesn't exist
SET @sql = IF(@verification_date_exists = 0, 
    'ALTER TABLE business_profiles ADD COLUMN verification_date TIMESTAMP NULL AFTER verification_status',
    'SELECT "verification_date column already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure verification_notes column exists
SET @verification_notes_exists = 0;
SELECT COUNT(*) INTO @verification_notes_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'rainbow_paws' 
AND TABLE_NAME = 'business_profiles' 
AND COLUMN_NAME = 'verification_notes';

-- Add verification_notes column if it doesn't exist
SET @sql = IF(@verification_notes_exists = 0, 
    'ALTER TABLE business_profiles ADD COLUMN verification_notes TEXT NULL AFTER verification_date',
    'SELECT "verification_notes column already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure business_permit_path column exists
SET @permit_path_exists = 0;
SELECT COUNT(*) INTO @permit_path_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'rainbow_paws' 
AND TABLE_NAME = 'business_profiles' 
AND COLUMN_NAME = 'business_permit_path';

-- Add business_permit_path column if it doesn't exist
SET @sql = IF(@permit_path_exists = 0, 
    'ALTER TABLE business_profiles ADD COLUMN business_permit_path VARCHAR(255) NULL AFTER verification_notes',
    'SELECT "business_permit_path column already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update users table to ensure is_verified column exists
SET @user_verified_exists = 0;
SELECT COUNT(*) INTO @user_verified_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'rainbow_paws' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'is_verified';

-- Add is_verified column to users table if it doesn't exist
SET @sql = IF(@user_verified_exists = 0, 
    'ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0 AFTER user_type',
    'SELECT "is_verified column already exists in users table" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update any existing records to ensure consistency
UPDATE business_profiles 
SET verification_status = 'verified' 
WHERE verification_status = 'active';

-- Update users based on business_profiles verification status
UPDATE users u
JOIN business_profiles bp ON u.id = bp.user_id
SET u.is_verified = 1
WHERE bp.verification_status = 'verified';

-- Create a view for easier querying of verified businesses
CREATE OR REPLACE VIEW verified_businesses AS
SELECT 
    bp.id,
    bp.business_name,
    bp.business_type,
    bp.contact_first_name,
    bp.contact_last_name,
    bp.business_phone,
    bp.business_address,
    bp.province,
    bp.city,
    bp.business_hours,
    bp.service_description,
    bp.verification_status,
    bp.verification_date,
    u.email,
    u.is_verified
FROM 
    business_profiles bp
JOIN 
    users u ON bp.user_id = u.id
WHERE 
    bp.verification_status = 'verified'
    AND u.is_verified = 1;

-- Add an index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_profiles_verification 
ON business_profiles(verification_status);

-- Add an index for faster user verification queries
CREATE INDEX IF NOT EXISTS idx_users_verification 
ON users(is_verified);
