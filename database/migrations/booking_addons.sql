-- Create booking_addons table to store selected add-ons for each booking
CREATE TABLE IF NOT EXISTS `booking_addons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `addon_name` varchar(255) NOT NULL,
  `addon_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_selected` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `booking_addons_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `service_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores add-ons selected for each booking';
