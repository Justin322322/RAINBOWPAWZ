-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 14, 2025 at 03:11 PM
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
(2, 'new_cremation_center', 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'service_provider', 10, '/admin/applications/10', 0, '2025-05-14 06:38:08');

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
(56, 33, 'Application Approved', 'Your business application for Eternal Companions has been approved.', 'success', 0, '/cremation/dashboard', '2025-05-14 05:59:22', '2025-05-14 05:59:22'),
(57, 33, 'Application Approved', 'Your business application for Eternal Companions has been approved. You can now start offering services.', 'success', 0, '/business/dashboard', '2025-05-14 06:16:38', '2025-05-14 06:16:38'),
(58, 33, 'Application Approved', 'Your business application for Eternal Companions has been approved.', 'success', 0, '/cremation/dashboard', '2025-05-14 06:16:41', '2025-05-14 06:16:41'),
(62, 31, 'Additional Documents Required', 'Your business application for Rainbow Bridge Pet Cremation requires additional documents. Please check your email for details.', 'warning', 0, '/business/profile', '2025-05-14 06:30:26', '2025-05-14 06:30:26'),
(63, 31, 'Additional Documents Required', 'Your business application for Rainbow Bridge Pet Cremation requires additional documents. Please check your email for details.', 'warning', 0, '/business/profile', '2025-05-14 06:33:48', '2025-05-14 06:33:48'),
(64, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasdadadssd asdasd sd', 'error', 0, '/business/profile', '2025-05-14 06:40:02', '2025-05-14 06:40:02'),
(65, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasda asdasd asdasd', 'error', 0, '/business/profile', '2025-05-14 06:46:48', '2025-05-14 06:46:48'),
(66, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasdds asdasd sdasd asdas', 'error', 0, '/business/profile', '2025-05-14 06:47:16', '2025-05-14 06:47:16'),
(69, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasdasd ajlksdhasjhdj a asjkdhasjhdkhs', 'error', 0, '/business/profile', '2025-05-14 06:56:14', '2025-05-14 06:56:14'),
(70, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdas d kjasdkjas aksdjaksdj', 'error', 0, '/business/profile', '2025-05-14 06:59:22', '2025-05-14 06:59:22'),
(71, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasdasdasdasdsd', 'error', 0, '/business/profile', '2025-05-14 07:05:12', '2025-05-14 07:05:12'),
(72, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasd asdasd asdasd aasdasd', 'error', 0, '/business/profile', '2025-05-14 07:11:00', '2025-05-14 07:11:00'),
(73, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasd asdasd asdasd', 'error', 0, '/business/profile', '2025-05-14 07:11:37', '2025-05-14 07:11:37'),
(74, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdas adsasd dasda asdasd', 'error', 0, '/business/profile', '2025-05-14 07:15:43', '2025-05-14 07:15:43'),
(75, 31, 'Application Declined', 'Your business application for Rainbow Bridge Pet Cremation has been declined. Reason: asdasd asdasd asdasd asdasd', 'error', 0, '/business/profile', '2025-05-14 07:19:03', '2025-05-14 07:19:03');

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
(66, 40, 'generate', '2025-05-14 10:51:31', '::ffff:192.168.56.1'),
(67, 40, 'generate', '2025-05-14 10:51:50', '::ffff:192.168.56.1'),
(68, 40, 'verify', '2025-05-14 10:52:05', '::ffff:192.168.56.1');

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
(50, 40, '714667', '2025-05-14 19:01:31', 1, '2025-05-14 10:51:31'),
(51, 40, '927206', '2025-05-14 19:01:50', 1, '2025-05-14 10:51:50');

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
(6, 31, 'Rainbow Bridge Pet Cremation', 'cremation', 'Admin', 'Rainbow', '09123456789', 'Capitol Drive, Balanga City, Bataan, Philippines', 'Bataan', 'Balanga City', '2100', 'Monday-Friday: 8:00 AM - 5:00 PM, Saturday: 8:00 AM - 12:00 PM, Sunday: Closed', 'Compassionate pet cremation services with personalized memorials. We provide dignified and respectful end-of-life care for your beloved companions. Our team understands the deep bond between pets and their families, and we strive to honor that connection through our thoughtful services.', 'declined', '2025-05-14 07:19:00', 'asdasd asdasd asdasd asdasd', NULL, NULL, NULL, '2025-05-13 22:58:24', '2025-05-14 08:31:52', 3),
(7, 32, 'Peaceful Paws Memorial', 'cremation', 'Admin', 'Peaceful', '09234567890', 'Tuyo, Balanga City, Bataan, Philippines', 'Bataan', 'Balanga City', '2100', 'Monday-Saturday: 9:00 AM - 6:00 PM, Sunday: By appointment only', 'Dignified pet cremation with eco-friendly options. We focus on providing environmentally conscious memorial services while honoring your pet with the respect they deserve. Our facility is designed to provide a peaceful setting for families during this difficult time.', 'approved', '2025-05-14 10:52:58', 'Unrestricted by admin', NULL, NULL, NULL, '2025-05-13 22:58:24', '2025-05-14 10:52:58', 3),
(8, 33, 'Eternal Companions', 'cremation', 'Admin', 'Eternal', '09345678901', 'Tenejero, Balanga City, Bataan, Philippines', 'Bataan', 'Balanga City', '2100', 'Monday-Sunday: 24/7 Service Available', 'Honoring your pet with respectful cremation services. We offer 24/7 service to ensure your beloved companion receives timely and compassionate care. Our dedicated team is committed to providing support during this difficult time.', 'approved', '2025-05-14 06:16:37', 'Application approved', NULL, NULL, NULL, '2025-05-13 22:58:24', '2025-05-14 08:31:52', 3);

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
(19, 'testadmin@rainbowpaws.com', '$2b$10$rn9WwPcbn2pnhyufVIh0cuY1E0fpO.E0tnSSNMFTDax2To.2PjXaO', 'Test', 'Admin', NULL, NULL, NULL, 'admin', 'active', 1, 1, '2025-05-11 14:42:55', '2025-05-14 12:59:22', '2025-05-14 12:59:22'),
(31, 'rainbow_bridge@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Rainbow', '09123456789', NULL, NULL, 'business', 'active', 1, 1, '2025-05-13 22:58:24', '2025-05-13 22:58:24', NULL),
(32, 'peaceful_paws@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Peaceful', '09234567890', NULL, NULL, 'business', 'active', 1, 1, '2025-05-13 22:58:24', '2025-05-14 10:52:58', NULL),
(33, 'eternal_companions@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Eternal', '09345678901', NULL, NULL, 'business', 'active', 1, 1, '2025-05-13 22:58:24', '2025-05-13 22:58:24', NULL),
(40, 'justinmarlosibonga@gmail.com', '$2b$10$YnxAQblMwI8K3GfKn1zfxOs49VYuPc8LUljhGlph7VUlcA28wEbzq', 'Justin', 'Sibonga', '1111111', 'Capitol Compound, Tenejero', 'male', 'fur_parent', 'active', 0, 1, '2025-05-14 10:51:28', '2025-05-14 10:52:06', '2025-05-14 10:51:41');

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
  ADD PRIMARY KEY (`id`);

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
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_queue`
--
ALTER TABLE `email_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
