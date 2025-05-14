-- Drop tables if they exist to allow for rerunning this script
DROP TABLE IF EXISTS package_images;
DROP TABLE IF EXISTS package_inclusions;
DROP TABLE IF EXISTS package_addons;
DROP TABLE IF EXISTS service_packages;

-- Service packages table
CREATE TABLE service_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category ENUM('Private', 'Communal') NOT NULL,
  cremation_type ENUM('Standard', 'Premium', 'Deluxe') NOT NULL,
  processing_time VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  conditions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES business_profiles(id) ON DELETE CASCADE
);

-- Package inclusions table (one-to-many)
CREATE TABLE package_inclusions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
);

-- Package add-ons table (one-to-many)
CREATE TABLE package_addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
);

-- Package images table (one-to-many)
CREATE TABLE package_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  image_id VARCHAR(100),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_service_packages_provider ON service_packages(provider_id);
CREATE INDEX idx_package_inclusions_package ON package_inclusions(package_id);
CREATE INDEX idx_package_addons_package ON package_addons(package_id);
CREATE INDEX idx_package_images_package ON package_images(package_id);
