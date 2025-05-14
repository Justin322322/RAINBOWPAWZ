-- Fix database schema for Rainbow Paws application
-- This script corrects issues with the service_providers table

-- Check if service_providers table exists
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'service_providers');

-- Only run if service_providers table exists
SET @sql = IF(@table_exists > 0, 
    'SELECT "service_providers table exists" AS message',
    'SELECT "service_providers table does not exist" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if application_status column exists
SET @application_status_exists = (SELECT COUNT(*) FROM information_schema.columns 
                                 WHERE table_schema = DATABASE() 
                                 AND table_name = 'service_providers' 
                                 AND column_name = 'application_status');

-- Add application_status column if it doesn't exist
SET @add_column_sql = IF(@table_exists > 0 AND @application_status_exists = 0,
    'ALTER TABLE service_providers
     ADD COLUMN application_status 
     ENUM("pending", "reviewing", "documents_required", "approved", "declined", "verified", "rejected", "restricted") 
     NOT NULL DEFAULT "pending"',
    'SELECT "application_status column already exists or table does not exist" AS message');

PREPARE stmt FROM @add_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if verification_status column exists
SET @verification_status_exists = (SELECT COUNT(*) FROM information_schema.columns 
                                  WHERE table_schema = DATABASE() 
                                  AND table_name = 'service_providers' 
                                  AND column_name = 'verification_status');

-- Check if status column exists
SET @status_exists = (SELECT COUNT(*) FROM information_schema.columns 
                     WHERE table_schema = DATABASE() 
                     AND table_name = 'service_providers' 
                     AND column_name = 'status');

-- Migrate values from verification_status to application_status if both exist
SET @migrate_values_sql = IF(@table_exists > 0 AND @application_status_exists > 0 AND @verification_status_exists > 0,
    'UPDATE service_providers SET 
     application_status = CASE 
         WHEN verification_status = "verified" THEN "verified"
         WHEN verification_status = "rejected" THEN "declined"
         WHEN verification_status = "restricted" THEN "restricted"
         WHEN verification_status = "declined" THEN "declined"
         WHEN verification_status = "documents_required" THEN "documents_required"
         ELSE application_status 
     END
     WHERE application_status = "pending" AND verification_status IS NOT NULL',
    'SELECT "Migration not needed or tables not available" AS message');

PREPARE stmt FROM @migrate_values_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove status column if it exists (it's redundant)
SET @remove_status_sql = IF(@table_exists > 0 AND @status_exists > 0,
    'ALTER TABLE service_providers DROP COLUMN status',
    'SELECT "Status column does not exist or table does not exist" AS message');

PREPARE stmt FROM @remove_status_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Mark verification_status as deprecated with a comment
SET @mark_deprecated_sql = IF(@table_exists > 0 AND @verification_status_exists > 0,
    'ALTER TABLE service_providers 
     MODIFY COLUMN verification_status 
     ENUM("pending", "verified", "rejected", "restricted", "declined", "documents_required")
     DEFAULT "pending"
     COMMENT "DEPRECATED: Use application_status instead"',
    'SELECT "Verification status column does not exist or table does not exist" AS message');

PREPARE stmt FROM @mark_deprecated_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if active_service_count column exists
SET @active_service_count_exists = (SELECT COUNT(*) FROM information_schema.columns 
                                   WHERE table_schema = DATABASE() 
                                   AND table_name = 'service_providers' 
                                   AND column_name = 'active_service_count');

-- Add active_service_count column if it doesn't exist
SET @add_active_service_count_sql = IF(@table_exists > 0 AND @active_service_count_exists = 0,
    'ALTER TABLE service_providers
     ADD COLUMN active_service_count INT DEFAULT 0',
    'SELECT "active_service_count column already exists or table does not exist" AS message');

PREPARE stmt FROM @add_active_service_count_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create a view for business stats based on application_status
SET @create_view_sql = IF(@table_exists > 0 AND @application_status_exists > 0,
    'CREATE OR REPLACE VIEW business_application_stats AS
     SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN application_status = "approved" OR application_status = "verified" THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN application_status = "pending" THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN application_status = "reviewing" THEN 1 ELSE 0 END) AS reviewing,
        SUM(CASE WHEN application_status = "declined" OR application_status = "rejected" THEN 1 ELSE 0 END) AS declined,
        SUM(CASE WHEN application_status = "documents_required" THEN 1 ELSE 0 END) AS documents_required,
        SUM(CASE WHEN application_status = "restricted" THEN 1 ELSE 0 END) AS restricted
     FROM service_providers',
    'SELECT "Cannot create view - table or columns do not exist" AS message');

PREPARE stmt FROM @create_view_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update any services to have status counts for admin dashboard
-- Ensure service_packages are properly linked to their providers

-- Check if we need to update service package active status
SET @service_packages_exist = (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'service_packages');

-- Add is_active if it doesn't exist
SET @is_active_exists = (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'service_packages'
    AND column_name = 'is_active');

SET @sql = IF(@service_packages_exist > 0 AND @is_active_exists = 0,
    'ALTER TABLE service_packages ADD COLUMN is_active TINYINT(1) DEFAULT 1',
    'SELECT "Service packages table or is_active column already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update table stats view for dashboard if it exists
SET @view_exists = (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'business_application_stats'
    AND table_type = 'VIEW');

SET @sql = IF(@view_exists > 0,
    'DROP VIEW business_application_stats',
    'SELECT "business_application_stats view does not exist" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create/update business_application_stats view using application_status
CREATE OR REPLACE VIEW business_application_stats AS
SELECT 
    COUNT(*) AS total,
    SUM(CASE WHEN application_status = 'approved' OR application_status = 'verified' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN application_status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
    SUM(CASE WHEN application_status = 'declined' OR application_status = 'rejected' THEN 1 ELSE 0 END) AS declined,
    SUM(CASE WHEN application_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required,
    SUM(CASE WHEN application_status = 'restricted' THEN 1 ELSE 0 END) AS restricted
FROM service_providers; 