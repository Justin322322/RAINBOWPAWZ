-- Add pet_id and delivery_address columns to service_bookings table
-- Check if columns exist first to avoid errors in migrations

SET @dbname = DATABASE();
SET @tablename = "service_bookings";

-- Add pet_id column if it doesn't exist
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
  "ALTER TABLE service_bookings ADD COLUMN pet_id INT AFTER package_id, ADD CONSTRAINT fk_pet_id FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add delivery_address column if it doesn't exist
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
