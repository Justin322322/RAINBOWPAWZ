-- Bookings tables for RainbowPaws

-- Table for service bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `service_provider_id` INT NOT NULL,
  `service_package_id` INT NOT NULL,
  `pet_name` VARCHAR(100) NOT NULL,
  `pet_type` VARCHAR(50) NOT NULL,
  `booking_date` DATETIME NOT NULL,
  `status` ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `special_instructions` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table for service providers
CREATE TABLE IF NOT EXISTS `service_providers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `provider_type` VARCHAR(100) NOT NULL DEFAULT 'Pet Cremation Services',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table for service packages
CREATE TABLE IF NOT EXISTS `service_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `duration_minutes` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample service providers
INSERT INTO `service_providers` (`name`, `city`, `address`, `phone`, `email`, `description`, `provider_type`) VALUES
('Rainbow Bridge Pet Cremation', 'Balanga City, Bataan', 'Capitol Drive, Balanga City, Bataan, Philippines', '(123) 456-7890', 'info@rainbowbridge.com', 'Compassionate pet cremation services with personalized memorials.', 'Pet Cremation Services'),
('Peaceful Paws Memorial', 'Balanga City, Bataan', 'Tuyo, Balanga City, Bataan, Philippines', '(234) 567-8901', 'care@peacefulpaws.com', 'Dignified pet cremation with eco-friendly options.', 'Pet Cremation Services'),
('Eternal Companions', 'Balanga City, Bataan', 'Tenejero, Balanga City, Bataan, Philippines', '(345) 678-9012', 'service@eternalcompanions.com', 'Honoring your pet with respectful cremation services.', 'Pet Cremation Services');

-- Insert sample service packages
INSERT INTO `service_packages` (`provider_id`, `name`, `description`, `price`, `duration_minutes`) VALUES
(1, 'Basic Cremation', 'Simple cremation service with standard urn', 3500.00, 120),
(1, 'Premium Cremation', 'Private cremation with premium urn and memorial certificate', 5500.00, 180),
(1, 'Memorial Package', 'Premium cremation with custom engraved urn and paw print keepsake', 7500.00, 240),
(2, 'Basic Service', 'Standard cremation with basic urn', 3000.00, 120),
(2, 'Deluxe Package', 'Private cremation with wooden urn and memorial service', 6000.00, 240),
(3, 'Simple Farewell', 'Basic cremation with ceramic urn', 2800.00, 120); 