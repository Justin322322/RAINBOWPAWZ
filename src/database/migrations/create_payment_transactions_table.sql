-- Create payment_transactions table for tracking payment processing
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `payment_intent_id` VARCHAR(255) NULL,
  `source_id` VARCHAR(255) NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(3) DEFAULT 'PHP',
  `payment_method` ENUM('gcash', 'cash') NOT NULL,
  `status` ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled') DEFAULT 'pending',
  `provider` ENUM('paymongo', 'manual') NOT NULL,
  `provider_transaction_id` VARCHAR(255) NULL,
  `checkout_url` TEXT NULL,
  `return_url` TEXT NULL,
  `failure_reason` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`booking_id`) REFERENCES `service_bookings`(`id`) ON DELETE CASCADE,
  INDEX `idx_booking_id` (`booking_id`),
  INDEX `idx_source_id` (`source_id`),
  INDEX `idx_payment_intent_id` (`payment_intent_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_payment_method` (`payment_method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update service_bookings table to add partially_paid status if not exists
ALTER TABLE `service_bookings` 
MODIFY COLUMN `payment_status` ENUM('not_paid', 'partially_paid', 'paid', 'refunded') DEFAULT 'not_paid';
