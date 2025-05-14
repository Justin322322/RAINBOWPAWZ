-- Create successful_bookings table to track completed transactions
CREATE TABLE IF NOT EXISTS `successful_bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` VARCHAR(50) NOT NULL,
  `service_package_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `provider_id` INT NOT NULL,
  `transaction_amount` DECIMAL(10, 2) NOT NULL,
  `payment_date` DATETIME NOT NULL,
  `payment_status` ENUM('completed', 'refunded', 'partial') NOT NULL DEFAULT 'completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`service_package_id`) REFERENCES `service_packages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some sample data for testing
INSERT INTO `successful_bookings` 
  (`booking_id`, `service_package_id`, `user_id`, `provider_id`, `transaction_amount`, `payment_date`, `payment_status`) 
VALUES
  ('BK-2023-001', 1, 2, 1, 3500.00, '2023-10-15 14:30:00', 'completed'),
  ('BK-2023-002', 2, 3, 1, 4200.00, '2023-10-18 09:45:00', 'completed'),
  ('BK-2023-003', 1, 4, 1, 3500.00, '2023-10-20 16:15:00', 'completed'),
  ('BK-2023-004', 3, 2, 2, 2800.00, '2023-10-25 11:30:00', 'completed'),
  ('BK-2023-005', 2, 5, 1, 4200.00, '2023-11-02 13:20:00', 'completed'),
  ('BK-2023-006', 4, 3, 2, 5100.00, '2023-11-05 10:00:00', 'completed'),
  ('BK-2023-007', 1, 6, 1, 3500.00, '2023-11-10 15:45:00', 'completed'),
  ('BK-2023-008', 3, 4, 2, 2800.00, '2023-11-15 09:30:00', 'completed'),
  ('BK-2023-009', 2, 2, 1, 4200.00, '2023-11-20 14:15:00', 'completed'),
  ('BK-2023-010', 4, 5, 2, 5100.00, '2023-11-25 11:00:00', 'completed'),
  ('BK-2023-011', 1, 3, 1, 3500.00, '2023-12-01 16:30:00', 'completed'),
  ('BK-2023-012', 3, 6, 2, 2800.00, '2023-12-05 10:45:00', 'completed'),
  ('BK-2023-013', 2, 4, 1, 4200.00, '2023-12-10 13:15:00', 'completed'),
  ('BK-2023-014', 4, 2, 2, 5100.00, '2023-12-15 09:00:00', 'completed'),
  ('BK-2023-015', 1, 5, 1, 3500.00, '2023-12-20 15:30:00', 'completed'),
  ('BK-2024-001', 3, 3, 2, 2800.00, '2024-01-05 11:45:00', 'completed'),
  ('BK-2024-002', 2, 6, 1, 4200.00, '2024-01-10 14:00:00', 'completed'),
  ('BK-2024-003', 4, 4, 2, 5100.00, '2024-01-15 10:30:00', 'completed'),
  ('BK-2024-004', 1, 2, 1, 3500.00, '2024-01-20 16:15:00', 'completed'),
  ('BK-2024-005', 3, 5, 2, 2800.00, '2024-01-25 09:45:00', 'completed');