-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 28, 2025 at 03:13 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `rainbow_paws`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_logs`
--

CREATE TABLE `admin_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_profiles`
--

CREATE TABLE `admin_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `admin_role` varchar(50) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `provider_id` int(11) DEFAULT NULL,
  `package_id` int(11) DEFAULT NULL,
  `pet_id` int(11) DEFAULT NULL,
  `booking_date` date DEFAULT NULL,
  `booking_time` time DEFAULT NULL,
  `status` enum('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
  `special_requests` text DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'cash',
  `delivery_option` enum('pickup','delivery') DEFAULT 'pickup',
  `delivery_address` text DEFAULT NULL,
  `delivery_distance` float DEFAULT 0,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `total_price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `type` enum('info','success','warning','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `title`, `message`, `type`, `is_read`, `link`, `created_at`) VALUES
(14, 4, 'Booking Created Successfully', 'Your booking for asdasd\'s asdadd with Rainbow Paws Cremation Center has been created and is pending confirmation.', 'success', 1, '/user/furparent_dashboard/bookings/11', '2025-05-28 06:44:32'),
(16, 3, 'Pending Bookings Reminder', 'You have 1 pending booking waiting for your review.', 'warning', 1, '/cremation/bookings?status=pending', '2025-05-28 06:44:58'),
(17, 4, 'Review Reminder', 'You have 1 completed booking that needs a review', 'info', 1, '/user/furparent_dashboard/bookings?filter=completed', '2025-05-28 07:01:58'),
(18, 3, 'New Review Received', 'Justin Sibonga left a 5-star review for your service.', 'info', 1, '/cremation/reviews', '2025-05-28 07:02:26'),
(19, 4, 'Booking Created Successfully', 'Your booking for asdasdd\'s asdadd with Rainbow Paws Cremation Center has been created and is pending confirmation.', 'success', 1, '/user/furparent_dashboard/bookings/12', '2025-05-28 12:57:07'),
(20, 3, 'New Booking Received', 'You have received a new booking for asdasdd\'s asdadd.', 'info', 0, '/cremation/bookings/12', '2025-05-28 12:57:10'),
(21, 4, 'Booking Created Successfully', 'Your booking for sadad\'s asdadd with Rainbow Paws Cremation Center has been created and is pending confirmation.', 'success', 1, '/user/furparent_dashboard/bookings/13', '2025-05-28 13:06:55'),
(22, 3, 'New Booking Received', 'You have received a new booking for sadad\'s asdadd.', 'info', 0, '/cremation/bookings/13', '2025-05-28 13:06:58'),
(23, 4, 'Booking Created Successfully', 'Your booking for asdada\'s asdadd with Rainbow Paws Cremation Center has been created and is pending confirmation.', 'success', 0, '/user/furparent_dashboard/bookings/14', '2025-05-28 13:13:18'),
(24, 3, 'New Booking Received', 'You have received a new booking for asdada\'s asdadd.', 'info', 0, '/cremation/bookings/14', '2025-05-28 13:13:21');

-- --------------------------------------------------------

--
-- Table structure for table `otp_attempts`
--

CREATE TABLE `otp_attempts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `attempt_type` enum('generate','verify') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `attempt_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `otp_codes`
--

CREATE TABLE `otp_codes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_addons`
--

CREATE TABLE `package_addons` (
  `addon_id` int(11) NOT NULL,
  `package_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_images`
--

CREATE TABLE `package_images` (
  `image_id` int(11) NOT NULL,
  `package_id` int(11) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_inclusions`
--

CREATE TABLE `package_inclusions` (
  `inclusion_id` int(11) NOT NULL,
  `package_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `package_inclusions`
--

INSERT INTO `package_inclusions` (`inclusion_id`, `package_id`, `description`, `created_at`) VALUES
(15, 9, 'asdasd', '2025-05-28 06:40:57');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `payment_intent_id` varchar(255) DEFAULT NULL,
  `source_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'PHP',
  `payment_method` enum('gcash','cash') NOT NULL,
  `status` enum('pending','processing','succeeded','failed','cancelled') DEFAULT 'pending',
  `provider` enum('paymongo','manual') NOT NULL,
  `provider_transaction_id` varchar(255) DEFAULT NULL,
  `checkout_url` text DEFAULT NULL,
  `return_url` text DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pets`
--

CREATE TABLE `pets` (
  `pet_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `species` varchar(100) DEFAULT NULL,
  `breed` varchar(255) DEFAULT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `age` varchar(50) DEFAULT NULL,
  `weight` decimal(8,2) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `special_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pets`
--

INSERT INTO `pets` (`pet_id`, `user_id`, `name`, `species`, `breed`, `gender`, `age`, `weight`, `photo_path`, `special_notes`, `created_at`, `updated_at`) VALUES
(9, 4, 'asdasd', 'Dog', NULL, NULL, NULL, NULL, NULL, NULL, '2025-05-28 06:44:30', '2025-05-28 06:44:30'),
(10, 4, 'asdasdd', 'Dog', NULL, NULL, NULL, NULL, NULL, NULL, '2025-05-28 12:57:07', '2025-05-28 12:57:07'),
(11, 4, 'sadad', 'Dog', NULL, NULL, NULL, NULL, NULL, NULL, '2025-05-28 13:06:55', '2025-05-28 13:06:55'),
(12, 4, 'asdada', 'Cat', NULL, NULL, NULL, NULL, NULL, NULL, '2025-05-28 13:13:18', '2025-05-28 13:13:18');

-- --------------------------------------------------------

--
-- Table structure for table `provider_availability`
--

CREATE TABLE `provider_availability` (
  `id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `provider_availability`
--

INSERT INTO `provider_availability` (`id`, `provider_id`, `date`, `is_available`, `created_at`, `updated_at`) VALUES
(27, 4, '2025-06-01', 1, '2025-05-28 06:42:52', '2025-05-28 06:42:52');

-- --------------------------------------------------------

--
-- Table structure for table `provider_time_slots`
--

CREATE TABLE `provider_time_slots` (
  `id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `available_services` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `provider_time_slots`
--

INSERT INTO `provider_time_slots` (`id`, `provider_id`, `date`, `start_time`, `end_time`, `available_services`, `created_at`, `updated_at`) VALUES
(209, 4, '2025-06-01', '09:00:00', '10:00:00', '[9]', '2025-05-28 06:42:52', '2025-05-28 06:42:52');

-- --------------------------------------------------------

--
-- Table structure for table `rate_limits`
--

CREATE TABLE `rate_limits` (
  `id` int(11) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `action` varchar(100) NOT NULL,
  `request_count` int(11) DEFAULT 1,
  `window_start` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rate_limits`
--

INSERT INTO `rate_limits` (`id`, `identifier`, `action`, `request_count`, `window_start`, `created_at`, `updated_at`) VALUES
(438, '4', 'notification_fetch', 3, '2025-05-28 13:12:17', '2025-05-28 13:12:17', '2025-05-28 13:12:32');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `service_provider_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expiration_date` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reviews`
--

INSERT INTO `reviews` (`id`, `user_id`, `service_provider_id`, `booking_id`, `rating`, `comment`, `created_at`, `updated_at`, `expiration_date`) VALUES
(7, 4, 4, 11, 5, NULL, '2025-05-28 07:02:26', '2025-05-28 07:02:26', '2025-06-01 23:02:26');

-- --------------------------------------------------------

--
-- Table structure for table `service_bookings`
--

CREATE TABLE `service_bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
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
  `delivery_option` enum('pickup','delivery') DEFAULT 'pickup',
  `delivery_address` text DEFAULT NULL,
  `delivery_distance` float DEFAULT 0,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_bookings`
--

INSERT INTO `service_bookings` (`id`, `user_id`, `provider_id`, `package_id`, `pet_name`, `pet_type`, `cause_of_death`, `pet_image_url`, `booking_date`, `booking_time`, `status`, `special_requests`, `payment_method`, `payment_status`, `delivery_option`, `delivery_address`, `delivery_distance`, `delivery_fee`, `price`, `created_at`, `updated_at`) VALUES
(14, 4, 4, 9, 'asdada', 'Cat', NULL, NULL, '2025-06-01', '09:00:00', 'cancelled', NULL, 'gcash', 'paid', 'delivery', 'Balanga, Bataan', 10.5, 525.00, 3756.00, '2025-05-28 13:13:18', '2025-05-28 13:13:44');

-- --------------------------------------------------------

--
-- Table structure for table `service_packages`
--

CREATE TABLE `service_packages` (
  `package_id` int(11) NOT NULL,
  `provider_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `category` enum('Private','Communal') DEFAULT 'Private',
  `cremation_type` enum('Standard','Premium','Deluxe') DEFAULT 'Standard',
  `processing_time` varchar(50) DEFAULT '1-2 days',
  `price` decimal(10,2) DEFAULT NULL,
  `delivery_fee_per_km` decimal(10,2) DEFAULT 0.00,
  `conditions` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_packages`
--

INSERT INTO `service_packages` (`package_id`, `provider_id`, `name`, `description`, `category`, `cremation_type`, `processing_time`, `price`, `delivery_fee_per_km`, `conditions`, `is_active`, `created_at`, `updated_at`) VALUES
(9, 4, 'asdadd', 'asdasdasdasd', 'Private', 'Standard', '1-2 days', 3231.00, 0.00, 'asdasd', 1, '2025-05-28 06:40:57', '2025-05-28 06:40:57');

-- --------------------------------------------------------

--
-- Table structure for table `service_providers`
--

CREATE TABLE `service_providers` (
  `provider_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `provider_type` enum('cremation','memorial','veterinary') DEFAULT NULL,
  `contact_first_name` varchar(50) DEFAULT NULL,
  `contact_last_name` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `province` varchar(50) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `hours` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `application_status` enum('pending','declined','approved','restricted') DEFAULT 'pending',
  `verification_date` timestamp NULL DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `bir_certificate_path` varchar(255) DEFAULT NULL,
  `business_permit_path` varchar(255) DEFAULT NULL,
  `government_id_path` varchar(255) DEFAULT NULL,
  `active_service_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_providers`
--

INSERT INTO `service_providers` (`provider_id`, `user_id`, `name`, `provider_type`, `contact_first_name`, `contact_last_name`, `phone`, `address`, `province`, `city`, `zip`, `hours`, `description`, `application_status`, `verification_date`, `verification_notes`, `bir_certificate_path`, `business_permit_path`, `government_id_path`, `active_service_count`, `created_at`, `updated_at`) VALUES
(4, 3, 'Rainbow Paws Cremation Center', 'cremation', 'Justin', 'Sibonga', '09123456789', 'Samal Bataan', 'Bataan', 'Samal', '2113', '8:00 AM - 5:00 PM, Monday to Saturday', 'Professional pet cremation services with care and respect.', 'approved', '2025-05-28 11:51:46', 'Application approved', '/uploads/documents/3/bir_certificate_1748043753558.png', '/uploads/documents/3/business_permit_1748043753551.png', '/uploads/documents/3/government_id_1748043753563.png', 0, '2025-05-23 02:43:36', '2025-05-28 11:51:46');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `role` enum('fur_parent','business','admin') NOT NULL DEFAULT 'fur_parent',
  `status` enum('active','inactive','suspended','restricted') DEFAULT 'active',
  `is_verified` tinyint(1) DEFAULT 0,
  `is_otp_verified` tinyint(1) DEFAULT 0,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sms_notifications` tinyint(1) DEFAULT 1 COMMENT 'User preference for SMS notifications',
  `email_notifications` tinyint(1) DEFAULT 1 COMMENT 'User preference for email notifications'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `email`, `password`, `first_name`, `last_name`, `phone`, `address`, `gender`, `profile_picture`, `role`, `status`, `is_verified`, `is_otp_verified`, `last_login`, `created_at`, `updated_at`, `sms_notifications`, `email_notifications`) VALUES
(1, 'pakalucamel@gmail.com', '$2b$10$Ex1/5mmF2YtNdL1U8MDoSutO4wBM9DjKRP3vEsARbbXLWiD2x3nTa', 'Admin', 'User', NULL, NULL, NULL, '/uploads/admin-profile-pictures/1/admin_profile_picture_1748434138033.png', 'admin', 'active', 1, 1, '2025-05-28 12:08:29', '2025-05-20 11:23:57', '2025-05-28 12:08:58', 1, 1),
(3, 'serviceprovider@rainbowpaws.com', '$2b$10$o5Z8B7.WqzcOecJ4Nq51DO869mMmTFAGZc5IDv6J.3Ym6zIRWiwh.', 'Justin', 'Sibonga', 'asdsd', 'Capitol Compound, Tenejero', NULL, '/uploads/profile-pictures/3/profile_picture_1748414400315.png', 'business', 'active', 1, 1, '2025-05-28 12:14:00', '2025-05-23 01:56:11', '2025-05-28 12:25:35', 1, 1),
(4, 'justinmarlosibonga@gmail.com', '$2b$10$UXFbMPTzFCT6Sis8RdKLAe64O6Bp2tJ1Rzt4BxH5khjTQyw3aIFRC', 'Justin', 'Sibonga', NULL, 'Balanga, Bataan', NULL, '/uploads/profile-pictures/4/profile_picture_1748219297693.png', 'fur_parent', 'active', 1, 1, '2025-05-28 13:12:21', '2025-05-24 02:36:37', '2025-05-28 13:12:21', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_restrictions`
--

CREATE TABLE `user_restrictions` (
  `restriction_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `restriction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `duration` varchar(50) DEFAULT 'indefinite',
  `report_count` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_restrictions`
--

INSERT INTO `user_restrictions` (`restriction_id`, `user_id`, `reason`, `restriction_date`, `duration`, `report_count`, `is_active`) VALUES
(4, 4, 'Restricted by admin', '2025-05-28 11:45:41', 'indefinite', 0, 0),
(5, 4, 'Restricted by admin', '2025-05-28 11:45:52', 'indefinite', 0, 0),
(6, 3, 'Restricted by admin', '2025-05-28 11:51:41', 'indefinite', 0, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `entity_type` (`entity_type`,`entity_id`),
  ADD KEY `action` (`action`);

--
-- Indexes for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `username` (`username`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `package_id` (`package_id`),
  ADD KEY `pet_id` (`pet_id`),
  ADD KEY `idx_bookings_user` (`user_id`),
  ADD KEY `idx_bookings_provider` (`provider_id`),
  ADD KEY `idx_bookings_status` (`status`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `attempt_type` (`attempt_type`),
  ADD KEY `attempt_time` (`attempt_time`);

--
-- Indexes for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `otp_code` (`otp_code`),
  ADD KEY `expires_at` (`expires_at`),
  ADD KEY `is_used` (`is_used`);

--
-- Indexes for table `package_addons`
--
ALTER TABLE `package_addons`
  ADD PRIMARY KEY (`addon_id`),
  ADD KEY `package_id` (`package_id`);

--
-- Indexes for table `package_images`
--
ALTER TABLE `package_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `package_id` (`package_id`);

--
-- Indexes for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  ADD PRIMARY KEY (`inclusion_id`),
  ADD KEY `package_id` (`package_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_token` (`token`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_id` (`booking_id`),
  ADD KEY `idx_source_id` (`source_id`),
  ADD KEY `idx_payment_intent_id` (`payment_intent_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_method` (`payment_method`);

--
-- Indexes for table `pets`
--
ALTER TABLE `pets`
  ADD PRIMARY KEY (`pet_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `provider_availability`
--
ALTER TABLE `provider_availability`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `provider_date_unique` (`provider_id`,`date`);

--
-- Indexes for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `provider_id` (`provider_id`,`date`);

--
-- Indexes for table `rate_limits`
--
ALTER TABLE `rate_limits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_identifier_action` (`identifier`,`action`),
  ADD KEY `idx_window_start` (`window_start`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_booking_review` (`booking_id`);

--
-- Indexes for table `service_bookings`
--
ALTER TABLE `service_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_service_bookings_user` (`user_id`),
  ADD KEY `idx_service_bookings_provider` (`provider_id`),
  ADD KEY `idx_service_bookings_package` (`package_id`),
  ADD KEY `idx_service_bookings_status` (`status`),
  ADD KEY `idx_service_bookings_date` (`booking_date`);

--
-- Indexes for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD PRIMARY KEY (`package_id`),
  ADD KEY `idx_service_packages_provider` (`provider_id`);

--
-- Indexes for table `service_providers`
--
ALTER TABLE `service_providers`
  ADD PRIMARY KEY (`provider_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_service_providers_type` (`provider_type`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- Indexes for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  ADD PRIMARY KEY (`restriction_id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_logs`
--
ALTER TABLE `admin_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `package_addons`
--
ALTER TABLE `package_addons`
  MODIFY `addon_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `package_images`
--
ALTER TABLE `package_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `pet_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `provider_availability`
--
ALTER TABLE `provider_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=210;

--
-- AUTO_INCREMENT for table `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=439;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `service_bookings`
--
ALTER TABLE `service_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `service_providers`
--
ALTER TABLE `service_providers`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  MODIFY `restriction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`provider_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`pet_id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  ADD CONSTRAINT `otp_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD CONSTRAINT `otp_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `package_addons`
--
ALTER TABLE `package_addons`
  ADD CONSTRAINT `package_addons_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `package_images`
--
ALTER TABLE `package_images`
  ADD CONSTRAINT `package_images_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  ADD CONSTRAINT `package_inclusions_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `service_bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pets`
--
ALTER TABLE `pets`
  ADD CONSTRAINT `pets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD CONSTRAINT `service_packages_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`provider_id`) ON DELETE CASCADE;

--
-- Constraints for table `service_providers`
--
ALTER TABLE `service_providers`
  ADD CONSTRAINT `service_providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  ADD CONSTRAINT `user_restrictions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
