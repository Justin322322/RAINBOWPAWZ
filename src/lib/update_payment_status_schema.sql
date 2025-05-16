-- Add payment_status column to service_bookings table if it doesn't exist
-- or modify it to use the new enum values

SET @dbname = DATABASE();
SET @tablename = "service_bookings";

-- Check if payment_status column exists and modify it or add it
SET @columnname = "payment_status";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "ALTER TABLE service_bookings MODIFY COLUMN payment_status ENUM('not_paid', 'partially_paid', 'paid') DEFAULT 'not_paid'",
  "ALTER TABLE service_bookings ADD COLUMN payment_status ENUM('not_paid', 'partially_paid', 'paid') DEFAULT 'not_paid' AFTER payment_method"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing records to set payment_status based on payment_method
-- If payment_method is 'gcash', set payment_status to 'paid'
-- Otherwise, set it to 'not_paid'
UPDATE service_bookings 
SET payment_status = CASE 
  WHEN payment_method = 'gcash' THEN 'paid'
  ELSE 'not_paid'
END
WHERE payment_status IS NULL OR payment_status = '';
