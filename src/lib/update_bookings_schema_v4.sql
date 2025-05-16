-- Comprehensive update for service_bookings table
-- This script ensures all required columns exist and have the correct data types

SET @dbname = DATABASE();
SET @tablename = "service_bookings";

-- Check if the table exists, if not create it
SET @tableExists = (SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = @dbname AND table_name = @tablename);

SET @createTableSQL = IF(@tableExists = 0,
  'CREATE TABLE service_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider_id INT NOT NULL,
    package_id INT NOT NULL,
    booking_date DATE,
    booking_time TIME,
    status ENUM("pending","confirmed","in_progress","completed","cancelled") DEFAULT "pending",
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )',
  'SELECT "Table service_bookings already exists" AS message'
);

PREPARE createTableStmt FROM @createTableSQL;
EXECUTE createTableStmt;
DEALLOCATE PREPARE createTableStmt;

-- Now ensure all required columns exist with correct data types

-- pet_id column
SET @columnname = "pet_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column pet_id already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN pet_id INT AFTER package_id"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- pet_name column
SET @columnname = "pet_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column pet_name already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN pet_name VARCHAR(255) AFTER pet_id"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- pet_type column
SET @columnname = "pet_type";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column pet_type already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN pet_type VARCHAR(50) AFTER pet_name"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- pet_image_url column
SET @columnname = "pet_image_url";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column pet_image_url already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN pet_image_url VARCHAR(255) AFTER pet_type"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- cause_of_death column
SET @columnname = "cause_of_death";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column cause_of_death already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN cause_of_death VARCHAR(255) AFTER pet_image_url"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- payment_method column
SET @columnname = "payment_method";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "ALTER TABLE service_bookings MODIFY COLUMN payment_method VARCHAR(50) DEFAULT 'cash'",
  "ALTER TABLE service_bookings ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash' AFTER cause_of_death"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- delivery_option column
SET @columnname = "delivery_option";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "ALTER TABLE service_bookings MODIFY COLUMN delivery_option VARCHAR(50) DEFAULT 'pickup'",
  "ALTER TABLE service_bookings ADD COLUMN delivery_option VARCHAR(50) DEFAULT 'pickup' AFTER payment_method"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- delivery_address column
SET @columnname = "delivery_address";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column delivery_address already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN delivery_address TEXT AFTER delivery_option"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- delivery_distance column
SET @columnname = "delivery_distance";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "ALTER TABLE service_bookings MODIFY COLUMN delivery_distance FLOAT DEFAULT 0",
  "ALTER TABLE service_bookings ADD COLUMN delivery_distance FLOAT DEFAULT 0 AFTER delivery_address"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- delivery_fee column
SET @columnname = "delivery_fee";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "ALTER TABLE service_bookings MODIFY COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0",
  "ALTER TABLE service_bookings ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0 AFTER delivery_distance"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- price column
SET @columnname = "price";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "ALTER TABLE service_bookings MODIFY COLUMN price DECIMAL(10,2) NOT NULL",
  "ALTER TABLE service_bookings ADD COLUMN price DECIMAL(10,2) NOT NULL AFTER delivery_fee"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
