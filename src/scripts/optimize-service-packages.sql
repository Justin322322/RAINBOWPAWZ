-- Optimize the service_packages table to ensure it has the correct structure
-- for tracking active services and service provider relationships

-- Step 1: Check if the service_packages table exists
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
                     WHERE table_schema = DATABASE() 
                     AND table_name = 'service_packages');

-- Only proceed if the table exists
SET @create_table_sql = IF(@table_exists = 0, 
    'CREATE TABLE service_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        service_provider_id INT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )',
    'SELECT "service_packages table already exists" AS message');

PREPARE stmt FROM @create_table_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Check if is_active column exists in service_packages table
SET @is_active_exists = (SELECT COUNT(*) FROM information_schema.columns 
                         WHERE table_schema = DATABASE() 
                         AND table_name = 'service_packages' 
                         AND column_name = 'is_active');

-- Add is_active column if it doesn't exist
SET @add_is_active_sql = IF(@is_active_exists = 0 AND @table_exists = 1,
    'ALTER TABLE service_packages ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER price',
    'SELECT "is_active column already exists or table does not exist" AS message');

PREPARE stmt FROM @add_is_active_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Check if service_provider_id column exists (use the correct name based on your schema)
SET @provider_id_exists = (SELECT COUNT(*) FROM information_schema.columns 
                          WHERE table_schema = DATABASE() 
                          AND table_name = 'service_packages' 
                          AND (column_name = 'service_provider_id' OR column_name = 'provider_id'));

-- Check column names to identify the provider ID column
SET @provider_column_name = (
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'service_packages' 
    AND (column_name = 'service_provider_id' OR column_name = 'provider_id')
    LIMIT 1
);

-- If no provider ID column exists but the table does, add it
SET @add_provider_id_sql = IF(@provider_id_exists = 0 AND @table_exists = 1,
    'ALTER TABLE service_packages ADD COLUMN service_provider_id INT NOT NULL AFTER price',
    'SELECT "Provider ID column already exists or table does not exist" AS message');

PREPARE stmt FROM @add_provider_id_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Create an index on the provider ID column for better performance
SET @create_index_sql = IF(@provider_id_exists = 1 AND @table_exists = 1,
    CONCAT('CREATE INDEX idx_service_provider ON service_packages (', @provider_column_name, ')'),
    'SELECT "Cannot create index - column or table does not exist" AS message');

PREPARE stmt FROM @create_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Check if active_service_count column exists in service_providers table
SET @active_count_exists = (SELECT COUNT(*) FROM information_schema.columns 
                           WHERE table_schema = DATABASE() 
                           AND table_name = 'service_providers' 
                           AND column_name = 'active_service_count');

-- Step 6: Update service counts only if active_service_count column exists
SET @update_stats_sql = IF(@table_exists = 1 AND @active_count_exists = 1,
    CONCAT('UPDATE service_providers sp
     SET active_service_count = (
         SELECT COUNT(*) 
         FROM service_packages 
         WHERE ', @provider_column_name, ' = sp.id AND is_active = 1
     )'),
    'SELECT "Cannot update service counts - column does not exist" AS message');

PREPARE stmt FROM @update_stats_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Ensure the service_packages table has proper foreign key constraints
-- This is commented out as it requires careful implementation based on the exact schema
-- and checking for existing constraints
/*
SET @check_fk_sql = IF(@table_exists = 1 AND @provider_id_exists = 1,
    'SELECT COUNT(*) INTO @fk_exists 
     FROM information_schema.TABLE_CONSTRAINTS 
     WHERE CONSTRAINT_SCHEMA = DATABASE() 
     AND TABLE_NAME = "service_packages" 
     AND CONSTRAINT_TYPE = "FOREIGN KEY"
     AND CONSTRAINT_NAME LIKE "%provider%"',
    'SET @fk_exists = 0');

PREPARE stmt FROM @check_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key if it doesn't exist (commented out for safety)
-- This would need to be carefully tested in your environment
SET @add_fk_sql = IF(@fk_exists = 0 AND @table_exists = 1 AND @provider_id_exists = 1,
    CONCAT('ALTER TABLE service_packages 
     ADD CONSTRAINT fk_service_provider 
     FOREIGN KEY (', @provider_column_name, ') 
     REFERENCES service_providers(id) 
     ON DELETE CASCADE'),
    'SELECT "Foreign key already exists or tables not ready" AS message');

PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
*/ 