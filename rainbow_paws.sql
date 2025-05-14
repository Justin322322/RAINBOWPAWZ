-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 14, 2025 at 08:10 AM
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

--
-- Dumping data for table `admin_profiles`
--

INSERT INTO `admin_profiles` (`id`, `user_id`, `username`, `full_name`, `admin_role`, `created_at`, `updated_at`) VALUES
(5, 19, 'testadmin', 'Test Admin', 'super_admin', '2025-05-11 14:42:55', '2025-05-11 14:42:55');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pet_id` int(11) NOT NULL,
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
-- Table structure for table `email_queue`
--

CREATE TABLE `email_queue` (
  `id` int(11) NOT NULL,
  `to_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `html` text NOT NULL,
  `text` text DEFAULT NULL,
  `from_email` varchar(255) DEFAULT NULL,
  `cc` varchar(255) DEFAULT NULL,
  `bcc` varchar(255) DEFAULT NULL,
  `attachments` text DEFAULT NULL,
  `status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `error` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sent_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(55, 33, 'Application Approved', 'Your business application for Eternal Companions has been approved. You can now start offering services.', 'success', 0, '/business/dashboard', '2025-05-14 05:59:18', '2025-05-14 05:59:18'),
(56, 33, 'Application Approved', 'Your business application for Eternal Companions has been approved.', 'success', 0, '/cremation/dashboard', '2025-05-14 05:59:22', '2025-05-14 05:59:22');

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
(56, 30, 'generate', '2025-05-13 22:41:10', '::ffff:192.168.56.1'),
(57, 30, 'verify', '2025-05-13 22:41:24', '::ffff:192.168.56.1');

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
(42, 30, '106969', '2025-05-14 06:51:10', 1, '2025-05-13 22:41:10');

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
(23, 21, 'Personalized nameplate', 500.00, '2025-05-13 22:58:24'),
(24, 21, 'Photo frame', 800.00, '2025-05-13 22:58:24'),
(25, 22, 'Memorial video', 1200.00, '2025-05-13 22:58:24'),
(26, 22, 'Additional urns', 1500.00, '2025-05-13 22:58:24'),
(27, 23, 'Memorial jewelry', 2000.00, '2025-05-13 22:58:24'),
(28, 23, 'Canvas portrait', 2500.00, '2025-05-13 22:58:24'),
(29, 24, 'Tree planting ceremony', 1200.00, '2025-05-13 22:58:24'),
(30, 24, 'Memorial garden stone', 900.00, '2025-05-13 22:58:24'),
(31, 25, 'Memorial tree planting', 2000.00, '2025-05-13 22:58:24'),
(32, 25, 'Biodegradable water burial urn', 1500.00, '2025-05-13 22:58:24'),
(33, 26, 'Video tribute', 1800.00, '2025-05-13 22:58:24'),
(34, 26, 'Custom memorial garden', 3500.00, '2025-05-13 22:58:24'),
(35, 27, 'Personalized photo frame', 700.00, '2025-05-13 22:58:24'),
(36, 27, 'Memorial candle', 500.00, '2025-05-13 22:58:24'),
(37, 28, 'Memorial video montage', 1500.00, '2025-05-13 22:58:24'),
(38, 28, 'Additional keepsake urns', 1200.00, '2025-05-13 22:58:24'),
(39, 29, 'Custom memorial jewelry', 2200.00, '2025-05-13 22:58:24'),
(40, 29, 'Memorial garden stone', 1800.00, '2025-05-13 22:58:24');

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
(2, 21, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(3, 21, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(4, 21, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(5, 22, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(6, 22, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(7, 22, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(8, 23, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(9, 23, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(10, 23, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(11, 24, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(12, 24, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(13, 24, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(14, 25, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(15, 25, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(16, 25, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(17, 26, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(18, 26, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(19, 26, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(20, 27, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(21, 27, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(22, 27, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(23, 28, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(24, 28, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(25, 28, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24'),
(26, 29, '/bg_2.png', NULL, 0, '2025-05-13 22:58:24'),
(27, 29, '/bg_3.png', NULL, 1, '2025-05-13 22:58:24'),
(28, 29, '/bg_4.png', NULL, 2, '2025-05-13 22:58:24');

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
(25, 21, 'Standard clay urn', '2025-05-13 22:58:24'),
(26, 21, 'Memorial certificate', '2025-05-13 22:58:24'),
(27, 21, 'Paw print impression', '2025-05-13 22:58:24'),
(28, 22, 'Wooden urn with nameplate', '2025-05-13 22:58:24'),
(29, 22, 'Memorial certificate', '2025-05-13 22:58:24'),
(30, 22, 'Paw print impression', '2025-05-13 22:58:24'),
(31, 22, 'Fur clipping', '2025-05-13 22:58:24'),
(32, 23, 'Custom wooden urn', '2025-05-13 22:58:24'),
(33, 23, 'Memorial service', '2025-05-13 22:58:24'),
(34, 23, 'Photo memorial', '2025-05-13 22:58:24'),
(35, 23, 'Paw print keepsake', '2025-05-13 22:58:24'),
(36, 23, 'Fur clipping', '2025-05-13 22:58:24'),
(37, 24, 'Biodegradable urn', '2025-05-13 22:58:24'),
(38, 24, 'Plantable memorial card', '2025-05-13 22:58:24'),
(39, 24, 'Digital memorial', '2025-05-13 22:58:24'),
(40, 25, 'Bamboo urn', '2025-05-13 22:58:24'),
(41, 25, 'Seed paper memorial card', '2025-05-13 22:58:24'),
(42, 25, 'Paw print in clay', '2025-05-13 22:58:24'),
(43, 25, 'Digital memorial album', '2025-05-13 22:58:24'),
(44, 26, 'Choice of sustainable urn', '2025-05-13 22:58:24'),
(45, 26, 'Memorial service', '2025-05-13 22:58:24'),
(46, 26, 'Photo tribute', '2025-05-13 22:58:24'),
(47, 26, 'Paw print keepsake', '2025-05-13 22:58:24'),
(48, 26, 'Memorial planting', '2025-05-13 22:58:24'),
(49, 27, 'Simple ceramic urn', '2025-05-13 22:58:24'),
(50, 27, 'Memorial certificate', '2025-05-13 22:58:24'),
(51, 27, 'Digital photo tribute', '2025-05-13 22:58:24'),
(52, 28, 'Personalized wooden urn', '2025-05-13 22:58:24'),
(53, 28, 'Memorial certificate', '2025-05-13 22:58:24'),
(54, 28, 'Paw print keepsake', '2025-05-13 22:58:24'),
(55, 28, 'Fur clipping in glass vial', '2025-05-13 22:58:24'),
(56, 29, 'Custom engraved wooden urn', '2025-05-13 22:58:24'),
(57, 29, 'Memorial service at home or facility', '2025-05-13 22:58:24'),
(58, 29, 'Framed photo memorial', '2025-05-13 22:58:24'),
(59, 29, 'Paw print in clay', '2025-05-13 22:58:24'),
(60, 29, 'Fur clipping in keepsake locket', '2025-05-13 22:58:24');

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
-- Table structure for table `pets`
--

CREATE TABLE `pets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `species` varchar(50) NOT NULL,
  `breed` varchar(50) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `special_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pets`
--

INSERT INTO `pets` (`id`, `user_id`, `name`, `species`, `breed`, `age`, `gender`, `weight`, `photo_path`, `special_notes`, `created_at`, `updated_at`) VALUES
(4, 30, 'Max', 'Dog', 'Golden Retriever', NULL, 'Male', 30.00, NULL, 'Friendly and loves to play fetch.', '2025-05-13 23:12:34', '2025-05-13 23:12:34'),
(5, 30, 'Luna', 'Cat', 'Siamese', NULL, 'Female', 4.50, NULL, 'Quiet and loves to sleep in sunny spots.', '2025-05-13 23:12:34', '2025-05-13 23:12:34'),
(6, 30, 'Buddy', 'Dog', 'Labrador', 5, 'Male', 32.00, NULL, NULL, '2025-05-13 23:12:34', '2025-05-13 23:23:09');

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
  `conditions` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `duration_minutes` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_packages`
--

INSERT INTO `service_packages` (`id`, `service_provider_id`, `name`, `description`, `category`, `cremation_type`, `processing_time`, `price`, `conditions`, `is_active`, `duration_minutes`, `created_at`, `updated_at`) VALUES
(21, 6, 'Basic Cremation', 'Simple cremation service with standard urn', 'Communal', 'Standard', '2-3 days', 3500.00, 'For pets up to 50 lbs. Additional fees may apply for larger pets.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(22, 6, 'Premium Cremation', 'Private cremation with premium urn and memorial certificate', 'Private', 'Premium', '1-2 days', 5500.00, 'Available for all pet sizes. Viewing options available upon request.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(23, 6, 'Deluxe Package', 'Private cremation with wooden urn and memorial service', 'Private', 'Deluxe', 'Same day', 6000.00, 'Includes private viewing room for family. 24-hour service available.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(24, 7, 'Eco-Friendly Basic', 'Environmentally conscious cremation with biodegradable urn', 'Communal', 'Standard', '2-3 days', 3800.00, 'For pets up to 40 lbs. Additional fees may apply for larger pets.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(25, 7, 'Private Eco-Cremation', 'Private cremation with sustainable memorial options', 'Private', 'Premium', '1-2 days', 5800.00, 'Available for all pet sizes. Carbon offset included in price.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(26, 7, 'Legacy Memorial', 'Comprehensive memorial service with sustainable options', 'Private', 'Deluxe', 'Same day', 7500.00, 'Includes private viewing room and memorial planning assistance.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(27, 8, 'Simple Farewell', 'Basic communal cremation service with memorial keepsake', 'Communal', 'Standard', '2-3 days', 3200.00, 'For pets up to 60 lbs. 24/7 pickup service available.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(28, 8, 'Private Remembrance', 'Individual cremation with personalized memorial options', 'Private', 'Premium', '1-2 days', 5200.00, 'All pet sizes welcome. Includes home pickup service within Bataan.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(29, 8, 'Forever Memorial', 'Comprehensive private cremation with custom memorial service', 'Private', 'Deluxe', 'Same day', 6800.00, 'Includes 24/7 service, home pickup, and private viewing options.', 1, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24');

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
  `verification_status` enum('pending','verified','rejected','restricted') NOT NULL DEFAULT 'pending',
  `status` varchar(50) DEFAULT 'active',
  `verification_date` timestamp NULL DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `bir_certificate_path` varchar(255) DEFAULT NULL,
  `business_permit_path` varchar(255) DEFAULT NULL,
  `government_id_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_providers`
--

INSERT INTO `service_providers` (`id`, `user_id`, `name`, `provider_type`, `contact_first_name`, `contact_last_name`, `phone`, `address`, `province`, `city`, `zip`, `hours`, `service_description`, `verification_status`, `status`, `verification_date`, `verification_notes`, `bir_certificate_path`, `business_permit_path`, `government_id_path`, `created_at`, `updated_at`) VALUES
(5, 30, 'business', 'cremation', 'Justin', 'Sibonga', '1111111', 'Capitol Compound, Tenejero', 'Bataan', 'Balanga City', '2100', 'business', 'asdasdasd', 'verified', 'active', '2025-05-13 07:24:30', 'Application approved', '/uploads/businesses/30/bir_certificate_1747116844093.png', '/uploads/businesses/30/business_permit_1747116844102.png', '/uploads/businesses/30/government_id_1747116844107.png', '2025-05-13 06:13:57', '2025-05-13 07:28:10'),
(6, 31, 'Rainbow Bridge Pet Cremation', 'cremation', 'Admin', 'Rainbow', '09123456789', 'Capitol Drive, Balanga City, Bataan, Philippines', 'Bataan', 'Balanga City', '2100', 'Monday-Friday: 8:00 AM - 5:00 PM, Saturday: 8:00 AM - 12:00 PM, Sunday: Closed', 'Compassionate pet cremation services with personalized memorials. We provide dignified and respectful end-of-life care for your beloved companions. Our team understands the deep bond between pets and their families, and we strive to honor that connection through our thoughtful services.', 'verified', 'active', NULL, NULL, NULL, NULL, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(7, 32, 'Peaceful Paws Memorial', 'cremation', 'Admin', 'Peaceful', '09234567890', 'Tuyo, Balanga City, Bataan, Philippines', 'Bataan', 'Balanga City', '2100', 'Monday-Saturday: 9:00 AM - 6:00 PM, Sunday: By appointment only', 'Dignified pet cremation with eco-friendly options. We focus on providing environmentally conscious memorial services while honoring your pet with the respect they deserve. Our facility is designed to provide a peaceful setting for families during this difficult time.', 'verified', 'active', NULL, NULL, NULL, NULL, NULL, '2025-05-13 22:58:24', '2025-05-13 22:58:24'),
(8, 33, 'Eternal Companions', 'cremation', 'Admin', 'Eternal', '09345678901', 'Tenejero, Balanga City, Bataan, Philippines', 'Bataan', 'Balanga City', '2100', 'Monday-Sunday: 24/7 Service Available', 'Honoring your pet with respectful cremation services. We offer 24/7 service to ensure your beloved companion receives timely and compassionate care. Our dedicated team is committed to providing support during this difficult time.', 'restricted', 'restricted', '2025-05-14 05:59:18', 'Application approved', NULL, NULL, NULL, '2025-05-13 22:58:24', '2025-05-14 06:09:25');

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
  `payment_status` enum('completed','refunded','partial') NOT NULL DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `successful_bookings`
--

INSERT INTO `successful_bookings` (`id`, `booking_id`, `service_package_id`, `user_id`, `provider_id`, `transaction_amount`, `payment_date`, `payment_status`, `created_at`, `updated_at`) VALUES
(21, 'BK-2023-001', 1, 2, 1, 3500.00, '2023-10-15 14:30:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(22, 'BK-2023-002', 2, 3, 1, 4200.00, '2023-10-18 09:45:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(23, 'BK-2023-003', 1, 4, 1, 3500.00, '2023-10-20 16:15:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(24, 'BK-2023-004', 3, 2, 2, 2800.00, '2023-10-25 11:30:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(25, 'BK-2023-005', 2, 5, 1, 4200.00, '2023-11-02 13:20:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(26, 'BK-2023-006', 4, 3, 2, 5100.00, '2023-11-05 10:00:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(27, 'BK-2023-007', 1, 6, 1, 3500.00, '2023-11-10 15:45:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(28, 'BK-2023-008', 3, 4, 2, 2800.00, '2023-11-15 09:30:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(29, 'BK-2023-009', 2, 2, 1, 4200.00, '2023-11-20 14:15:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(30, 'BK-2023-010', 4, 5, 2, 5100.00, '2023-11-25 11:00:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(31, 'BK-2023-011', 1, 3, 1, 3500.00, '2023-12-01 16:30:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(32, 'BK-2023-012', 3, 6, 2, 2800.00, '2023-12-05 10:45:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(33, 'BK-2023-013', 2, 4, 1, 4200.00, '2023-12-10 13:15:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(34, 'BK-2023-014', 4, 2, 2, 5100.00, '2023-12-15 09:00:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(35, 'BK-2023-015', 1, 5, 1, 3500.00, '2023-12-20 15:30:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(36, 'BK-2024-001', 3, 3, 2, 2800.00, '2024-01-05 11:45:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(37, 'BK-2024-002', 2, 6, 1, 4200.00, '2024-01-10 14:00:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(38, 'BK-2024-003', 4, 4, 2, 5100.00, '2024-01-15 10:30:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(39, 'BK-2024-004', 1, 2, 1, 3500.00, '2024-01-20 16:15:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41'),
(40, 'BK-2024-005', 3, 5, 2, 2800.00, '2024-01-25 09:45:00', 'completed', '2025-05-14 05:45:41', '2025-05-14 05:45:41');

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
  `status` varchar(20) DEFAULT 'active',
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
(19, 'testadmin@rainbowpaws.com', '$2b$10$rn9WwPcbn2pnhyufVIh0cuY1E0fpO.E0tnSSNMFTDax2To.2PjXaO', 'Test', 'Admin', NULL, NULL, NULL, 'admin', 'active', 1, 1, '2025-05-11 14:42:55', '2025-05-14 06:08:23', '2025-05-14 06:08:23'),
(30, 'justinmarlosibonga@gmail.com', '$2b$10$Rgwuy9VuTiFKtoxr5wMByeG9LEQ5x4puWKFC9YCHzmiOX6hk9tRTy', 'Justin', 'Sibonga', '1232asdasd', 'Capitol Compound, Tenejero Balanga', NULL, 'fur_parent', 'active', 1, 1, '2025-05-13 06:13:57', '2025-05-14 05:16:54', '2025-05-14 05:16:54'),
(31, 'rainbow_bridge@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Rainbow', '09123456789', NULL, NULL, 'business', 'active', 1, 1, '2025-05-13 22:58:24', '2025-05-13 22:58:24', NULL),
(32, 'peaceful_paws@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Peaceful', '09234567890', NULL, NULL, 'business', 'active', 1, 1, '2025-05-13 22:58:24', '2025-05-13 22:58:24', NULL),
(33, 'eternal_companions@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Eternal', '09345678901', NULL, NULL, 'business', 'active', 1, 1, '2025-05-13 22:58:24', '2025-05-13 22:58:24', NULL);

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

--
-- Indexes for dumped tables
--

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
  ADD KEY `pet_id` (`pet_id`),
  ADD KEY `business_service_id` (`business_service_id`);

--
-- Indexes for table `email_queue`
--
ALTER TABLE `email_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `status` (`status`,`attempts`,`created_at`);

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
  ADD KEY `package_addons_ibfk_1` (`package_id`);

--
-- Indexes for table `package_images`
--
ALTER TABLE `package_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_images_ibfk_1` (`package_id`);

--
-- Indexes for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_inclusions_ibfk_1` (`package_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_token` (`token`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_is_used` (`is_used`);

--
-- Indexes for table `pets`
--
ALTER TABLE `pets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `service_provider_id` (`service_provider_id`),
  ADD KEY `booking_id` (`booking_id`);

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
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `email_queue`
--
ALTER TABLE `email_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `package_addons`
--
ALTER TABLE `package_addons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `package_images`
--
ALTER TABLE `package_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `service_providers`
--
ALTER TABLE `service_providers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `successful_bookings`
--
ALTER TABLE `successful_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`business_service_id`) REFERENCES `business_services` (`id`) ON DELETE CASCADE;

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
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pets`
--
ALTER TABLE `pets`
  ADD CONSTRAINT `pets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

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
