-- Add pet_name, cause_of_death and pet_image_url to service_bookings table
-- Check if columns exist first to avoid errors in migrations

-- Check for pet_name column
SET @dbname = DATABASE();
SET @tablename = "service_bookings";
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

-- Check for cause_of_death column
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
  "ALTER TABLE service_bookings ADD COLUMN cause_of_death VARCHAR(255) AFTER pet_name"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check for pet_image_url column
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
  "ALTER TABLE service_bookings ADD COLUMN pet_image_url VARCHAR(255) AFTER cause_of_death"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Make the pet_id column nullable since we'll now use pet_name directly
ALTER TABLE service_bookings MODIFY COLUMN pet_id INT NULL;
