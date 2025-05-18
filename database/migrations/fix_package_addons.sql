-- Fix package_addons table structure
-- This script ensures the package_addons table has the correct structure
-- and adds auto_increment to the id column if it's missing

-- Check if the package_addons table exists
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
                     WHERE table_schema = DATABASE() 
                     AND table_name = 'package_addons');

-- If the table doesn't exist, create it
SET @create_table = CONCAT('
CREATE TABLE IF NOT EXISTS `package_addons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `package_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `package_addons_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT="Stores optional add-ons available for service packages"
');

-- Execute the create table statement if needed
SET @exec_create = IF(@table_exists = 0, @create_table, 'SELECT "Table already exists"');
PREPARE stmt FROM @exec_create;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- If the table exists, check if the id column has AUTO_INCREMENT
SET @has_auto_increment = (SELECT COUNT(*) FROM information_schema.columns 
                          WHERE table_schema = DATABASE() 
                          AND table_name = 'package_addons' 
                          AND column_name = 'id' 
                          AND extra LIKE '%auto_increment%');

-- If id column doesn't have AUTO_INCREMENT, modify the table
SET @modify_id = 'ALTER TABLE `package_addons` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT';

-- Execute the modify statement if needed
SET @exec_modify = IF(@table_exists = 1 AND @has_auto_increment = 0, @modify_id, 'SELECT "ID column already has AUTO_INCREMENT or table does not exist"');
PREPARE stmt FROM @exec_modify;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if the package_id column has a foreign key constraint
SET @has_fk = (SELECT COUNT(*) FROM information_schema.key_column_usage 
              WHERE table_schema = DATABASE() 
              AND table_name = 'package_addons' 
              AND column_name = 'package_id' 
              AND referenced_table_name = 'service_packages');

-- If package_id doesn't have a foreign key, add it
SET @add_fk = 'ALTER TABLE `package_addons` 
              ADD CONSTRAINT `package_addons_ibfk_1` 
              FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE';

-- Execute the add foreign key statement if needed
SET @exec_fk = IF(@table_exists = 1 AND @has_fk = 0, @add_fk, 'SELECT "Foreign key already exists or table does not exist"');
PREPARE stmt FROM @exec_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if the package_id column has an index
SET @has_index = (SELECT COUNT(*) FROM information_schema.statistics 
                 WHERE table_schema = DATABASE() 
                 AND table_name = 'package_addons' 
                 AND column_name = 'package_id');

-- If package_id doesn't have an index, add it
SET @add_index = 'ALTER TABLE `package_addons` ADD INDEX `idx_package_addons_package` (`package_id`)';

-- Execute the add index statement if needed
SET @exec_index = IF(@table_exists = 1 AND @has_index = 0, @add_index, 'SELECT "Index already exists or table does not exist"');
PREPARE stmt FROM @exec_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Output the current structure of the package_addons table
SELECT 'Current package_addons table structure:' as message;
SHOW CREATE TABLE `package_addons`;
