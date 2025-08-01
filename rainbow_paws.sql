-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 01, 2025 at 04:01 AM
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
(32, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-14 13:06:45'),
(33, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-14 17:41:04'),
(34, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-14 17:41:10');

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
(1, 1, 'admin', 'Admin Admin', 'admin', '2025-06-26 00:24:53', '2025-07-07 07:06:49');

-- --------------------------------------------------------

--
-- Table structure for table `appeal_history`
--

CREATE TABLE `appeal_history` (
  `history_id` int(11) NOT NULL,
  `appeal_id` int(11) NOT NULL,
  `previous_status` enum('pending','under_review','approved','rejected') DEFAULT NULL,
  `new_status` enum('pending','under_review','approved','rejected') NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `admin_response` text DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appeal_history`
--

INSERT INTO `appeal_history` (`history_id`, `appeal_id`, `previous_status`, `new_status`, `admin_id`, `admin_response`, `changed_at`, `notes`) VALUES
(14, 8, 'pending', 'approved', 1, '', '2025-07-14 13:08:20', 'Status changed from pending to approved by admin (ID: 1)'),
(15, 8, 'approved', 'approved', 1, NULL, '2025-07-14 13:08:20', 'Account restrictions removed and user status restored to active');

-- --------------------------------------------------------

--
-- Stand-in structure for view `bookings`
-- (See below for the actual view)
--
CREATE TABLE `bookings` (
`booking_id` int(11)
,`id` int(11)
,`user_id` int(11)
,`provider_id` int(11)
,`package_id` int(11)
,`service_type_id` int(11)
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
,`price` decimal(10,2)
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `business_custom_options`
--

CREATE TABLE `business_custom_options` (
  `id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `option_type` enum('category','cremation_type','processing_time') NOT NULL,
  `option_value` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `business_custom_options`
--

INSERT INTO `business_custom_options` (`id`, `provider_id`, `option_type`, `option_value`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'category', 'Private', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16'),
(2, 1, 'category', 'Communal', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16'),
(3, 1, 'cremation_type', 'Standard', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16'),
(4, 1, 'cremation_type', 'Premium', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16'),
(5, 1, 'cremation_type', 'Deluxe', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16'),
(6, 1, 'processing_time', '1-2 days', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16'),
(7, 1, 'processing_time', '2-3 days', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16'),
(8, 1, 'processing_time', '3-5 days', 1, '2025-07-21 07:19:16', '2025-07-21 07:19:16');

-- --------------------------------------------------------

--
-- Table structure for table `business_notifications`
--

CREATE TABLE `business_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `business_pet_types`
--

CREATE TABLE `business_pet_types` (
  `id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `pet_type` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `business_pet_types`
--

INSERT INTO `business_pet_types` (`id`, `provider_id`, `pet_type`, `is_active`, `created_at`, `updated_at`) VALUES
(9, 1, 'Dogs', 0, '2025-07-22 06:56:33', '2025-07-27 23:00:44'),
(10, 1, 'Cats', 0, '2025-07-22 06:56:33', '2025-07-27 23:00:44'),
(11, 1, 'Birds', 0, '2025-07-22 06:56:33', '2025-07-27 23:00:44'),
(12, 1, 'Rabbits', 0, '2025-07-22 06:56:33', '2025-07-27 23:00:44'),
(13, 1, 'Hamsters', 0, '2025-07-22 06:56:33', '2025-07-27 23:00:44'),
(14, 1, 'Dogs', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44'),
(15, 1, 'Cats', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44'),
(16, 1, 'Birds', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44'),
(17, 1, 'Rabbits', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44'),
(18, 1, 'Dogs', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44'),
(19, 1, 'Cats', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44'),
(20, 1, 'Birds', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44'),
(21, 1, 'Rabbits', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44');

-- --------------------------------------------------------

--
-- Stand-in structure for view `business_profiles`
-- (See below for the actual view)
--
CREATE TABLE `business_profiles` (
`id` int(11)
,`user_id` int(11)
,`business_name` varchar(100)
,`business_type` enum('cremation','memorial','veterinary')
,`contact_first_name` varchar(50)
,`contact_last_name` varchar(50)
,`business_phone` varchar(20)
,`business_address` text
,`business_hours` text
,`service_description` text
,`application_status` enum('pending','declined','approved','restricted')
,`verification_status` enum('pending','declined','approved','restricted')
,`verification_date` timestamp
,`verification_notes` text
,`bir_certificate_path` varchar(255)
,`business_permit_path` varchar(255)
,`government_id_path` varchar(255)
,`created_at` timestamp
,`updated_at` timestamp
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
(61, 'justinmarlosibonga@gmail.com', '🚨 Account Restricted - Action Required', '<616f8efb-c676-f031-008b-ce3be1d93baf@gmail.com>', '2025-07-14 13:06:50'),
(62, 'admin@rainbowpaws.com', '🚨 New Appeal Submitted - Action Required', '<cc278af9-c2de-c017-1c0a-1ba954d44c86@gmail.com>', '2025-07-14 13:07:57'),
(63, 'justinmarlosibonga@gmail.com', '🎉 Appeal Approved - Welcome Back!', '<3433b684-1572-332b-d392-025cb398944e@gmail.com>', '2025-07-14 13:08:23'),
(64, 'pakalucamel@gmail.com', 'Booking Confirmation - Rainbow Paws', '<fcabb25b-1b92-21d6-5a09-10b0eb8cadc2@gmail.com>', '2025-07-14 17:26:05'),
(65, 'justinmarlosibonga@gmail.com', '[Rainbow Paws] New Booking Received', '<6464bbb7-8aba-8dd1-6f76-15556fe7e344@gmail.com>', '2025-07-14 17:26:09'),
(66, 'pakalucamel@gmail.com', 'Booking Confirmed - Rainbow Paws', '<331e9f33-addf-7961-cd73-955dc5ba7865@gmail.com>', '2025-07-14 17:30:25'),
(67, 'pakalucamel@gmail.com', 'Booking In progress - Rainbow Paws', '<281cc9ed-5d42-bf53-26df-a11a9af06c98@gmail.com>', '2025-07-14 17:31:13'),
(68, 'pakalucamel@gmail.com', 'Booking Completed - Rainbow Paws', '<aabff327-ae0e-50a4-2309-43d99f2acb9c@gmail.com>', '2025-07-14 17:31:19'),
(69, 'justinmarlosibonga@gmail.com', 'New 5-Star Review Received - Rainbow Paws', '<df7b0c87-7824-6381-a7b4-4e993c3c25c4@gmail.com>', '2025-07-14 17:32:13'),
(70, 'justinmarlosibonga@gmail.com', '🚨 Account Restricted - Action Required', '<c287cadb-8642-42b8-1c3e-3cb520061f55@gmail.com>', '2025-07-14 17:41:08'),
(71, 'justinmarlosibonga@gmail.com', 'Reset Your Password', '<85bdcd4f-5d64-5a88-e739-b0b3561f5366@gmail.com>', '2025-07-20 20:30:38'),
(72, 'justinmarlosibonga@gmail.com', 'Reset Your Password', '<b0f07aec-411e-2f92-90ab-81ce8ede4a32@gmail.com>', '2025-07-20 20:32:34'),
(73, 'pakalucamel@gmail.com', 'Booking Confirmation - Rainbow Paws', '<2af7b573-c867-bd1c-89b5-3b21de461799@gmail.com>', '2025-07-21 01:21:42'),
(74, 'justinmarlosibonga@gmail.com', '[Rainbow Paws] New Booking Received', '<61069def-4bde-037a-d62a-297b1e79cef0@gmail.com>', '2025-07-21 01:21:45'),
(75, 'pakalucamel@gmail.com', 'Booking Confirmed - Rainbow Paws', '<ef926689-560e-9709-6982-1e2e05a491c1@gmail.com>', '2025-07-21 01:24:48'),
(76, 'pakalucamel@gmail.com', 'Booking In progress - Rainbow Paws', '<7d2f9610-aed7-d5d0-ee0f-9bc7fcb33abf@gmail.com>', '2025-07-21 01:24:55'),
(77, 'pakalucamel@gmail.com', 'Booking Completed - Rainbow Paws', '<b29bfb8f-0049-99be-9c4d-0636ddfbde48@gmail.com>', '2025-07-21 01:25:00'),
(78, 'pakalucamel@gmail.com', 'Booking Confirmation - Rainbow Paws', '<0072f9d0-a439-0171-a9c2-8b7f9bd5310b@gmail.com>', '2025-07-21 01:48:52'),
(79, 'justinmarlosibonga@gmail.com', '[Rainbow Paws] New Booking Received', '<a8a42e88-9bb4-7976-c08d-1c2068a06e17@gmail.com>', '2025-07-21 01:48:55'),
(80, 'pakalucamel@gmail.com', 'Booking Confirmed - Rainbow Paws', '<11879252-d411-150f-43d9-3fca07d0052c@gmail.com>', '2025-07-21 01:52:40'),
(81, 'pakalucamel@gmail.com', 'Booking Confirmation - Rainbow Paws', '<e863f906-ee6e-3edb-37f1-a16e904d274e@gmail.com>', '2025-07-21 01:57:41'),
(82, 'justinmarlosibonga@gmail.com', '[Rainbow Paws] New Booking Received', '<e8f74beb-80f5-e52e-1b8e-c03bedf75360@gmail.com>', '2025-07-21 01:57:44'),
(83, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] Refund Request - Booking Cancelled', '<0b260be9-fb85-5dc3-e84d-53a342d971e1@gmail.com>', '2025-07-21 01:57:56'),
(84, 'pakalucamel@gmail.com', 'Refund Request Received - Rainbow Paws', '<cff50c12-e0ea-b900-913c-0bb0551f4bf2@gmail.com>', '2025-07-21 01:57:59'),
(85, 'pakalucamel@gmail.com', 'Booking Cancelled - Rainbow Paws', '<c27a981e-d616-eef0-b53c-f0d782356551@gmail.com>', '2025-07-21 01:58:01'),
(86, 'justinmarlosibonga@gmail.com', '[Rainbow Paws] Booking Cancelled', '<f323d23e-ef1f-b3c6-59e9-13d25933c898@gmail.com>', '2025-07-21 01:58:04'),
(87, 'pakalucamel@gmail.com', 'Booking Cancelled - Rainbow Paws', '<2ce93a85-caf8-a829-5c05-8e290a736f27@gmail.com>', '2025-07-21 01:58:08'),
(88, 'pakalucamel@gmail.com', 'Refund Completed - Rainbow Paws', '<71172a7d-4dc7-46ec-1107-133370b9287e@gmail.com>', '2025-07-21 01:59:35'),
(89, 'test1753078137625@example.com', 'Welcome to Rainbow Paws! 🌈', '<190b18ef-1485-f0a9-4f71-50400bb560d7@gmail.com>', '2025-07-21 06:09:01'),
(90, 'test1753078137625@example.com', 'Your Verification Code - Rainbow Paws', '<4482b66d-5058-d93e-b83b-cc70f3331a9e@gmail.com>', '2025-07-21 06:09:05'),
(91, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] New Cremation Center Registration', '<85c16502-fcbf-a0a3-63df-63f09620f1f2@gmail.com>', '2025-07-21 06:16:31'),
(92, 'test-business-1753078587295@example.com', 'Welcome to Rainbow Paws! 🌈', '<48c84c51-fc4e-2621-439f-be9f5f92b8fa@gmail.com>', '2025-07-21 06:16:34'),
(93, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] New Cremation Center Registration', '<c45ea5c9-5a2c-6c3a-fa32-b979fb71a8a4@gmail.com>', '2025-07-21 06:17:49'),
(94, 'test-corporation-1753078663543-0@example.com', 'Welcome to Rainbow Paws! 🌈', '<d27272d0-cc0a-ff4d-6ac2-04f097fbf76b@gmail.com>', '2025-07-21 06:17:52'),
(95, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] New Cremation Center Registration', '<a3928b3e-721b-044e-f432-aa97da8ea0ca@gmail.com>', '2025-07-21 06:17:56'),
(96, 'test-sole_proprietorship-1753078672875-1@example.com', 'Welcome to Rainbow Paws! 🌈', '<16fc2a9f-2b0a-9f2b-1c0c-c6bd3821ed9b@gmail.com>', '2025-07-21 06:17:59'),
(97, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] New Cremation Center Registration', '<bb9f2d18-d60e-3500-abd9-b856926afaab@gmail.com>', '2025-07-21 06:18:02'),
(98, 'test-partnership-1753078679552-2@example.com', 'Welcome to Rainbow Paws! 🌈', '<42e71f23-70ab-ca53-c2d5-318206d2e6d9@gmail.com>', '2025-07-21 06:18:05'),
(99, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] New Cremation Center Registration', '<a38316e2-0af1-8018-4be2-1ed8adab772b@gmail.com>', '2025-07-21 06:18:09'),
(100, 'test-limited_liability_company-1753078685739-3@example.com', 'Welcome to Rainbow Paws! 🌈', '<e68ad00e-4818-c5da-33fa-5ff0004dc69d@gmail.com>', '2025-07-21 06:18:12'),
(101, 'admin@rainbowpaws.com', '[Rainbow Paws Admin] New Cremation Center Registration', '<bd0760d3-9e65-0924-5f50-1e255e738828@gmail.com>', '2025-07-21 06:18:15'),
(102, 'test-cooperative-1753078692850-4@example.com', 'Welcome to Rainbow Paws! 🌈', '<3ccf1d2c-eb5f-99f9-9a36-30abe08201ae@gmail.com>', '2025-07-21 06:18:18'),
(103, 'pakalucamel@gmail.com', 'Booking In progress - Rainbow Paws', '<0a11f1eb-8940-5681-a159-d296323dc138@gmail.com>', '2025-07-21 16:00:08'),
(104, 'pakalucamel@gmail.com', 'Booking Completed - Rainbow Paws', '<26f87d04-f66d-2a50-4524-bedff7fed1eb@gmail.com>', '2025-07-21 16:00:16'),
(105, 'justinmarlosibonga@gmail.com', 'New 5-Star Review Received - Rainbow Paws', '<1e41bcfd-4085-9ea3-ac0f-57aa2ecfc0dd@gmail.com>', '2025-07-27 14:24:03'),
(106, 'pakalucamel@gmail.com', 'Your Verification Code - Rainbow Paws', '<edf1ff70-39f3-fba2-a750-1d65bc0fd253@gmail.com>', '2025-07-28 08:04:51'),
(107, 'justinmarlosibonga@gmail.com', 'New 5-Star Review Received - Rainbow Paws', '<3fc2e9be-f8d8-2db5-ca6e-8049e686a8d9@gmail.com>', '2025-07-29 16:51:01');

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
-- Table structure for table `migration_history`
--

CREATE TABLE `migration_history` (
  `id` int(11) NOT NULL,
  `migration_name` varchar(255) NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `success` tinyint(1) DEFAULT 1,
  `error_message` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(65, 1, 'New Appeal Submitted', 'undefined undefined has submitted an appeal: \"TEST\"', 'warning', 0, '/admin/users/cremation?appealId=8&userId=2', '2025-07-14 13:07:54'),
(86, 3, 'Service In Progress', 'The null for asdad is now in progress. You will be notified when it\'s completed.', 'info', 1, '/user/furparent_dashboard/bookings?bookingId=10', '2025-07-21 16:00:04'),
(87, 3, 'Service Completed', 'The null for asdad has been completed. Thank you for choosing our services.', 'success', 1, '/user/furparent_dashboard/bookings?bookingId=10', '2025-07-21 16:00:12');

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
(10, 3, 'generate', '::1', '2025-07-28 08:04:47'),
(11, 3, 'verify', '::1', '2025-07-28 08:05:15');

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
(7, 3, '788870', '2025-07-28 16:14:47', 1, NULL, '2025-07-28 08:04:47');

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

--
-- Dumping data for table `package_images`
--

INSERT INTO `package_images` (`image_id`, `package_id`, `image_path`, `display_order`, `created_at`) VALUES
(27, 13, '/uploads/packages/package_1_1753690779303.png', 1, '2025-07-28 08:19:45'),
(28, 13, '/uploads/packages/package_1_1753690782966.png', 2, '2025-07-28 08:19:45');

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
(42, 13, 'asdasd', '2025-07-28 08:19:45');

-- --------------------------------------------------------

--
-- Table structure for table `package_size_pricing`
--

CREATE TABLE `package_size_pricing` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `size_category` enum('small','medium','large','extra_large') NOT NULL,
  `weight_range_min` decimal(8,2) DEFAULT NULL,
  `weight_range_max` decimal(8,2) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
(7, 2, '386ce8313013ce7bb14e45345842a859b76437b8f0dd6ff96cde90a7880a0451', '2025-07-11 19:02:04', '2025-07-12 04:02:04', 1),
(8, 2, '79ca83432484e093858911daec847c40510d6746b54b02a7fd8123d9fde268e9', '2025-07-20 20:30:34', '2025-07-21 05:30:34', 1),
(9, 2, '9a2f36e4a8eaa70ede01ca89490439fe66e1069ab45e68702e23f06dce920ea6', '2025-07-20 20:32:31', '2025-07-21 05:32:31', 0);

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
(7, 8, NULL, 'src_AtvSeYvYCiKvvMQgbrtjHGis', 4183.00, 'PHP', 'gcash', 'succeeded', NULL, NULL, 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_AtvSeYvYCiKvvMQgbrtjHGis', 'http://localhost:3000/payment/success?booking_id=8', NULL, '{\"source_id\":\"src_AtvSeYvYCiKvvMQgbrtjHGis\",\"customer_info\":{\"name\":\"Pet Parents\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-07-14 17:26:10', '2025-07-14 17:26:18'),
(8, 9, NULL, 'src_xzyYs8x1AzQeywEupffFqccP', 4183.00, 'PHP', 'gcash', 'succeeded', NULL, NULL, 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_xzyYs8x1AzQeywEupffFqccP', 'http://localhost:3000/payment/success?booking_id=9', NULL, '{\"source_id\":\"src_xzyYs8x1AzQeywEupffFqccP\",\"customer_info\":{\"name\":\"Pet Parents\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-07-21 01:21:45', '2025-07-21 01:21:49'),
(9, 10, NULL, 'src_o9PKgg9c1HD3uXifpBKvMhgi', 4183.00, 'PHP', 'gcash', 'succeeded', NULL, NULL, 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_o9PKgg9c1HD3uXifpBKvMhgi', 'http://localhost:3000/payment/success?booking_id=10', NULL, '{\"source_id\":\"src_o9PKgg9c1HD3uXifpBKvMhgi\",\"customer_info\":{\"name\":\"Pet Parents\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-07-21 01:48:56', '2025-07-21 01:49:24'),
(10, 11, NULL, 'src_AfqM4gEQaGvxseLCoa7oG8Cu', 2323.00, 'PHP', 'gcash', '', 4, '2025-07-21 01:59:32', 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_AfqM4gEQaGvxseLCoa7oG8Cu', 'http://localhost:3000/payment/success?booking_id=11', NULL, '{\"source_id\":\"src_AfqM4gEQaGvxseLCoa7oG8Cu\",\"customer_info\":{\"name\":\"Pet Parents\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-07-21 01:57:44', '2025-07-21 01:59:32');

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
(5, 3, 'asasdasd', 'Dog', NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-14 17:26:00', '2025-07-14 17:26:00'),
(6, 3, 'pet', 'Dog', NULL, NULL, NULL, NULL, '/uploads/pets/pet_pet_3_1753060898837.png', NULL, '2025-07-21 01:21:38', '2025-07-21 01:21:38'),
(7, 3, 'asdad', 'Cat', NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-21 01:48:49', '2025-07-21 01:48:49'),
(8, 3, 'sad', 'Bird', NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-21 01:57:38', '2025-07-21 01:57:38');

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
(4, 1, '2025-07-22', 1, '2025-07-21 02:03:36', '2025-07-21 02:03:36'),
(5, 1, '2025-08-05', 1, '2025-07-27 12:29:50', '2025-07-27 12:29:50'),
(6, 1, '2025-08-07', 1, '2025-07-29 17:44:39', '2025-07-29 17:44:39'),
(7, 1, '2025-08-08', 1, '2025-07-29 17:44:51', '2025-07-29 17:44:51'),
(8, 1, '2025-07-30', 1, '2025-07-29 17:49:27', '2025-07-29 17:49:27');

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
(382, 1, '2025-07-20', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(394, 1, '2025-08-31', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(395, 1, '2025-09-06', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(396, 1, '2025-09-07', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(397, 1, '2025-09-13', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(398, 1, '2025-09-14', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(399, 1, '2025-09-20', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(400, 1, '2025-09-21', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(401, 1, '2025-09-27', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(402, 1, '2025-09-28', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(403, 1, '2025-10-04', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(404, 1, '2025-10-05', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(405, 1, '2025-10-11', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(406, 1, '2025-10-12', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(407, 1, '2025-10-18', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(408, 1, '2025-10-19', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(409, 1, '2025-10-25', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(410, 1, '2025-10-26', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(420, 1, '2025-11-30', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(421, 1, '2025-12-06', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(422, 1, '2025-12-07', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(423, 1, '2025-12-13', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(424, 1, '2025-12-14', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(425, 1, '2025-12-20', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(426, 1, '2025-12-21', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(427, 1, '2025-12-27', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(428, 1, '2025-12-28', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(429, 1, '2025-07-22', '09:00:00', '10:00:00', '[10]', '2025-07-21 02:03:36', '2025-07-21 02:03:36'),
(431, 1, '2025-07-28', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(432, 1, '2025-07-29', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(434, 1, '2025-07-31', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(436, 1, '2025-08-04', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(438, 1, '2025-08-06', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(441, 1, '2025-08-11', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(442, 1, '2025-08-12', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(443, 1, '2025-08-13', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(444, 1, '2025-08-14', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(445, 1, '2025-08-15', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(446, 1, '2025-08-18', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(447, 1, '2025-08-19', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(448, 1, '2025-08-20', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(449, 1, '2025-08-21', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(450, 1, '2025-08-22', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(451, 1, '2025-08-25', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(452, 1, '2025-08-26', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(453, 1, '2025-08-27', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(454, 1, '2025-08-28', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(455, 1, '2025-08-29', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(456, 1, '2025-09-01', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(457, 1, '2025-09-02', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(458, 1, '2025-09-03', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(459, 1, '2025-09-04', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(460, 1, '2025-09-05', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(461, 1, '2025-09-08', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(462, 1, '2025-09-09', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(463, 1, '2025-09-10', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(464, 1, '2025-09-11', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(465, 1, '2025-09-12', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(466, 1, '2025-09-15', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(467, 1, '2025-09-16', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(468, 1, '2025-09-17', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(469, 1, '2025-09-18', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(470, 1, '2025-09-19', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(471, 1, '2025-09-22', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(472, 1, '2025-09-23', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(473, 1, '2025-09-24', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(474, 1, '2025-09-25', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(475, 1, '2025-09-26', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(476, 1, '2025-09-29', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(477, 1, '2025-09-30', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(478, 1, '2025-10-01', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(479, 1, '2025-10-02', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(480, 1, '2025-10-03', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(481, 1, '2025-10-06', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(482, 1, '2025-10-07', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(483, 1, '2025-10-08', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(484, 1, '2025-10-09', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(485, 1, '2025-10-10', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(486, 1, '2025-10-13', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(487, 1, '2025-10-14', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(488, 1, '2025-10-15', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(489, 1, '2025-10-16', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(490, 1, '2025-10-17', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(491, 1, '2025-10-20', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(492, 1, '2025-10-21', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(493, 1, '2025-10-22', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(494, 1, '2025-10-23', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(495, 1, '2025-10-24', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(496, 1, '2025-10-27', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(497, 1, '2025-10-28', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(498, 1, '2025-10-29', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(499, 1, '2025-10-30', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(500, 1, '2025-10-31', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(501, 1, '2025-11-03', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(502, 1, '2025-11-04', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(503, 1, '2025-11-05', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(504, 1, '2025-11-06', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(505, 1, '2025-11-07', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(506, 1, '2025-11-10', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(507, 1, '2025-11-11', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(508, 1, '2025-11-12', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(509, 1, '2025-11-13', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(510, 1, '2025-11-14', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(511, 1, '2025-11-17', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(512, 1, '2025-11-18', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(513, 1, '2025-11-19', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(514, 1, '2025-11-20', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(515, 1, '2025-11-21', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(516, 1, '2025-11-24', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(517, 1, '2025-11-25', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(518, 1, '2025-11-26', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(519, 1, '2025-11-27', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(520, 1, '2025-11-28', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(521, 1, '2025-12-01', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(522, 1, '2025-12-02', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(523, 1, '2025-12-03', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(524, 1, '2025-12-04', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(525, 1, '2025-12-05', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(526, 1, '2025-12-08', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(527, 1, '2025-12-09', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(528, 1, '2025-12-10', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(529, 1, '2025-12-11', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(530, 1, '2025-12-12', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(531, 1, '2025-12-15', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(532, 1, '2025-12-16', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(533, 1, '2025-12-17', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(534, 1, '2025-12-18', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(535, 1, '2025-12-19', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(536, 1, '2025-12-22', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(537, 1, '2025-12-23', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(538, 1, '2025-12-24', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(539, 1, '2025-12-25', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(540, 1, '2025-12-26', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(541, 1, '2025-12-29', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(542, 1, '2025-12-30', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(543, 1, '2025-12-31', '09:00:00', '17:00:00', '[13]', '2025-07-28 08:18:36', '2025-07-28 08:18:36'),
(544, 1, '2025-08-07', '09:00:00', '10:00:00', '[13]', '2025-07-29 17:44:39', '2025-07-29 17:44:39'),
(545, 1, '2025-08-08', '09:00:00', '10:00:00', '[13]', '2025-07-29 17:44:51', '2025-07-29 17:44:51'),
(547, 1, '2025-08-05', '09:00:00', '17:00:00', '[13]', '2025-07-29 17:53:12', '2025-07-29 17:53:12'),
(548, 1, '2025-08-05', '21:00:00', '22:00:00', '[13]', '2025-07-29 17:53:12', '2025-07-29 17:53:12');

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
  `status` enum('pending','processing','processed','failed','cancelled') DEFAULT 'pending',
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
(4, 11, 2323.00, 'Customer requested cancellation', 'processed', NULL, NULL, NULL, 'Refund request due to booking cancellation\nPayMongo Error: Unable to locate the PayMongo payment record. This may indicate a payment data synchronization issue. Will retry automatically.', '2025-07-21 01:57:53', '2025-07-21 01:59:32');

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
(5, 3, 1, 8, 5, 'great service', '2025-07-14 17:32:10', '2025-07-14 17:32:10', '2025-07-19 09:32:10'),
(6, 3, 1, 10, 5, NULL, '2025-07-27 14:23:59', '2025-07-27 14:23:59', '2025-08-01 06:23:59'),
(7, 3, 1, 9, 5, NULL, '2025-07-29 16:50:57', '2025-07-29 16:50:57', '2025-08-03 08:50:57');

-- --------------------------------------------------------

--
-- Table structure for table `service_bookings`
--

CREATE TABLE `service_bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `service_type_id` int(11) DEFAULT 1,
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

INSERT INTO `service_bookings` (`id`, `user_id`, `provider_id`, `package_id`, `service_type_id`, `pet_name`, `pet_type`, `cause_of_death`, `pet_image_url`, `booking_date`, `booking_time`, `status`, `special_requests`, `payment_method`, `payment_status`, `refund_id`, `delivery_option`, `delivery_address`, `delivery_distance`, `delivery_fee`, `price`, `created_at`, `updated_at`) VALUES
(8, 3, 1, 10, 1, 'asasdasd', 'Dog', NULL, NULL, '2025-07-19', '10:00:00', 'completed', NULL, 'gcash', 'paid', NULL, 'delivery', 'Mariveles, Bataan', 0, 1860.00, 4183.00, '2025-07-14 17:26:01', '2025-07-14 17:31:16'),
(9, 3, 1, 10, 1, 'pet', 'Dog', NULL, '/uploads/pets/pet_pet_3_1753060898837.png', '2025-07-26', '10:00:00', 'completed', NULL, 'gcash', 'paid', NULL, 'delivery', 'Mariveles, Bataan', 0, 1860.00, 4183.00, '2025-07-21 01:21:38', '2025-07-21 01:24:58'),
(10, 3, 1, 10, 1, 'asdad', 'Cat', NULL, NULL, '2025-07-27', '10:00:00', 'completed', NULL, 'gcash', 'paid', NULL, 'delivery', 'Mariveles, Bataan', 0, 1860.00, 4183.00, '2025-07-21 01:48:49', '2025-07-21 16:00:12'),
(11, 3, 1, 10, 1, 'sad', 'Bird', NULL, NULL, '2025-08-02', '10:00:00', 'cancelled', NULL, 'gcash', 'refunded', 4, 'pickup', NULL, 0, 0.00, 2323.00, '2025-07-21 01:57:38', '2025-07-21 01:59:32');

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
  `price_per_kg` decimal(10,2) DEFAULT 0.00,
  `delivery_fee_per_km` decimal(10,2) DEFAULT 0.00,
  `has_size_pricing` tinyint(1) DEFAULT 0,
  `uses_custom_options` tinyint(1) DEFAULT 0,
  `conditions` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_packages`
--

INSERT INTO `service_packages` (`package_id`, `provider_id`, `name`, `description`, `category`, `cremation_type`, `processing_time`, `price`, `price_per_kg`, `delivery_fee_per_km`, `has_size_pricing`, `uses_custom_options`, `conditions`, `is_active`, `created_at`, `updated_at`) VALUES
(13, 1, 'asdasd', 'asdasdasd', 'Private', 'Standard', '1-2 days', 21312.00, 11.00, 0.00, 0, 0, 'asdasda', 1, '2025-07-27 23:00:44', '2025-07-27 23:00:44');

-- --------------------------------------------------------

--
-- Table structure for table `service_providers`
--

CREATE TABLE `service_providers` (
  `provider_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `provider_type` enum('cremation','memorial','veterinary') DEFAULT NULL,
  `business_entity_type` enum('sole_proprietorship','corporation','partnership','limited_liability_company','cooperative') DEFAULT 'sole_proprietorship' COMMENT 'Legal business entity type for registration and compliance purposes',
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_providers`
--

INSERT INTO `service_providers` (`provider_id`, `user_id`, `name`, `provider_type`, `business_entity_type`, `contact_first_name`, `contact_last_name`, `phone`, `address`, `hours`, `description`, `application_status`, `verification_date`, `verification_notes`, `bir_certificate_path`, `business_permit_path`, `government_id_path`, `created_at`, `updated_at`) VALUES
(1, 2, 'Cremation', 'cremation', 'sole_proprietorship', 'Justin', 'Sibonga', '+639163178412', 'Samal, Bataan', '9-10pm', 'asddssdsdadsdad', 'approved', '2025-07-14 17:41:10', 'Application approved', '/uploads/documents/2/bir_certificate_1750371808943.png', '/uploads/documents/2/business_permit_1750371808764.png', '/uploads/documents/2/government_id_1750371808962.png', '2025-06-16 10:07:14', '2025-07-14 17:41:10');

-- --------------------------------------------------------

--
-- Table structure for table `service_types`
--

CREATE TABLE `service_types` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` enum('cremation','memorial','veterinary','other') DEFAULT 'cremation',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_types`
--

INSERT INTO `service_types` (`id`, `name`, `description`, `category`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Private Cremation', 'Individual cremation service for your beloved pet', 'cremation', 1, '2025-07-14 11:39:05', '2025-07-14 11:39:05'),
(2, 'Communal Cremation', 'Shared cremation service with other pets', 'cremation', 1, '2025-07-14 11:39:05', '2025-07-14 11:39:05'),
(3, 'Memorial Service', 'Memorial and remembrance services', 'memorial', 1, '2025-07-14 11:39:05', '2025-07-14 11:39:05'),
(4, 'Veterinary Consultation', 'Professional veterinary consultation', 'veterinary', 1, '2025-07-14 11:39:05', '2025-07-14 11:39:05'),
(5, 'Pet Transportation', 'Safe transportation services for pets', 'other', 1, '2025-07-14 11:39:05', '2025-07-14 11:39:05');

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
  `restriction_status` enum('none','restricted','suspended') DEFAULT 'none',
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

INSERT INTO `users` (`user_id`, `email`, `password`, `first_name`, `last_name`, `phone`, `address`, `gender`, `profile_picture`, `role`, `status`, `restriction_status`, `is_verified`, `is_otp_verified`, `last_login`, `created_at`, `updated_at`, `sms_notifications`, `email_notifications`) VALUES
(1, 'admin@rainbowpaws.com', '$2b$10$/TMOT7juT/ytAoRAOjjP.uOu1ZpQiMYRVnvQP9UJLv/KC2CfLaxTe', 'Admin', 'Admin', '+639163178412', 'balanga, Bataan', 'Male', '/uploads/admin-profile-pictures/1/admin_profile_picture_1750985838993.png', 'admin', 'active', 'none', 1, 1, '2025-08-01 00:47:08', '2025-06-14 07:15:42', '2025-08-01 00:47:08', 1, 1),
(2, 'justinmarlosibonga@gmail.com', '$2b$10$k1S.OTBJsw3va/1AwqkoEuZ8KpDN7aFrHHGtIjP2b2YBibW4Xnxuq', 'Justin', 'Sibonga', '+639163178412', 'Samal, Bataan', NULL, '/uploads/profile-pictures/2/profile_picture_1750949352242.png', 'business', 'active', 'none', 1, 1, '2025-08-01 02:00:10', '2025-06-16 10:07:10', '2025-08-01 02:00:10', 1, 1),
(3, 'pakalucamel@gmail.com', '$2b$10$FACNm48GgWanJsUCFaZW9OHTY1iHlokagC3hH5LCoPJ0Tr1ufssoa', 'Pet', 'Parents', '+639163178412', 'Mariveles, Bataan', NULL, '/uploads/profile-pictures/3/profile_picture_1752496830882.png', 'fur_parent', 'active', 'none', 1, 1, '2025-08-01 00:36:04', '2025-06-20 22:55:48', '2025-08-01 00:36:04', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_appeals`
--

CREATE TABLE `user_appeals` (
  `appeal_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_type` enum('personal','business') NOT NULL DEFAULT 'personal',
  `business_id` int(11) DEFAULT NULL,
  `appeal_type` enum('restriction','suspension','ban') NOT NULL DEFAULT 'restriction',
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `evidence_files` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`evidence_files`)),
  `status` enum('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  `admin_response` text DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_appeals`
--

INSERT INTO `user_appeals` (`appeal_id`, `user_id`, `user_type`, `business_id`, `appeal_type`, `subject`, `message`, `evidence_files`, `status`, `admin_response`, `admin_id`, `submitted_at`, `reviewed_at`, `resolved_at`, `created_at`, `updated_at`) VALUES
(8, 2, 'business', 1, 'restriction', 'TEST', 'asddasddasdd', '[]', 'approved', NULL, 1, '2025-07-14 13:07:54', NULL, '2025-07-14 13:08:20', '2025-07-14 13:07:54', '2025-07-14 13:08:20');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Manages active and historical user account restrictions';

--
-- Dumping data for table `user_restrictions`
--

INSERT INTO `user_restrictions` (`restriction_id`, `user_id`, `reason`, `restriction_date`, `duration`, `report_count`, `is_active`) VALUES
(25, 2, 'Restricted by admin', '2025-07-14 13:06:45', 'indefinite', 0, 0),
(26, 2, 'Restricted by admin', '2025-07-14 17:41:04', 'indefinite', 0, 0);

-- --------------------------------------------------------

--
-- Structure for view `bookings`
--
DROP TABLE IF EXISTS `bookings`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `bookings`  AS SELECT `service_bookings`.`id` AS `booking_id`, `service_bookings`.`id` AS `id`, `service_bookings`.`user_id` AS `user_id`, `service_bookings`.`provider_id` AS `provider_id`, `service_bookings`.`package_id` AS `package_id`, `service_bookings`.`service_type_id` AS `service_type_id`, `service_bookings`.`pet_name` AS `pet_name`, `service_bookings`.`pet_type` AS `pet_type`, `service_bookings`.`cause_of_death` AS `cause_of_death`, `service_bookings`.`pet_image_url` AS `pet_image_url`, `service_bookings`.`booking_date` AS `booking_date`, `service_bookings`.`booking_time` AS `booking_time`, `service_bookings`.`status` AS `status`, `service_bookings`.`special_requests` AS `special_requests`, `service_bookings`.`payment_method` AS `payment_method`, `service_bookings`.`payment_status` AS `payment_status`, `service_bookings`.`refund_id` AS `refund_id`, `service_bookings`.`delivery_option` AS `delivery_option`, `service_bookings`.`delivery_address` AS `delivery_address`, `service_bookings`.`delivery_distance` AS `delivery_distance`, `service_bookings`.`delivery_fee` AS `delivery_fee`, `service_bookings`.`price` AS `total_price`, `service_bookings`.`price` AS `price`, `service_bookings`.`created_at` AS `created_at`, `service_bookings`.`updated_at` AS `updated_at` FROM `service_bookings` ;

-- --------------------------------------------------------

--
-- Structure for view `business_profiles`
--
DROP TABLE IF EXISTS `business_profiles`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `business_profiles`  AS SELECT `service_providers`.`provider_id` AS `id`, `service_providers`.`user_id` AS `user_id`, `service_providers`.`name` AS `business_name`, `service_providers`.`provider_type` AS `business_type`, `service_providers`.`contact_first_name` AS `contact_first_name`, `service_providers`.`contact_last_name` AS `contact_last_name`, `service_providers`.`phone` AS `business_phone`, `service_providers`.`address` AS `business_address`, `service_providers`.`hours` AS `business_hours`, `service_providers`.`description` AS `service_description`, `service_providers`.`application_status` AS `application_status`, `service_providers`.`application_status` AS `verification_status`, `service_providers`.`verification_date` AS `verification_date`, `service_providers`.`verification_notes` AS `verification_notes`, `service_providers`.`bir_certificate_path` AS `bir_certificate_path`, `service_providers`.`business_permit_path` AS `business_permit_path`, `service_providers`.`government_id_path` AS `government_id_path`, `service_providers`.`created_at` AS `created_at`, `service_providers`.`updated_at` AS `updated_at` FROM `service_providers` WHERE `service_providers`.`provider_type` = 'cremation' ;

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
  ADD KEY `created_at` (`created_at`),
  ADD KEY `idx_admin_notifications_unread` (`is_read`,`type`,`created_at`);

--
-- Indexes for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `username` (`username`);

--
-- Indexes for table `appeal_history`
--
ALTER TABLE `appeal_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `idx_appeal_history` (`appeal_id`),
  ADD KEY `idx_changed_at` (`changed_at`);

--
-- Indexes for table `business_custom_options`
--
ALTER TABLE `business_custom_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_business_custom_options_provider` (`provider_id`),
  ADD KEY `idx_business_custom_options_type` (`option_type`),
  ADD KEY `idx_business_custom_options_active` (`is_active`);

--
-- Indexes for table `business_notifications`
--
ALTER TABLE `business_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `business_pet_types`
--
ALTER TABLE `business_pet_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_business_pet_types_provider` (`provider_id`),
  ADD KEY `idx_business_pet_types_active` (`is_active`);

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
-- Indexes for table `migration_history`
--
ALTER TABLE `migration_history`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `migration_name` (`migration_name`),
  ADD KEY `idx_migration_name` (`migration_name`),
  ADD KEY `idx_executed_at` (`executed_at`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_notifications_user_unread` (`user_id`,`is_read`,`created_at`);

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
-- Indexes for table `package_size_pricing`
--
ALTER TABLE `package_size_pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_package_size_pricing_package` (`package_id`),
  ADD KEY `idx_package_size_pricing_size` (`size_category`);

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
  ADD KEY `idx_refund_id` (`refund_id`),
  ADD KEY `idx_payment_transactions_booking_status` (`booking_id`,`status`,`created_at`),
  ADD KEY `idx_payment_transactions_analytics` (`payment_method`,`status`,`created_at`),
  ADD KEY `idx_payment_transactions_refunds` (`refund_id`,`status`,`created_at`);

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
  ADD KEY `idx_refund_id` (`refund_id`),
  ADD KEY `idx_service_bookings_user_dashboard` (`user_id`,`status`,`booking_date`),
  ADD KEY `idx_service_bookings_provider_dashboard` (`provider_id`,`status`,`booking_date`),
  ADD KEY `idx_service_bookings_admin_management` (`status`,`booking_date`,`created_at`),
  ADD KEY `idx_service_bookings_payment` (`payment_status`,`status`,`created_at`),
  ADD KEY `idx_service_type_id` (`service_type_id`);

--
-- Indexes for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD PRIMARY KEY (`package_id`),
  ADD KEY `idx_service_packages_provider` (`provider_id`),
  ADD KEY `idx_service_packages_search` (`is_active`,`category`,`provider_id`,`name`),
  ADD KEY `idx_service_packages_provider_active` (`provider_id`,`is_active`,`created_at`);

--
-- Indexes for table `service_providers`
--
ALTER TABLE `service_providers`
  ADD PRIMARY KEY (`provider_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_service_providers_type` (`provider_type`);

--
-- Indexes for table `service_types`
--
ALTER TABLE `service_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_service_types_category` (`category`),
  ADD KEY `idx_service_types_active` (`is_active`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_restriction_status` (`restriction_status`),
  ADD KEY `idx_users_search_composite` (`role`,`status`,`first_name`,`last_name`,`email`),
  ADD KEY `idx_users_auth_composite` (`email`,`status`,`is_verified`);

--
-- Indexes for table `user_appeals`
--
ALTER TABLE `user_appeals`
  ADD PRIMARY KEY (`appeal_id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `idx_user_appeals` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_submitted_at` (`submitted_at`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `appeal_history`
--
ALTER TABLE `appeal_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `business_custom_options`
--
ALTER TABLE `business_custom_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `business_notifications`
--
ALTER TABLE `business_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `business_pet_types`
--
ALTER TABLE `business_pet_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `email_log`
--
ALTER TABLE `email_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;

--
-- AUTO_INCREMENT for table `email_queue`
--
ALTER TABLE `email_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migration_history`
--
ALTER TABLE `migration_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `package_addons`
--
ALTER TABLE `package_addons`
  MODIFY `addon_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `package_images`
--
ALTER TABLE `package_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `package_size_pricing`
--
ALTER TABLE `package_size_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `pet_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `provider_availability`
--
ALTER TABLE `provider_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=549;

--
-- AUTO_INCREMENT for table `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refunds`
--
ALTER TABLE `refunds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `service_bookings`
--
ALTER TABLE `service_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `service_providers`
--
ALTER TABLE `service_providers`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `service_types`
--
ALTER TABLE `service_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `user_appeals`
--
ALTER TABLE `user_appeals`
  MODIFY `appeal_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  MODIFY `restriction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `appeal_history`
--
ALTER TABLE `appeal_history`
  ADD CONSTRAINT `appeal_history_ibfk_1` FOREIGN KEY (`appeal_id`) REFERENCES `user_appeals` (`appeal_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appeal_history_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `business_custom_options`
--
ALTER TABLE `business_custom_options`
  ADD CONSTRAINT `fk_business_custom_options_provider` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`provider_id`) ON DELETE CASCADE;

--
-- Constraints for table `business_notifications`
--
ALTER TABLE `business_notifications`
  ADD CONSTRAINT `business_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `business_pet_types`
--
ALTER TABLE `business_pet_types`
  ADD CONSTRAINT `fk_business_pet_types_provider` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`provider_id`) ON DELETE CASCADE;

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
-- Constraints for table `package_size_pricing`
--
ALTER TABLE `package_size_pricing`
  ADD CONSTRAINT `fk_package_size_pricing_package` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE;

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
-- Constraints for table `service_bookings`
--
ALTER TABLE `service_bookings`
  ADD CONSTRAINT `fk_service_bookings_service_type` FOREIGN KEY (`service_type_id`) REFERENCES `service_types` (`id`) ON DELETE SET NULL;

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
-- Constraints for table `user_appeals`
--
ALTER TABLE `user_appeals`
  ADD CONSTRAINT `user_appeals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_appeals_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  ADD CONSTRAINT `user_restrictions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
