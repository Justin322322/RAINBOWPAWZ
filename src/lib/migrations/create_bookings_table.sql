-- Create bookings table based on service_bookings structure with additional fields
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `service_provider_id` int(11) NOT NULL,
  `provider_id` int(11) GENERATED ALWAYS AS (`service_provider_id`) VIRTUAL,
  `service_package_id` int(11) NOT NULL,
  `package_id` int(11) GENERATED ALWAYS AS (`service_package_id`) VIRTUAL,
  `pet_id` int(11) DEFAULT NULL,
  `pet_name` varchar(255) DEFAULT NULL,
  `pet_type` varchar(100) DEFAULT NULL,
  `cause_of_death` text DEFAULT NULL,
  `pet_image_url` varchar(255) DEFAULT NULL,
  `booking_date` date DEFAULT NULL,
  `booking_time` time DEFAULT NULL,
  `status` enum('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
  `special_requests` text DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'cash',
  `payment_status` enum('not_paid','partially_paid','paid','refunded') DEFAULT 'not_paid',
  `refund_id` int(11) DEFAULT NULL,
  `delivery_option` enum('pickup','delivery') DEFAULT 'pickup',
  `delivery_address` text DEFAULT NULL,
  `delivery_distance` float DEFAULT 0,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `total_price` decimal(10,2) DEFAULT NULL,
  `provider_name` varchar(255) DEFAULT NULL,
  `package_name` varchar(255) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `service_provider_id` (`service_provider_id`),
  KEY `service_package_id` (`service_package_id`),
  KEY `pet_id` (`pet_id`),
  KEY `status` (`status`),
  KEY `booking_date` (`booking_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add foreign key constraints
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_provider_id_fk` FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_pet_id_fk` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE SET NULL;

-- Add compatibility aliases for code that uses different column names
-- These views help maintain compatibility with both table structures
CREATE OR REPLACE VIEW `bookings_view` AS
SELECT 
  b.*,
  b.service_provider_id AS provider_id,
  b.service_package_id AS package_id
FROM `bookings` b; 