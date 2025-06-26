-- Fix package_addons table structure by adding missing id column
-- This migration ensures the package_addons table has the required id column

-- Check if package_addons table exists and add id column if missing
SET @table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
  AND table_name = 'package_addons'
);

-- Only proceed if table exists
SET @sql = IF(@table_exists > 0, 
  'SELECT 1', 
  'SELECT 0 as skip_migration'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if id column exists
SET @id_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'package_addons'
  AND column_name = 'id'
);

-- Add id column if it doesn't exist
SET @sql = IF(@id_column_exists = 0 AND @table_exists > 0,
  'ALTER TABLE package_addons ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
  'SELECT "ID column already exists or table does not exist" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure the table has proper structure if it exists
CREATE TABLE IF NOT EXISTS package_addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  addon_id INT,
  package_id INT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_package_id (package_id),
  INDEX idx_addon_id (addon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
