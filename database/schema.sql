-- Create rainbow_paws database
CREATE DATABASE IF NOT EXISTS rainbow_paws CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE rainbow_paws;

-- Users table (for personal accounts / fur parents)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  sex VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Business accounts table (cremation centers, memorial service providers)
CREATE TABLE businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(100) NOT NULL,
  business_type ENUM('cremation', 'memorial', 'veterinary') NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  contact_first_name VARCHAR(50) NOT NULL,
  contact_last_name VARCHAR(50) NOT NULL,
  business_phone VARCHAR(20) NOT NULL,
  business_address TEXT NOT NULL,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  business_hours TEXT,
  service_description TEXT,
  bp_permit_number VARCHAR(50),
  tax_id_number VARCHAR(50),
  document_path VARCHAR(255),
  is_verified BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pets table
CREATE TABLE pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(50),
  age INT,
  gender VARCHAR(20),
  weight DECIMAL(5,2),
  photo_path VARCHAR(255),
  special_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Memorial service types
CREATE TABLE service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('private', 'home', 'group') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Business services (linking businesses to the services they offer)
CREATE TABLE business_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  service_type_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration INT NOT NULL COMMENT 'Duration in minutes',
  max_attendees INT,
  is_available BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pet_id INT NOT NULL,
  business_service_id INT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (business_service_id) REFERENCES business_services(id) ON DELETE CASCADE
);

-- Reviews table
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  business_id INT NOT NULL,
  booking_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Admins table
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default service types
INSERT INTO service_types (name, description, category) VALUES
('Private Memorial Service', 'An intimate farewell ceremony in our serene memorial hall, personalized to honor your beloved companion\'s unique spirit.', 'private'),
('Home Memorial Service', 'Compassionate at-home memorial services for a peaceful farewell in familiar surroundings.', 'home'),
('Group Memorial Service', 'A shared ceremony with other pet parents to honor multiple companions together.', 'group');

-- Insert an admin user (password: admin123)
INSERT INTO admins (username, password, email, full_name, role) VALUES
('admin', '$2y$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC', 'admin@rainbowpaws.com', 'System Administrator', 'super_admin'); 