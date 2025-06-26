-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 26, 2025 at 03:07 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

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

--
-- Dumping data for table `admin_logs`
--

INSERT INTO `admin_logs` (`id`, `admin_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'approve_business', 'service_providers', 1, '{\"businessName\":\"Justin Sibonga\",\"notes\":\"Application approved\"}', '::1', '2025-06-16 10:17:11'),
(2, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-06-20 22:20:26'),
(3, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-06-20 22:20:31');

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
(1, 'pending_application', 'Pending Applications', 'You have 1 pending business application to review.', 'service_provider', NULL, '/admin/applications', 1, '2025-06-16 10:07:30'),
(2, 'pending_application', 'Pending Applications', 'You have 1 pending business application to review.', 'service_provider', NULL, '/admin/applications', 1, '2025-06-16 10:09:30'),
(3, 'test_notification', 'Test Admin Email Notification', 'This is a test email notification for admin users. If you receive this, email notifications are working correctly!', NULL, NULL, NULL, 0, '2025-06-22 23:06:31'),
(4, 'new_cremation_center', '🎉 New Cremation Center Registration', 'A new cremation center \"Peaceful Paws Memorial Services\" has registered and is pending verification. This business specializes in compassionate pet cremation services with personalized memorial options.', NULL, NULL, '/admin/applications', 0, '2025-06-22 23:10:41'),
(5, 'refund_request', 'New Refund Request', 'Refund request for booking #3 (sadasd) - Amount: ₱323.00', 'refund', 1, '/admin/refunds?refundId=1', 0, '2025-06-24 15:43:01');

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

--
-- Dumping data for table `admin_profiles`
--

INSERT INTO `admin_profiles` (`id`, `user_id`, `username`, `full_name`, `admin_role`, `created_at`, `updated_at`) VALUES
(1, 1, 'justin', 'Justin Sibonga', 'admin', '2025-06-26 00:24:53', '2025-06-26 00:24:53');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `service_provider_id` int(11) NOT NULL,
  `service_package_id` int(11) NOT NULL,
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
  `provider_id` int(11) GENERATED ALWAYS AS (`service_provider_id`) VIRTUAL,
  `package_id` int(11) GENERATED ALWAYS AS (`service_package_id`) VIRTUAL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `bookings_view`
-- (See below for the actual view)
--
CREATE TABLE `bookings_view` (
`id` int(11)
,`user_id` int(11)
,`service_provider_id` int(11)
,`service_package_id` int(11)
,`pet_id` int(11)
,`pet_name` varchar(255)
,`pet_type` varchar(100)
,`cause_of_death` text
,`pet_image_url` varchar(255)
,`booking_date` date
,`booking_time` time
,`status` enum('pending','confirmed','in_progress','completed','cancelled')
,`special_requests` text
,`payment_method` varchar(50)
,`payment_status` enum('not_paid','partially_paid','paid','refunded')
,`refund_id` int(11)
,`delivery_option` enum('pickup','delivery')
,`delivery_address` text
,`delivery_distance` float
,`delivery_fee` decimal(10,2)
,`total_price` decimal(10,2)
,`provider_name` varchar(255)
,`package_name` varchar(255)
,`quantity` int(11)
,`created_at` timestamp
,`updated_at` timestamp
,`provider_id` int(11)
,`package_id` int(11)
);

-- --------------------------------------------------------

--
-- Table structure for table `email_log`
--

CREATE TABLE `email_log` (
  `id` int(11) NOT NULL,
  `recipient` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_log`
--

INSERT INTO `email_log` (`id`, `recipient`, `subject`, `message_id`, `sent_at`) VALUES
(1, 'justinmarlosibonga@gmail.com', 'Welcome to Rainbow Paws! 🌈', '<8b0409bb-3957-55c3-eaeb-6608fe74483c@gmail.com>', '2025-06-14 07:15:49'),
(2, 'justinmarlosibonga@gmail.com', 'Your Verification Code - Rainbow Paws', '<eaa2a69a-2e13-14d2-fefb-ea87c8eed9cc@gmail.com>', '2025-06-14 07:15:52'),
(3, 'justinmarlosibonga@gmail.com', 'Your Verification Code - Rainbow Paws', '<2e7af65d-c7f6-7646-750c-8f91e92b90e9@gmail.com>', '2025-06-14 07:24:00'),
(4, 'justinmarlosibonga@gmail.com', 'Welcome to Rainbow Paws! 🌈', '<32169076-ead8-7daf-a876-55196fbe189c@gmail.com>', '2025-06-16 10:07:14'),
(5, 'justinmarlosibonga@gmail.com', 'Business Verification Approved - Rainbow Paws', '<9bb98717-0ebc-35b2-e66b-0bd5a371ec1f@gmail.com>', '2025-06-16 10:17:14'),
(6, 'justinmarlosibonga@gmail.com', 'Reset Your Password', '<48916678-c2a3-5110-5691-d7a47eca10f2@gmail.com>', '2025-06-19 20:01:06'),
(7, 'justinmarlosibonga@gmail.com', 'Reset Your Password', '<16fed2b1-a9a3-7a99-f621-6d06613074c3@gmail.com>', '2025-06-20 21:45:55'),
(8, 'pakalucamel@gmail.com', 'Welcome to Rainbow Paws! 🌈', '<15b70279-3263-7766-fa61-d8ee9d39ed59@gmail.com>', '2025-06-20 22:55:51'),
(9, 'pakalucamel@gmail.com', 'Your Verification Code - Rainbow Paws', '<686828da-b016-139f-11dd-ee8a172bd3e3@gmail.com>', '2025-06-20 22:55:54'),
(10, 'pakalucamel@gmail.com', 'Your Verification Code - Rainbow Paws', '<72f699b0-1e40-763e-6ecf-a5204cdad427@gmail.com>', '2025-06-20 23:44:22'),
(11, 'pakalucamel@gmail.com', 'Booking Confirmation - Rainbow Paws', '<c7d6549a-e6f1-624b-3041-56e3df636f6c@gmail.com>', '2025-06-22 01:15:34'),
(12, 'pakalucamel@gmail.com', 'Booking Confirmed - Rainbow Paws', '<fb527d7a-d108-fe41-ee64-70f56f9c796c@gmail.com>', '2025-06-22 01:17:36'),
(13, 'pakalucamel@gmail.com', 'Booking In progress - Rainbow Paws', '<efab250d-9bc2-3e3d-40fe-32f6e369a95f@gmail.com>', '2025-06-22 01:17:44'),
(14, 'pakalucamel@gmail.com', 'Booking Completed - Rainbow Paws', '<3fab763c-6d41-6e82-8a59-cc75ba7d878e@gmail.com>', '2025-06-22 01:17:50'),
(15, 'pakalucamel@gmail.com', 'Booking Confirmed', '<58784779-741b-be62-2269-290771159fc1@gmail.com>', '2025-06-22 04:14:36'),
(16, 'justinmarlosibonga@gmail.com', 'Your Password Reset Link', '<e31e20d6-bbdc-ed55-990d-c2cf9cb000bb@gmail.com>', '2025-06-22 07:19:30'),
(17, 'justinmarlosibonga@gmail.com', 'Reset Your Password', '<37c8e14d-d8be-d220-ce0f-472166ed207d@gmail.com>', '2025-06-22 07:23:45'),
(18, 'pakalucamel@gmail.com', 'Booking Confirmation - Rainbow Paws', '<f0194750-1bdb-0b0d-a2ee-f4371b2f5b2b@gmail.com>', '2025-06-22 08:06:20'),
(19, 'admin@rainbowpaws.com', 'Test Admin Email Notification - Rainbow Paws', '<0bdc41fd-9f10-c7cd-392f-3613db00b367@gmail.com>', '2025-06-22 23:06:36'),
(20, 'admin@rainbowpaws.com', '🐾 New Business Registration - Rainbow Paws Admin', '<ee641434-f916-8cc9-cbd2-ade0421c990d@gmail.com>', '2025-06-22 23:10:46'),
(21, 'pakalucamel@gmail.com', 'Booking Cancelled - Rainbow Paws', '<8fde4a7a-5537-efbf-8177-774c4bb6008a@gmail.com>', '2025-06-24 15:28:42'),
(22, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] New Refund Request', '<9b08f9c7-d7fa-cc31-7bbd-87ba256e1188@gmail.com>', '2025-06-24 15:43:04'),
(23, 'pakalucamel@gmail.com', 'Refund Completed - Rainbow Paws', '<8f2701b7-c244-2a7c-39a9-56d9904e473d@gmail.com>', '2025-06-24 15:43:43');

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
  `type` enum('info','success','warning','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `link`, `created_at`) VALUES
(19, 3, 'Booking Cancelled', 'Your booking for sadasd\'s asdasd has been cancelled. ', 'warning', 1, '/user/furparent_dashboard/bookings?bookingId=3', '2025-06-24 15:28:39');

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

--
-- Dumping data for table `otp_attempts`
--

INSERT INTO `otp_attempts` (`id`, `user_id`, `attempt_type`, `ip_address`, `attempt_time`) VALUES
(1, 1, 'generate', '::1', '2025-06-14 07:15:49'),
(2, 1, 'generate', '::1', '2025-06-14 07:23:57'),
(3, 1, 'verify', '::1', '2025-06-14 07:24:19'),
(4, 3, 'generate', '::1', '2025-06-20 22:55:51'),
(5, 3, 'generate', '::1', '2025-06-20 23:44:18'),
(6, 3, 'verify', '::1', '2025-06-20 23:44:43');

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

--
-- Dumping data for table `otp_codes`
--

INSERT INTO `otp_codes` (`id`, `user_id`, `otp_code`, `expires_at`, `is_used`, `used_at`, `created_at`) VALUES
(1, 1, '364779', '2025-06-14 15:25:49', 1, NULL, '2025-06-14 07:15:49'),
(2, 1, '308262', '2025-06-14 15:33:56', 1, NULL, '2025-06-14 07:23:56'),
(3, 3, '358114', '2025-06-21 07:05:51', 1, NULL, '2025-06-20 22:55:51'),
(4, 3, '406880', '2025-06-21 07:54:18', 1, NULL, '2025-06-20 23:44:18');

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
(1, 2, '795c03037fd9146472b8593a3b98fa712c9eb83fae9c7d921c58ed530e185d82', '2025-06-19 19:56:53', '2025-06-20 04:56:53', 1),
(2, 2, '9906ec7a096e9b8390d14ac470dfed8de06571fb77c8e82e19dddb9fae8253f8', '2025-06-19 19:57:12', '2025-06-20 04:57:12', 1),
(3, 2, '41884359d1c49d831e80554e286228b6bda69f3b7bff0f0758acad1f260e09ba', '2025-06-19 20:01:01', '2025-06-20 05:01:01', 1),
(4, 2, 'e5cd629d4ff8008b50a1d7c41e2d8cb59ea06b63c0760a271bb82bbe85a438ac', '2025-06-20 21:45:51', '2025-06-21 06:45:51', 1),
(5, 2, '3ef19fc2b511a705f698b04d9db521fe9b14a8c1ba4426697db9f90268d32b81', '2025-06-22 07:19:27', '2025-06-22 16:19:27', 1),
(6, 2, 'afff0045e589479e4fe94486cc75ed3968bf8935718cfbc0dd41d9c5285feea5', '2025-06-22 07:23:42', '2025-06-22 16:23:42', 0);

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
  `refund_id` int(11) DEFAULT NULL,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `provider` enum('paymongo','manual') NOT NULL,
  `provider_transaction_id` varchar(255) DEFAULT NULL,
  `checkout_url` text DEFAULT NULL,
  `return_url` text DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_transactions`
--

INSERT INTO `payment_transactions` (`id`, `booking_id`, `payment_intent_id`, `source_id`, `amount`, `currency`, `payment_method`, `status`, `refund_id`, `refunded_at`, `provider`, `provider_transaction_id`, `checkout_url`, `return_url`, `failure_reason`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'src_YWbr7HFCjnB82gxotbTMCnVZ', 977.00, 'PHP', 'gcash', 'succeeded', NULL, NULL, 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_YWbr7HFCjnB82gxotbTMCnVZ', 'http://localhost:3000/payment/success?booking_id=1', NULL, '{\"source_id\":\"src_YWbr7HFCjnB82gxotbTMCnVZ\",\"customer_info\":{\"name\":\"Justin Sibonga\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-06-22 01:15:34', '2025-06-22 01:15:38'),
(2, 2, NULL, 'src_cAbj8pcAwUVv8wVVHg9ue8Hz', 323.00, 'PHP', 'gcash', 'succeeded', NULL, NULL, 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_cAbj8pcAwUVv8wVVHg9ue8Hz', 'http://localhost:3000/payment/success?booking_id=2', NULL, '{\"source_id\":\"src_cAbj8pcAwUVv8wVVHg9ue8Hz\",\"customer_info\":{\"name\":\"Justin Sibonga\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-06-22 04:08:32', '2025-06-22 04:08:41'),
(3, 3, NULL, 'src_6wnu1f3VhDtxQDZrKdLgrT9A', 323.00, 'PHP', 'gcash', '', 1, '2025-06-24 15:43:40', 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_6wnu1f3VhDtxQDZrKdLgrT9A', 'http://localhost:3000/payment/success?booking_id=3', NULL, '{\"source_id\":\"src_6wnu1f3VhDtxQDZrKdLgrT9A\",\"customer_info\":{\"name\":\"Justin Sibonga\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-06-22 08:06:21', '2025-06-24 15:43:40');

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
(1, 1, '2025-06-20', 1, '2025-06-19 20:20:59', '2025-06-19 20:20:59'),
(2, 1, '2025-06-25', 1, '2025-06-22 01:14:30', '2025-06-22 01:14:30');

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
(5, 1, '2025-06-29', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(6, 1, '2025-07-05', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(7, 1, '2025-07-06', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(8, 1, '2025-07-12', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(9, 1, '2025-07-13', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(10, 1, '2025-07-19', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(11, 1, '2025-07-20', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(12, 1, '2025-07-26', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(13, 1, '2025-07-27', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(14, 1, '2025-08-02', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(15, 1, '2025-08-03', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(16, 1, '2025-08-09', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(17, 1, '2025-08-10', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(18, 1, '2025-08-16', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(19, 1, '2025-08-17', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(20, 1, '2025-08-23', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(21, 1, '2025-08-24', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(22, 1, '2025-08-30', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(23, 1, '2025-08-31', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(24, 1, '2025-09-06', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(25, 1, '2025-09-07', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(26, 1, '2025-09-13', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(27, 1, '2025-09-14', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(28, 1, '2025-09-20', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(29, 1, '2025-09-21', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(30, 1, '2025-09-27', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(31, 1, '2025-09-28', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(32, 1, '2025-10-04', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(33, 1, '2025-10-05', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(34, 1, '2025-10-11', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(35, 1, '2025-10-12', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(36, 1, '2025-10-18', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(37, 1, '2025-10-19', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(38, 1, '2025-10-25', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(39, 1, '2025-10-26', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(40, 1, '2025-11-01', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(41, 1, '2025-11-02', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(42, 1, '2025-11-08', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(43, 1, '2025-11-09', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(44, 1, '2025-11-15', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(45, 1, '2025-11-16', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(46, 1, '2025-11-22', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(47, 1, '2025-11-23', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(48, 1, '2025-11-29', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(49, 1, '2025-11-30', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(50, 1, '2025-12-06', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(51, 1, '2025-12-07', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(52, 1, '2025-12-13', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(53, 1, '2025-12-14', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(54, 1, '2025-12-20', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(55, 1, '2025-12-21', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(56, 1, '2025-12-27', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41'),
(57, 1, '2025-12-28', '10:00:00', '16:00:00', '[5]', '2025-06-22 01:14:41', '2025-06-22 01:14:41');

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

-- --------------------------------------------------------

--
-- Table structure for table `refunds`
--

CREATE TABLE `refunds` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','processed','failed') DEFAULT 'pending',
  `processed_by` int(11) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `refunds`
--

INSERT INTO `refunds` (`id`, `booking_id`, `amount`, `reason`, `status`, `processed_by`, `payment_method`, `transaction_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, 3, 323.00, 'Customer requested cancellation', 'processed', NULL, NULL, NULL, 'can i have a refund on this\nPayMongo Error: Unable to locate the PayMongo payment record. This may indicate a payment data synchronization issue. Will retry automatically.', '2025-06-24 15:43:01', '2025-06-24 15:43:40');

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
(1, 3, 1, 1, 5, NULL, '2025-06-22 03:27:37', '2025-06-22 03:27:37', '2025-06-26 19:27:37');

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
  `refund_id` int(11) DEFAULT NULL,
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

INSERT INTO `service_bookings` (`id`, `user_id`, `provider_id`, `package_id`, `pet_name`, `pet_type`, `cause_of_death`, `pet_image_url`, `booking_date`, `booking_time`, `status`, `special_requests`, `payment_method`, `payment_status`, `refund_id`, `delivery_option`, `delivery_address`, `delivery_distance`, `delivery_fee`, `price`, `created_at`, `updated_at`) VALUES
(1, 3, 1, 5, 'asdasdasdsdasd', 'Dog', NULL, NULL, '2025-06-22', '10:00:00', 'completed', 'Selected Add-ons: asdas (₱232), asdasd (₱222)', 'gcash', 'paid', NULL, 'delivery', 'Samal, Bataan', 0, 200.00, 977.00, '2025-06-22 01:15:31', '2025-06-22 01:17:47'),
(2, 3, 1, 5, 'dasdasd', 'Dog', NULL, NULL, '2025-06-25', '09:00:00', 'completed', NULL, 'gcash', 'paid', NULL, 'pickup', NULL, 0, 0.00, 323.00, '2025-06-22 04:08:30', '2025-06-22 07:17:24'),
(3, 3, 1, 5, 'sadasd', 'Dog', NULL, NULL, '2025-06-28', '10:00:00', 'cancelled', NULL, 'gcash', 'refunded', 1, 'pickup', NULL, 0, 0.00, 323.00, '2025-06-22 08:06:16', '2025-06-24 15:43:40');

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

INSERT INTO `service_providers` (`provider_id`, `user_id`, `name`, `provider_type`, `contact_first_name`, `contact_last_name`, `phone`, `address`, `hours`, `description`, `application_status`, `verification_date`, `verification_notes`, `bir_certificate_path`, `business_permit_path`, `government_id_path`, `active_service_count`, `created_at`, `updated_at`) VALUES
(1, 2, 'Justin Sibonga', 'cremation', 'Test', 'Nmae', '+639163178412', 'Orani, Bataan', NULL, NULL, 'approved', '2025-06-20 22:20:31', 'Application approved', '/uploads/documents/2/bir_certificate_1750371808943.png', '/uploads/documents/2/business_permit_1750371808764.png', '/uploads/documents/2/government_id_1750371808962.png', 0, '2025-06-16 10:07:14', '2025-06-21 02:34:06');

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
(1, 'admin@rainbowpaws.com', '$2b$10$/TMOT7juT/ytAoRAOjjP.uOu1ZpQiMYRVnvQP9UJLv/KC2CfLaxTe', 'Justin', 'Sibonga', '+639163178412', 'balanga, Bataan', 'Male', '/uploads/admin-profile-pictures/1/admin_profile_picture_1750548150587.png', 'admin', 'active', 1, 1, '2025-06-26 00:38:23', '2025-06-14 07:15:42', '2025-06-26 00:38:23', 0, 1),
(2, 'justinmarlosibonga@gmail.com', '$2b$10$k1S.OTBJsw3va/1AwqkoEuZ8KpDN7aFrHHGtIjP2b2YBibW4Xnxuq', 'Justin', 'Sibonga', '+639163178412', 'balanga, Bataan', NULL, '/uploads/profile-pictures/2/profile_picture_1750778931435.png', 'business', 'active', 1, 1, '2025-06-26 00:25:53', '2025-06-16 10:07:10', '2025-06-26 00:25:53', 1, 1),
(3, 'pakalucamel@gmail.com', '$2b$10$FACNm48GgWanJsUCFaZW9OHTY1iHlokagC3hH5LCoPJ0Tr1ufssoa', 'Justin', 'Sibonga', '+639163178412', 'Samal, Bataan', NULL, '/uploads/profile-pictures/3/profile_picture_1750896496112.png', 'fur_parent', 'active', 1, 1, '2025-06-26 00:19:43', '2025-06-20 22:55:48', '2025-06-26 00:19:43', 1, 1);

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
(1, 2, 'Restricted by admin', '2025-06-20 22:20:26', 'indefinite', 0, 0),
(2, 3, 'Restricted by admin', '2025-06-21 22:52:43', 'indefinite', 0, 0);

-- --------------------------------------------------------

--
-- Structure for view `bookings_view`
--
DROP TABLE IF EXISTS `bookings_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `bookings_view`  AS SELECT `b`.`id` AS `id`, `b`.`user_id` AS `user_id`, `b`.`service_provider_id` AS `service_provider_id`, `b`.`service_package_id` AS `service_package_id`, `b`.`pet_id` AS `pet_id`, `b`.`pet_name` AS `pet_name`, `b`.`pet_type` AS `pet_type`, `b`.`cause_of_death` AS `cause_of_death`, `b`.`pet_image_url` AS `pet_image_url`, `b`.`booking_date` AS `booking_date`, `b`.`booking_time` AS `booking_time`, `b`.`status` AS `status`, `b`.`special_requests` AS `special_requests`, `b`.`payment_method` AS `payment_method`, `b`.`payment_status` AS `payment_status`, `b`.`refund_id` AS `refund_id`, `b`.`delivery_option` AS `delivery_option`, `b`.`delivery_address` AS `delivery_address`, `b`.`delivery_distance` AS `delivery_distance`, `b`.`delivery_fee` AS `delivery_fee`, `b`.`total_price` AS `total_price`, `b`.`provider_name` AS `provider_name`, `b`.`package_name` AS `package_name`, `b`.`quantity` AS `quantity`, `b`.`created_at` AS `created_at`, `b`.`updated_at` AS `updated_at`, `b`.`service_provider_id` AS `provider_id`, `b`.`service_package_id` AS `package_id` FROM `bookings` AS `b` ;

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
-- Indexes for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `type` (`type`),
  ADD KEY `is_read` (`is_read`),
  ADD KEY `created_at` (`created_at`);

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
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `service_provider_id` (`service_provider_id`),
  ADD KEY `service_package_id` (`service_package_id`),
  ADD KEY `pet_id` (`pet_id`),
  ADD KEY `status` (`status`),
  ADD KEY `booking_date` (`booking_date`);

--
-- Indexes for table `email_log`
--
ALTER TABLE `email_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recipient` (`recipient`),
  ADD KEY `sent_at` (`sent_at`);

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
  ADD KEY `idx_created_at` (`created_at`),
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
  ADD KEY `idx_payment_method` (`payment_method`),
  ADD KEY `idx_refund_id` (`refund_id`);

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
-- Indexes for table `refunds`
--
ALTER TABLE `refunds`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_id` (`booking_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

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
  ADD KEY `idx_service_bookings_date` (`booking_date`),
  ADD KEY `idx_refund_id` (`refund_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_log`
--
ALTER TABLE `email_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `email_queue`
--
ALTER TABLE `email_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `package_addons`
--
ALTER TABLE `package_addons`
  MODIFY `addon_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `package_images`
--
ALTER TABLE `package_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `pet_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `provider_availability`
--
ALTER TABLE `provider_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refunds`
--
ALTER TABLE `refunds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `service_bookings`
--
ALTER TABLE `service_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `service_providers`
--
ALTER TABLE `service_providers`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  MODIFY `restriction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

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
