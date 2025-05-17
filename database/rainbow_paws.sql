-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 17, 2025 at 02:09 PM
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
-- Table structure for table `admin_notifications`
--

CREATE TABLE `admin_notifications` (
  `id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_notifications`
--

INSERT INTO `admin_notifications` (`id`, `type`, `title`, `message`, `entity_type`, `entity_id`, `link`, `is_read`, `created_at`) VALUES
(1, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 9, '/admin/applications/9', 0, '2025-05-14 06:26:08'),
(2, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 10, '/admin/applications/10', 0, '2025-05-14 06:38:08'),
(3, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 9, '/admin/applications/9', 0, '2025-05-14 15:10:01'),
(4, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 10, '/admin/applications/10', 0, '2025-05-14 17:32:31'),
(5, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 12, '/admin/applications/12', 0, '2025-05-15 23:25:47'),
(6, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 13, '/admin/applications/13', 0, '2025-05-16 00:04:22'),
(7, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 14, '/admin/applications/14', 0, '2025-05-16 00:54:30'),
(8, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 15, '/admin/applications/15', 0, '2025-05-17 11:54:28');

-- --------------------------------------------------------

--
-- Table structure for table `admin_profiles`
--

CREATE TABLE `admin_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `admin_role` enum('super_admin','admin','moderator') DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `business_service_id` int(11) NOT NULL,
  `booking_date` date NOT NULL,
  `booking_time` time NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL,
  `special_requests` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `business_application_stats`
-- (See below for the actual view)
--
CREATE TABLE `business_application_stats` (
`total` bigint(21)
,`approved` decimal(22,0)
,`pending` decimal(22,0)
,`declined` decimal(22,0)
,`restricted` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error') NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `link`, `created_at`, `updated_at`) VALUES
(78, 44, 'Application Approved', 'Your business application for business has been approved. You can now start offering services.', 'success', 1, '/business/dashboard', '2025-05-14 17:33:47', '2025-05-14 17:38:49'),
(79, 44, 'Application Approved', 'Your business application for business has been approved.', 'success', 1, '/cremation/dashboard', '2025-05-14 17:33:49', '2025-05-14 17:38:49'),
(80, 44, 'Application Approved', 'Your business application for business has been approved. You can now start offering services.', 'success', 1, '/business/dashboard', '2025-05-14 17:35:51', '2025-05-14 17:38:49'),
(81, 44, 'Application Approved', 'Your business application for business has been approved.', 'success', 1, '/cremation/dashboard', '2025-05-14 17:35:54', '2025-05-14 17:38:49'),
(90, 52, 'Application Approved', 'Your business application for business has been approved. You can now start offering services.', 'success', 0, '/business/dashboard', '2025-05-17 11:55:27', '2025-05-17 11:55:27'),
(91, 52, 'Application Approved', 'Your business application for business has been approved.', 'success', 0, '/cremation/dashboard', '2025-05-17 11:55:30', '2025-05-17 11:55:30');

-- --------------------------------------------------------

--
-- Table structure for table `otp_attempts`
--

CREATE TABLE `otp_attempts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `attempt_type` enum('verify','generate') NOT NULL,
  `attempt_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `otp_attempts`
--

INSERT INTO `otp_attempts` (`id`, `user_id`, `attempt_type`, `attempt_time`, `ip_address`) VALUES
(76, 44, 'generate', '2025-05-14 17:32:34', '::ffff:192.168.56.1'),
(96, 51, 'generate', '2025-05-17 11:35:51', '::1'),
(97, 51, 'generate', '2025-05-17 11:36:05', '::1'),
(98, 51, 'verify', '2025-05-17 11:36:20', '::1'),
(99, 52, 'generate', '2025-05-17 11:54:31', '::1');

-- --------------------------------------------------------

--
-- Table structure for table `otp_codes`
--

CREATE TABLE `otp_codes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `otp_codes`
--

INSERT INTO `otp_codes` (`id`, `user_id`, `otp_code`, `expires_at`, `is_used`, `created_at`) VALUES
(57, 44, '691270', '2025-05-15 01:42:34', 0, '2025-05-14 17:32:34'),
(70, 51, '962258', '2025-05-17 19:45:51', 1, '2025-05-17 11:35:51'),
(71, 51, '815169', '2025-05-17 19:46:05', 1, '2025-05-17 11:36:05'),
(72, 52, '458292', '2025-05-17 20:04:31', 0, '2025-05-17 11:54:31');

-- --------------------------------------------------------

--
-- Table structure for table `package_addons`
--

CREATE TABLE `package_addons` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `package_addons`
--

INSERT INTO `package_addons` (`id`, `package_id`, `description`, `price`, `created_at`) VALUES
(63, 53, 'asd', NULL, '2025-05-17 12:05:22');

-- --------------------------------------------------------

--
-- Table structure for table `package_images`
--

CREATE TABLE `package_images` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `image_id` varchar(100) DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `package_images`
--

INSERT INTO `package_images` (`id`, `package_id`, `image_path`, `image_id`, `display_order`, `created_at`) VALUES
(63, 53, '/uploads/packages/53/package_15_1747483513009.png', NULL, 0, '2025-05-17 12:05:22');

-- --------------------------------------------------------

--
-- Table structure for table `package_inclusions`
--

CREATE TABLE `package_inclusions` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `package_inclusions`
--

INSERT INTO `package_inclusions` (`id`, `package_id`, `description`, `created_at`) VALUES
(99, 53, '42323', '2025-05-17 12:05:22');

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

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `user_id`, `token`, `created_at`, `expires_at`, `is_used`) VALUES
(5, 49, 'e58f1fa7b3fdd970a7a35074197cc7da62a4f0c2d41996ac8952abe1f0ab64a8', '2025-05-16 17:49:14', '2025-05-17 02:49:14', 0);

-- --------------------------------------------------------

--
-- Table structure for table `pets`
--

CREATE TABLE `pets` (
  `id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `species` varchar(100) NOT NULL,
  `breed` varchar(255) DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
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

INSERT INTO `pets` (`id`, `user_id`, `name`, `species`, `breed`, `gender`, `age`, `weight`, `photo_path`, `special_notes`, `created_at`, `updated_at`) VALUES
(16, '49', 'asdsd', 'Cat', 'asdsd', 'Male', '232', 2323.00, '/uploads/pets/pet_asdsd_49_1747408411330.png', 'asdad', '2025-05-16 15:13:32', '2025-05-16 15:13:32'),
(17, '49', 'asdasd', 'Dog', 'asdsdd', 'Male', '2', 222.00, '/uploads/pets/pet_asdasd_49_1747410183760.png', 'asdasd', '2025-05-16 15:43:04', '2025-05-16 15:43:04'),
(18, '49', 'eawesdasd', 'Dog', 'asdasd', 'Male', '2323', 232.00, '/uploads/pets/pet_eawesdasd_49_1747414174062.png', 'asdsdasd', '2025-05-16 16:49:35', '2025-05-16 16:49:35'),
(19, '49', 'asdasd', 'Dog', 'asdasd', 'Female', '323', 231.00, '/uploads/pets/pet_asdasd_49_1747459910539.png', 'asdas', '2025-05-17 05:31:50', '2025-05-17 05:31:50'),
(20, '49', 'asdasdasd', 'Dog', 'asdasd', 'Male', 'asdasdasd', 23.00, '/uploads/pets/pet_asdasdasd_49_1747463295515.png', 'asdasd', '2025-05-17 06:28:16', '2025-05-17 06:28:16'),
(21, '49', 'asdasd', 'Dog', 'asdasd', NULL, '2323', 122.00, '/uploads/pets/pet_asdasd_49_1747465179936.png', 'asdasd', '2025-05-17 06:59:41', '2025-05-17 06:59:41'),
(22, '49', 'asdsdsd', 'Dog', 'asdsdsd', 'Male', '23', 234.00, '/uploads/pets/pet_asdsdsd_49_1747473790939.png', 'asdasd', '2025-05-17 09:23:12', '2025-05-17 09:23:12'),
(23, '49', 'asdasda', 'Dog', 'asdasd', 'Male', '3', 213.00, '/uploads/pets/pet_asdasda_49_1747477737214.png', 'asdasd', '2025-05-17 10:28:57', '2025-05-17 10:28:57'),
(24, '49', 'asdasd', 'Dog', 'asd', 'Female', '23', 1.80, NULL, 'asd', '2025-05-17 10:55:19', '2025-05-17 10:55:19'),
(25, '49', 'dasdas', 'Dog', 'asdsd', NULL, NULL, NULL, NULL, NULL, '2025-05-17 11:17:33', '2025-05-17 11:17:33'),
(26, '51', 'asdasd', 'Dog', NULL, NULL, NULL, NULL, '/uploads/pets/pet_asdasd_51_1747483615346.png', NULL, '2025-05-17 12:06:55', '2025-05-17 12:06:55');

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
(88, 14, '2025-05-20', 1, '2025-05-17 09:01:11', '2025-05-17 09:01:11'),
(89, 14, '2025-05-21', 1, '2025-05-17 09:07:48', '2025-05-17 09:07:48'),
(92, 14, '2025-05-22', 1, '2025-05-17 10:18:53', '2025-05-17 10:18:53'),
(93, 15, '2025-05-21', 1, '2025-05-17 12:05:36', '2025-05-17 12:05:36');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `available_services` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `provider_time_slots`
--

INSERT INTO `provider_time_slots` (`id`, `provider_id`, `date`, `start_time`, `end_time`, `created_at`, `updated_at`, `available_services`) VALUES
(75, 14, '2025-05-22', '09:00:00', '10:00:00', '2025-05-17 10:18:53', '2025-05-17 10:18:53', '[52]'),
(76, 15, '2025-05-21', '09:00:00', '10:00:00', '2025-05-17 12:05:36', '2025-05-17 12:05:36', '[53]');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `service_provider_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_bookings`
--

CREATE TABLE `service_bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `pet_id` int(11) DEFAULT NULL,
  `booking_date` date DEFAULT NULL,
  `booking_time` time DEFAULT NULL,
  `status` enum('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
  `special_requests` text DEFAULT NULL,
  `pet_name` varchar(255) DEFAULT NULL,
  `pet_type` varchar(255) DEFAULT NULL,
  `pet_image_url` varchar(255) DEFAULT NULL,
  `cause_of_death` varchar(255) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'cash',
  `delivery_option` varchar(50) DEFAULT 'pickup',
  `delivery_address` text DEFAULT NULL,
  `delivery_distance` float DEFAULT 0,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_bookings`
--

INSERT INTO `service_bookings` (`id`, `user_id`, `provider_id`, `package_id`, `pet_id`, `booking_date`, `booking_time`, `status`, `special_requests`, `pet_name`, `pet_type`, `pet_image_url`, `cause_of_death`, `payment_method`, `delivery_option`, `delivery_address`, `delivery_distance`, `delivery_fee`, `price`, `created_at`, `updated_at`) VALUES
(26, 51, 15, 53, 26, '2025-05-21', '09:00:00', 'completed', NULL, 'asdasd', 'Dog', '/uploads/pets/pet_asdasd_51_1747483615346.png', NULL, 'gcash', 'pickup', NULL, 0, 0.00, 234.00, '2025-05-17 12:06:58', '2025-05-17 12:08:08');

-- --------------------------------------------------------

--
-- Table structure for table `service_packages`
--

CREATE TABLE `service_packages` (
  `id` int(11) NOT NULL,
  `service_provider_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` enum('Private','Communal') DEFAULT 'Private',
  `cremation_type` enum('Standard','Premium','Deluxe') DEFAULT 'Standard',
  `processing_time` varchar(50) DEFAULT '1-2 days',
  `price` decimal(10,2) NOT NULL,
  `delivery_fee_per_km` decimal(10,2) DEFAULT 0.00,
  `conditions` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_packages`
--

INSERT INTO `service_packages` (`id`, `service_provider_id`, `name`, `description`, `category`, `cremation_type`, `processing_time`, `price`, `delivery_fee_per_km`, `conditions`, `is_active`, `created_at`, `updated_at`) VALUES
(53, 15, 'asdas', 'asda', 'Private', 'Standard', '1-2 days', 234.00, 0.00, 'asdasdasd', 1, '2025-05-17 12:05:22', '2025-05-17 12:05:22');

-- --------------------------------------------------------

--
-- Table structure for table `service_providers`
--

CREATE TABLE `service_providers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `provider_type` enum('cremation','memorial','veterinary') NOT NULL,
  `contact_first_name` varchar(50) NOT NULL,
  `contact_last_name` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `province` varchar(50) NOT NULL,
  `city` varchar(50) NOT NULL,
  `zip` varchar(20) NOT NULL,
  `hours` text DEFAULT NULL,
  `service_description` text DEFAULT NULL,
  `application_status` enum('pending','declined','approved','restricted') NOT NULL DEFAULT 'pending',
  `verification_date` timestamp NULL DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `bir_certificate_path` varchar(255) DEFAULT NULL,
  `business_permit_path` varchar(255) DEFAULT NULL,
  `government_id_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `active_service_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Note: verification_status is deprecated, use application_status instead';

--
-- Dumping data for table `service_providers`
--

INSERT INTO `service_providers` (`id`, `user_id`, `name`, `provider_type`, `contact_first_name`, `contact_last_name`, `phone`, `address`, `province`, `city`, `zip`, `hours`, `service_description`, `application_status`, `verification_date`, `verification_notes`, `bir_certificate_path`, `business_permit_path`, `government_id_path`, `created_at`, `updated_at`, `active_service_count`) VALUES
(15, 52, 'business', 'cremation', 'Justin', 'Sibonga', '1111111', 'BPSU', 'Bataan', 'Balanga City', '2100', 'business', 'asdasdasd', 'approved', '2025-05-17 11:55:27', 'Application approved', '/uploads/businesses/52/bir_certificate_1747482876383.png', '/uploads/businesses/52/business_permit_1747482875900.png', '/uploads/businesses/52/government_id_1747482876518.png', '2025-05-17 11:54:28', '2025-05-17 11:55:27', 0);

-- --------------------------------------------------------

--
-- Table structure for table `successful_bookings`
--

CREATE TABLE `successful_bookings` (
  `id` int(11) NOT NULL,
  `booking_id` varchar(50) NOT NULL,
  `service_package_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `transaction_amount` decimal(10,2) NOT NULL,
  `payment_date` datetime NOT NULL,
  `payment_status` enum('completed','refunded','partial','cancelled') NOT NULL DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `successful_bookings`
--

INSERT INTO `successful_bookings` (`id`, `booking_id`, `service_package_id`, `user_id`, `provider_id`, `transaction_amount`, `payment_date`, `payment_status`, `created_at`, `updated_at`) VALUES
(7, '26', 53, 51, 15, 234.00, '2025-05-17 20:08:08', 'completed', '2025-05-17 12:08:08', '2025-05-17 12:08:08');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `sex` varchar(20) DEFAULT NULL,
  `role` enum('fur_parent','business','admin') NOT NULL DEFAULT 'fur_parent',
  `status` enum('active','inactive','suspended','restricted') NOT NULL DEFAULT 'active',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_otp_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `phone_number`, `address`, `sex`, `role`, `status`, `is_verified`, `is_otp_verified`, `created_at`, `updated_at`, `last_login`) VALUES
(44, 'admin@rainbowpaws.com', '$2b$10$CPyPK.A9FBeSkzotK0Zt6e3UW2NOqaQ.ovwjz/wt/tDgNWXIocV.W', 'System', 'Admin', 'asdasd', 'BPSU', 'male', 'admin', 'active', 1, 1, '2025-05-14 17:32:31', '2025-05-17 11:54:56', '2025-05-17 11:54:56'),
(50, 'furparent@example.com', 'password123', 'Sample', 'User', NULL, NULL, NULL, '', 'active', 0, 0, '2025-05-16 02:27:43', '2025-05-16 02:27:43', NULL),
(51, 'justinmarlosibonga@gmail.com', '$2b$10$EDw8VfhHwWghWb71k7MTFOSpNaHz243KiNPj7ysjsP5CjM4EKtwpa', 'Justin', 'Sibonga', '1111111', 'Samal Bataan', 'male', 'fur_parent', 'active', 0, 1, '2025-05-17 11:35:48', '2025-05-17 12:05:50', '2025-05-17 12:05:50'),
(52, 'serviceprovider@rainbowpaws.com', '$2b$10$.ijgzJXjYMCLjrF89QFt3O8ONaAnoTRhbv/qIRUYSTWoOwXBNF8hG', 'Justin', 'Sibonga', '1111111', 'BPSU', NULL, 'business', 'active', 1, 0, '2025-05-17 11:54:28', '2025-05-17 12:07:25', '2025-05-17 12:07:25');

-- --------------------------------------------------------

--
-- Table structure for table `user_restrictions`
--

CREATE TABLE `user_restrictions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `restriction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `duration` varchar(50) DEFAULT 'indefinite',
  `report_count` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure for view `business_application_stats`
--
DROP TABLE IF EXISTS `business_application_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `business_application_stats`  AS SELECT count(0) AS `total`, sum(case when `service_providers`.`application_status` = 'approved' then 1 else 0 end) AS `approved`, sum(case when `service_providers`.`application_status` = 'pending' then 1 else 0 end) AS `pending`, sum(case when `service_providers`.`application_status` = 'declined' then 1 else 0 end) AS `declined`, sum(case when `service_providers`.`application_status` = 'restricted' then 1 else 0 end) AS `restricted` FROM `service_providers` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `business_service_id` (`business_service_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `package_addons`
--
ALTER TABLE `package_addons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_addons_ibfk_1` (`package_id`),
  ADD KEY `idx_package_addons_package` (`package_id`);

--
-- Indexes for table `package_images`
--
ALTER TABLE `package_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_images_ibfk_1` (`package_id`),
  ADD KEY `idx_package_images_package` (`package_id`);

--
-- Indexes for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_inclusions_ibfk_1` (`package_id`),
  ADD KEY `idx_package_inclusions_package` (`package_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pets`
--
ALTER TABLE `pets`
  ADD PRIMARY KEY (`id`),
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
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `service_provider_id` (`service_provider_id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `service_bookings`
--
ALTER TABLE `service_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `package_id` (`package_id`),
  ADD KEY `fk_pet_id` (`pet_id`);

--
-- Indexes for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_provider_id` (`service_provider_id`);

--
-- Indexes for table `service_providers`
--
ALTER TABLE `service_providers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `successful_bookings`
--
ALTER TABLE `successful_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_package_id` (`service_package_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `provider_id` (`provider_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `package_addons`
--
ALTER TABLE `package_addons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `package_images`
--
ALTER TABLE `package_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `provider_availability`
--
ALTER TABLE `provider_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=94;

--
-- AUTO_INCREMENT for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_bookings`
--
ALTER TABLE `service_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `service_providers`
--
ALTER TABLE `service_providers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `successful_bookings`
--
ALTER TABLE `successful_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`business_service_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  ADD CONSTRAINT `otp_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD CONSTRAINT `otp_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `package_addons`
--
ALTER TABLE `package_addons`
  ADD CONSTRAINT `package_addons_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `package_images`
--
ALTER TABLE `package_images`
  ADD CONSTRAINT `package_images_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  ADD CONSTRAINT `package_inclusions_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `service_bookings`
--
ALTER TABLE `service_bookings`
  ADD CONSTRAINT `fk_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `service_bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `service_bookings_ibfk_2` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD CONSTRAINT `service_packages_ibfk_1` FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `service_providers`
--
ALTER TABLE `service_providers`
  ADD CONSTRAINT `service_providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `successful_bookings`
--
ALTER TABLE `successful_bookings`
  ADD CONSTRAINT `successful_bookings_ibfk_1` FOREIGN KEY (`service_package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `successful_bookings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `successful_bookings_ibfk_3` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  ADD CONSTRAINT `user_restrictions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
