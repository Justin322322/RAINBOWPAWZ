-- RainbowPaws Database Schema
-- This file contains the complete database schema for the RainbowPaws application

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  account_type ENUM('personal', 'business', 'admin') DEFAULT 'personal',
  profile_picture VARCHAR(255),
  address TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_restricted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_account_type (account_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;;;

-- Service providers table
CREATE TABLE IF NOT EXISTS service_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider_type ENUM('cremation', 'memorial') DEFAULT 'cremation',
  contact_first_name VARCHAR(100),
  contact_last_name VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  hours TEXT,
  description TEXT,
  application_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  is_restricted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_provider_type (provider_type),
  INDEX idx_application_status (application_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Service packages table
CREATE TABLE IF NOT EXISTS service_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_provider_id INT NOT NULL,
  provider_id INT GENERATED ALWAYS AS (service_provider_id) VIRTUAL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration VARCHAR(100),
  features TEXT,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_provider_id) REFERENCES service_providers(id) ON DELETE CASCADE,
  INDEX idx_service_provider_id (service_provider_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Package addons table
CREATE TABLE IF NOT EXISTS package_addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  addon_id INT,
  package_id INT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_package_id (package_id),
  INDEX idx_addon_id (addon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
  pet_id INT AUTO_INCREMENT PRIMARY KEY,
  id INT GENERATED ALWAYS AS (pet_id) VIRTUAL,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(100) NOT NULL,
  breed VARCHAR(255),
  gender VARCHAR(50),
  age VARCHAR(50),
  weight DECIMAL(8,2),
  photo_path VARCHAR(255),
  special_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Service bookings table
CREATE TABLE IF NOT EXISTS service_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_provider_id INT NOT NULL,
  provider_id INT GENERATED ALWAYS AS (service_provider_id) VIRTUAL,
  service_package_id INT NOT NULL,
  package_id INT GENERATED ALWAYS AS (service_package_id) VIRTUAL,
  pet_id INT,
  pet_name VARCHAR(255),
  pet_type VARCHAR(100),
  cause_of_death TEXT,
  pet_image_url VARCHAR(255),
  booking_date DATE,
  booking_time TIME,
  status ENUM('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0.00,
  payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (service_provider_id) REFERENCES service_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (service_package_id) REFERENCES service_packages(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_service_provider_id (service_provider_id),
  INDEX idx_service_package_id (service_package_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_booking_date (booking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bookings table (alias for service_bookings)
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_provider_id INT NOT NULL,
  provider_id INT GENERATED ALWAYS AS (service_provider_id) VIRTUAL,
  service_package_id INT NOT NULL,
  package_id INT GENERATED ALWAYS AS (service_package_id) VIRTUAL,
  pet_id INT DEFAULT NULL,
  pet_name VARCHAR(255) DEFAULT NULL,
  pet_type VARCHAR(100) DEFAULT NULL,
  cause_of_death TEXT DEFAULT NULL,
  pet_image_url VARCHAR(255) DEFAULT NULL,
  booking_date DATE DEFAULT NULL,
  booking_time TIME DEFAULT NULL,
  status ENUM('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0.00,
  payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  payment_intent_id VARCHAR(255) DEFAULT NULL,
  special_instructions TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_service_provider_id (service_provider_id),
  INDEX idx_service_package_id (service_package_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_booking_date (booking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  service_provider_id INT NOT NULL,
  booking_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expiration_date TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE INDEX unique_booking_review (booking_id ASC),
  INDEX idx_user_id (user_id),
  INDEX idx_service_provider_id (service_provider_id),
  INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  is_used TINYINT(1) DEFAULT 0,
  UNIQUE KEY unique_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_used (is_used),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Provider availability table
CREATE TABLE IF NOT EXISTS provider_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY provider_date_unique (provider_id, date),
  INDEX idx_provider_id (provider_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Provider time slots table
CREATE TABLE IF NOT EXISTS provider_time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  available_services TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_date (provider_id, date),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(200) NOT NULL,
  title VARCHAR(1000) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(200),
  entity_id INT,
  link VARCHAR(1000),
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(200) NOT NULL,
  title VARCHAR(1000) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(200),
  entity_id INT,
  link VARCHAR(1000),
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Business notifications table
CREATE TABLE IF NOT EXISTS business_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  type VARCHAR(200) NOT NULL,
  title VARCHAR(1000) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(200),
  entity_id INT,
  link VARCHAR(1000),
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_business_id (business_id),
  INDEX idx_type (type),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  error_message TEXT NULL,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email log table
CREATE TABLE IF NOT EXISTS email_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status ENUM('sent', 'failed') NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT NULL,
  INDEX idx_to_email (to_email),
  INDEX idx_status (status),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE KEY unique_identifier_action (identifier, action),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'denied', 'processed') DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_id (booking_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
