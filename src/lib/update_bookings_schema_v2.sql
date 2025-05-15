-- Add new fields for delivery options and payment methods to service_bookings table
-- Check if columns exist first to avoid errors in migrations

SET @dbname = DATABASE();
SET @tablename = "service_bookings";

-- Add pet_type column if it doesn't exist
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

-- Add payment_method column if it doesn't exist
SET @columnname = "payment_method";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column payment_method already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN payment_method ENUM('cash', 'gcash') DEFAULT 'cash' AFTER payment_status"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add delivery_option column if it doesn't exist
SET @columnname = "delivery_option";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column delivery_option already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN delivery_option ENUM('pickup', 'delivery') DEFAULT 'pickup' AFTER payment_method"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add delivery_distance column if it doesn't exist
SET @columnname = "delivery_distance";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column delivery_distance already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN delivery_distance DECIMAL(10,2) DEFAULT 0 AFTER delivery_option"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add delivery_fee column if it doesn't exist
SET @columnname = "delivery_fee";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column delivery_fee already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0 AFTER delivery_distance"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Also add package_id column to link directly to service_packages
SET @columnname = "package_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column package_id already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings ADD COLUMN package_id INT AFTER service_type_id"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update the booking_date field to be a DATE type, and add booking_time
SET @columnname = "booking_time";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column booking_time already exists in service_bookings table' AS result",
  "ALTER TABLE service_bookings MODIFY COLUMN booking_date DATE NOT NULL, ADD COLUMN booking_time TIME AFTER booking_date"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists; 