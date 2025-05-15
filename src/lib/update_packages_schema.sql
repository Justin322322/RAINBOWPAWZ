-- Add category column to service_packages table
ALTER TABLE service_packages ADD COLUMN category ENUM('Private', 'Communal') DEFAULT 'Private' AFTER description;

-- Add cremation_type column to service_packages table
ALTER TABLE service_packages ADD COLUMN cremation_type ENUM('Standard', 'Premium', 'Deluxe') DEFAULT 'Standard' AFTER category;

-- Add processing_time column to service_packages table
ALTER TABLE service_packages ADD COLUMN processing_time VARCHAR(50) DEFAULT '1-2 days' AFTER cremation_type;

-- Add conditions column to service_packages table
ALTER TABLE service_packages ADD COLUMN conditions TEXT AFTER price;

-- Add is_active column to service_packages table if it doesn't exist
ALTER TABLE service_packages ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER conditions;

-- Add delivery_fee_per_km column to service_packages table
-- Check if column exists first to avoid errors in migrations

SET @dbname = DATABASE();
SET @tablename = "service_packages";
SET @columnname = "delivery_fee_per_km";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column delivery_fee_per_km already exists in service_packages table' AS result",
  "ALTER TABLE service_packages ADD COLUMN delivery_fee_per_km DECIMAL(10,2) DEFAULT 0 AFTER price"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create package_inclusions table if it doesn't exist
CREATE TABLE IF NOT EXISTS package_inclusions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
);

-- Create package_addons table if it doesn't exist
CREATE TABLE IF NOT EXISTS package_addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
);

-- Create package_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS package_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  image_id VARCHAR(100),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_packages_provider ON service_packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_package_inclusions_package ON package_inclusions(package_id);
CREATE INDEX IF NOT EXISTS idx_package_addons_package ON package_addons(package_id);
CREATE INDEX IF NOT EXISTS idx_package_images_package ON package_images(package_id);

-- Add delivery_option column to service_bookings table
SET @tablename = "service_bookings";
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
  "ALTER TABLE service_bookings ADD COLUMN delivery_option ENUM('pickup', 'delivery') DEFAULT 'pickup' AFTER payment_status"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add delivery_distance column to service_bookings table
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
  "ALTER TABLE service_bookings ADD COLUMN delivery_distance INT DEFAULT 0 AFTER delivery_option"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add delivery_fee column to service_bookings table
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

-- Add payment_method column to service_bookings table if it doesn't exist
SET @columnname = "payment_method";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "ALTER TABLE service_bookings MODIFY COLUMN payment_method ENUM('credit_card', 'bank_transfer', 'cash', 'gcash') DEFAULT 'cash'",
  "ALTER TABLE service_bookings ADD COLUMN payment_method ENUM('credit_card', 'bank_transfer', 'cash', 'gcash') DEFAULT 'cash' AFTER payment_status"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Keep payment_status as is, just commenting the incorrect line
-- ALTER TABLE service_bookings MODIFY COLUMN payment_status ENUM('pending', 'paid', 'refunded', 'cash', 'gcash') NOT NULL DEFAULT 'pending';
