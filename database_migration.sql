-- Database Migration Script
-- This script migrates data from the old schema to the new refactored schema
-- It should be run after the new schema has been created

-- Start transaction to ensure data integrity
START TRANSACTION;

-- Migrate users
-- First, migrate fur parents
INSERT INTO `users` (
  `id`, 
  `email`, 
  `password`, 
  `first_name`, 
  `last_name`, 
  `phone_number`, 
  `address`, 
  `sex`, 
  `role`, 
  `status`, 
  `is_verified`, 
  `is_otp_verified`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `id`, 
  `email`, 
  `password`, 
  `first_name`, 
  `last_name`, 
  `phone_number`, 
  `address`, 
  `sex`, 
  CASE 
    WHEN `user_type` = 'fur_parent' THEN 'fur_parent'
    WHEN `user_type` = 'business' THEN 'business'
    ELSE 'fur_parent'
  END AS `role`,
  `status`,
  `is_verified`,
  `is_otp_verified`,
  `created_at`,
  `updated_at`
FROM old_users
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `users`.`id` = old_users.`id`);

-- Migrate admin users
INSERT INTO `users` (
  `email`, 
  `password`, 
  `first_name`, 
  `last_name`, 
  `role`, 
  `is_verified`, 
  `is_otp_verified`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `email`, 
  `password`, 
  `username` AS `first_name`, 
  `full_name` AS `last_name`, 
  'admin' AS `role`,
  1 AS `is_verified`,
  1 AS `is_otp_verified`,
  `created_at`,
  `updated_at`
FROM old_admins
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `users`.`email` = old_admins.`email`);

-- Get the IDs of the migrated admin users
CREATE TEMPORARY TABLE temp_admin_ids AS
SELECT `users`.`id`, old_admins.`username`, old_admins.`full_name`, old_admins.`role`
FROM `users`
JOIN old_admins ON `users`.`email` = old_admins.`email`
WHERE `users`.`role` = 'admin';

-- Create admin profiles for the migrated admin users
INSERT INTO `admin_profiles` (
  `user_id`, 
  `username`, 
  `full_name`, 
  `admin_role`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `id`, 
  `username`, 
  `full_name`, 
  `role` AS `admin_role`,
  NOW() AS `created_at`,
  NOW() AS `updated_at`
FROM temp_admin_ids;

-- Migrate business profiles
INSERT INTO `business_profiles` (
  `user_id`, 
  `business_name`, 
  `business_type`, 
  `contact_first_name`, 
  `contact_last_name`, 
  `business_phone`, 
  `business_address`, 
  `province`, 
  `city`, 
  `zip`, 
  `business_hours`, 
  `service_description`, 
  `verification_status`, 
  `verification_date`, 
  `verification_notes`, 
  `bir_certificate_path`, 
  `business_permit_path`, 
  `government_id_path`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `user_id`, 
  `business_name`, 
  `business_type`, 
  `contact_first_name`, 
  `contact_last_name`, 
  `business_phone`, 
  `business_address`, 
  `province`, 
  `city`, 
  `zip`, 
  `business_hours`, 
  `service_description`, 
  CASE 
    WHEN `is_verified` = 1 THEN 'verified'
    WHEN `verification_status` = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END AS `verification_status`,
  `verification_date`, 
  `verification_notes`, 
  `bir_certificate_path`, 
  `business_permit_path`, 
  `government_id_path`, 
  `created_at`, 
  `updated_at`
FROM old_businesses;

-- Migrate pets
INSERT INTO `pets` (
  `id`, 
  `user_id`, 
  `name`, 
  `species`, 
  `breed`, 
  `age`, 
  `gender`, 
  `weight`, 
  `photo_path`, 
  `special_notes`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `id`, 
  `user_id`, 
  `name`, 
  `species`, 
  `breed`, 
  `age`, 
  `gender`, 
  `weight`, 
  `photo_path`, 
  `special_notes`, 
  `created_at`, 
  `updated_at`
FROM old_pets;

-- Migrate service types (if not already inserted)
INSERT INTO `service_types` (
  `id`, 
  `name`, 
  `description`, 
  `category`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `id`, 
  `name`, 
  `description`, 
  `category`, 
  `created_at`, 
  `updated_at`
FROM old_service_types
WHERE NOT EXISTS (SELECT 1 FROM `service_types` WHERE `service_types`.`id` = old_service_types.`id`);

-- Migrate business services
INSERT INTO `business_services` (
  `id`, 
  `business_id`, 
  `service_type_id`, 
  `price`, 
  `duration`, 
  `max_attendees`, 
  `is_available`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `id`, 
  `business_id`, 
  `service_type_id`, 
  `price`, 
  `duration`, 
  `max_attendees`, 
  `is_available`, 
  `created_at`, 
  `updated_at`
FROM old_business_services;

-- Migrate bookings
INSERT INTO `bookings` (
  `id`, 
  `user_id`, 
  `pet_id`, 
  `business_service_id`, 
  `booking_date`, 
  `booking_time`, 
  `status`, 
  `total_amount`, 
  `special_requests`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `id`, 
  `user_id`, 
  `pet_id`, 
  `business_service_id`, 
  `booking_date`, 
  `booking_time`, 
  `status`, 
  `total_amount`, 
  `special_requests`, 
  `created_at`, 
  `updated_at`
FROM old_bookings;

-- Migrate reviews
INSERT INTO `reviews` (
  `id`, 
  `user_id`, 
  `business_id`, 
  `booking_id`, 
  `rating`, 
  `comment`, 
  `created_at`, 
  `updated_at`
)
SELECT 
  `id`, 
  `user_id`, 
  `business_id`, 
  `booking_id`, 
  `rating`, 
  `comment`, 
  `created_at`, 
  `updated_at`
FROM old_reviews;

-- Migrate OTP codes
INSERT INTO `otp_codes` (
  `id`, 
  `user_id`, 
  `otp_code`, 
  `expires_at`, 
  `is_used`, 
  `created_at`
)
SELECT 
  `id`, 
  `user_id`, 
  `otp_code`, 
  `expires_at`, 
  `is_used`, 
  `created_at`
FROM old_otp_codes;

-- Migrate OTP attempts
INSERT INTO `otp_attempts` (
  `id`, 
  `user_id`, 
  `attempt_type`, 
  `attempt_time`, 
  `ip_address`
)
SELECT 
  `id`, 
  `user_id`, 
  `attempt_type`, 
  `attempt_time`, 
  `ip_address`
FROM old_otp_attempts;

-- Commit the transaction
COMMIT;
