-- Migration: Add Package Enhancements
-- Description: Adds support for pet size-based pricing, custom business options, and pet type selection
-- Date: 2025-07-21

-- Create package_size_pricing table for size-based pricing
CREATE TABLE IF NOT EXISTS package_size_pricing (
  id int(11) NOT NULL AUTO_INCREMENT,
  package_id int(11) NOT NULL,
  size_category enum('small','medium','large','extra_large') NOT NULL,
  weight_range_min decimal(8,2) DEFAULT NULL,
  weight_range_max decimal(8,2) DEFAULT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_package_size_pricing_package (package_id),
  KEY idx_package_size_pricing_size (size_category),
  CONSTRAINT fk_package_size_pricing_package FOREIGN KEY (package_id) REFERENCES service_packages (package_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create business_custom_options table for customizable sections
CREATE TABLE IF NOT EXISTS business_custom_options (
  id int(11) NOT NULL AUTO_INCREMENT,
  provider_id int(11) NOT NULL,
  option_type enum('category','cremation_type','processing_time') NOT NULL,
  option_value varchar(255) NOT NULL,
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_business_custom_options_provider (provider_id),
  KEY idx_business_custom_options_type (option_type),
  KEY idx_business_custom_options_active (is_active),
  CONSTRAINT fk_business_custom_options_provider FOREIGN KEY (provider_id) REFERENCES service_providers (provider_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create business_pet_types table for pet type selection
CREATE TABLE IF NOT EXISTS business_pet_types (
  id int(11) NOT NULL AUTO_INCREMENT,
  provider_id int(11) NOT NULL,
  pet_type varchar(100) NOT NULL,
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_business_pet_types_provider (provider_id),
  KEY idx_business_pet_types_active (is_active),
  CONSTRAINT fk_business_pet_types_provider FOREIGN KEY (provider_id) REFERENCES service_providers (provider_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add new columns to service_packages table
ALTER TABLE service_packages
ADD COLUMN IF NOT EXISTS has_size_pricing tinyint(1) DEFAULT 0 AFTER delivery_fee_per_km,
ADD COLUMN IF NOT EXISTS uses_custom_options tinyint(1) DEFAULT 0 AFTER has_size_pricing;
