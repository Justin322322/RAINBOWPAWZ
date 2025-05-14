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
