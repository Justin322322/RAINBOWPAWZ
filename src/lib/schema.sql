-- Drop tables if they exist to allow for rerunning this script
DROP TABLE IF EXISTS service_bookings;
DROP TABLE IF EXISTS cremation_services;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS service_types;

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Philippines',
  role ENUM('user', 'admin', 'provider') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pets table
CREATE TABLE pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(100) NOT NULL,
  breed VARCHAR(100),
  color VARCHAR(100),
  gender ENUM('male', 'female', 'unknown') NOT NULL,
  birth_date DATE,
  death_date DATE,
  weight DECIMAL(5,2),
  microchip_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Service types table
CREATE TABLE service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  category ENUM('memorial', 'cremation', 'home_service') NOT NULL,
  duration_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cremation services table
CREATE TABLE cremation_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_type_id INT NOT NULL,
  pet_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  scheduled_date DATETIME NOT NULL,
  completion_date DATETIME,
  ashes_returned BOOLEAN NOT NULL DEFAULT FALSE,
  keepsake_type VARCHAR(100),
  paw_print BOOLEAN NOT NULL DEFAULT FALSE,
  special_instructions TEXT,
  price DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id),
  FOREIGN KEY (pet_id) REFERENCES pets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Service bookings table
CREATE TABLE service_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_type_id INT NOT NULL,
  user_id INT NOT NULL,
  pet_id INT,
  provider_id INT,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  booking_date DATETIME NOT NULL,
  location_type ENUM('facility', 'home', 'other') NOT NULL,
  location_address TEXT,
  attendees_count INT,
  special_requests TEXT,
  price DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (pet_id) REFERENCES pets(id),
  FOREIGN KEY (provider_id) REFERENCES users(id)
);

-- Insert initial service types
INSERT INTO service_types (name, description, base_price, category, duration_minutes) VALUES
('Private Cremation', 'Individual pet cremation with ashes returned to owner', 250.00, 'cremation', 120),
('Communal Cremation', 'Multiple pets cremated together, ashes not returned', 100.00, 'cremation', 90),
('Private Memorial Service', 'An intimate farewell ceremony in our serene memorial hall', 300.00, 'memorial', 180),
('Home Memorial Service', 'Compassionate at-home memorial service', 350.00, 'home_service', 120),
('Memorial Paw Print', 'Clay paw print keepsake', 50.00, 'cremation', 30),
('Custom Urn', 'Personalized urn for your pet\'s ashes', 100.00, 'cremation', 0),
('Memorial Shadow Box', 'Custom shadow box with photo and keepsakes', 150.00, 'memorial', 0);

-- Insert sample admin user
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES
('admin@rainbowpaws.com', '$2y$10$zIXk1c8aO9d.U10KFPYxUeYEBTQzZXJ7C0d6F6v8h0qPu4DuCPFPi', 'Admin', 'User', '555-123-4567', 'admin'); 