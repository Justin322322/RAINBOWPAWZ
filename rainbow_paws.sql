-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 21, 2025 at 03:31 AM
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
(77, 'pakalucamel@gmail.com', 'Booking Completed - Rainbow Paws', '<b29bfb8f-0049-99be-9c4d-0636ddfbde48@gmail.com>', '2025-07-21 01:25:00');

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
(66, 2, 'Appeal Approved', 'Great news! Your appeal has been approved and your account restrictions have been lifted.', 'info', 1, '/appeals', '2025-07-14 13:08:20'),
(68, 2, 'New Booking Received', 'You have received a new booking for asasdasd\'s 3asd.', 'info', 1, '/cremation/bookings/8', '2025-07-14 17:26:05'),
(72, 2, 'New Review Received', 'Pet Parents left a 5-star review for your service.', 'info', 1, '/cremation/reviews', '2025-07-14 17:32:10'),
(73, 2, 'Account Restricted', 'Your cremation center account has been restricted. Reason: Restricted by admin. You can submit an appeal to request a review.', 'error', 1, '/appeals', '2025-07-14 17:41:04'),
(74, 3, 'Booking Created Successfully', 'Your booking for pet\'s 3asd with Cremation has been created and is pending confirmation.', 'success', 1, '/user/furparent_dashboard/bookings?bookingId=9', '2025-07-21 01:21:38'),
(75, 2, 'New Booking Received', 'You have received a new booking for pet\'s 3asd.', 'info', 1, '/cremation/bookings/9', '2025-07-21 01:21:42'),
(76, 3, 'Booking Confirmed', 'Your booking for pet\'s 3asd on July 26, 2025 at 10:00:00 has been confirmed.', 'success', 0, '/user/furparent_dashboard/bookings?bookingId=9', '2025-07-21 01:24:44'),
(77, 3, 'Service In Progress', 'The 3asd for pet is now in progress. You will be notified when it\'s completed.', 'info', 1, '/user/furparent_dashboard/bookings?bookingId=9', '2025-07-21 01:24:52'),
(78, 3, 'Service Completed', 'The 3asd for pet has been completed. Thank you for choosing our services.', 'success', 1, '/user/furparent_dashboard/bookings?bookingId=9', '2025-07-21 01:24:58');

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

--
-- Dumping data for table `package_images`
--

INSERT INTO `package_images` (`image_id`, `package_id`, `image_path`, `display_order`, `created_at`) VALUES
(13, 10, '/uploads/packages/10/package_1_1752513750936.png', 0, '2025-07-14 17:22:48');

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
(22, 10, 'asdad', '2025-07-14 17:22:48');

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
(8, 9, NULL, 'src_xzyYs8x1AzQeywEupffFqccP', 4183.00, 'PHP', 'gcash', 'succeeded', NULL, NULL, 'paymongo', NULL, 'https://secure-authentication.paymongo.com/sources?id=src_xzyYs8x1AzQeywEupffFqccP', 'http://localhost:3000/payment/success?booking_id=9', NULL, '{\"source_id\":\"src_xzyYs8x1AzQeywEupffFqccP\",\"customer_info\":{\"name\":\"Pet Parents\",\"email\":\"pakalucamel@gmail.com\",\"phone\":\"+639163178412\"}}', '2025-07-21 01:21:45', '2025-07-21 01:21:49');

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
(6, 3, 'pet', 'Dog', NULL, NULL, NULL, NULL, '/uploads/pets/pet_pet_3_1753060898837.png', NULL, '2025-07-21 01:21:38', '2025-07-21 01:21:38');

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
(384, 1, '2025-07-27', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(385, 1, '2025-08-02', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(386, 1, '2025-08-03', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(387, 1, '2025-08-09', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(388, 1, '2025-08-10', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(389, 1, '2025-08-16', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(390, 1, '2025-08-17', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(391, 1, '2025-08-23', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(392, 1, '2025-08-24', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(393, 1, '2025-08-30', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
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
(411, 1, '2025-11-01', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(412, 1, '2025-11-02', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(413, 1, '2025-11-08', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(414, 1, '2025-11-09', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(415, 1, '2025-11-15', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(416, 1, '2025-11-16', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(417, 1, '2025-11-22', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(418, 1, '2025-11-23', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(419, 1, '2025-11-29', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(420, 1, '2025-11-30', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(421, 1, '2025-12-06', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(422, 1, '2025-12-07', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(423, 1, '2025-12-13', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(424, 1, '2025-12-14', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(425, 1, '2025-12-20', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(426, 1, '2025-12-21', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(427, 1, '2025-12-27', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11'),
(428, 1, '2025-12-28', '10:00:00', '16:00:00', '[10]', '2025-07-14 17:24:11', '2025-07-14 17:24:11');

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
(5, 3, 1, 8, 5, 'great service', '2025-07-14 17:32:10', '2025-07-14 17:32:10', '2025-07-19 09:32:10');

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
(9, 3, 1, 10, 1, 'pet', 'Dog', NULL, '/uploads/pets/pet_pet_3_1753060898837.png', '2025-07-26', '10:00:00', 'completed', NULL, 'gcash', 'paid', NULL, 'delivery', 'Mariveles, Bataan', 0, 1860.00, 4183.00, '2025-07-21 01:21:38', '2025-07-21 01:24:58');

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
(10, 1, '3asd', 'asdasdasd', 'Private', 'Standard', '2-3 days', 2323.00, 0.00, 'asdasdadsd', 1, '2025-07-14 17:22:47', '2025-07-14 17:22:55');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_providers`
--

INSERT INTO `service_providers` (`provider_id`, `user_id`, `name`, `provider_type`, `contact_first_name`, `contact_last_name`, `phone`, `address`, `hours`, `description`, `application_status`, `verification_date`, `verification_notes`, `bir_certificate_path`, `business_permit_path`, `government_id_path`, `created_at`, `updated_at`) VALUES
(1, 2, 'Cremation', 'cremation', 'Justin', 'Sibonga', '+639163178412', 'Samal, Bataan', '9-10pm', 'asddssdsdadsdad', 'approved', '2025-07-14 17:41:10', 'Application approved', '/uploads/documents/2/bir_certificate_1750371808943.png', '/uploads/documents/2/business_permit_1750371808764.png', '/uploads/documents/2/government_id_1750371808962.png', '2025-06-16 10:07:14', '2025-07-14 17:41:10');

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
(1, 'admin@rainbowpaws.com', '$2b$10$/TMOT7juT/ytAoRAOjjP.uOu1ZpQiMYRVnvQP9UJLv/KC2CfLaxTe', 'Admin', 'Admin', '+639163178412', 'balanga, Bataan', 'Male', '/uploads/admin-profile-pictures/1/admin_profile_picture_1750985838993.png', 'admin', 'active', 'none', 1, 1, '2025-07-21 00:42:58', '2025-06-14 07:15:42', '2025-07-21 00:42:58', 1, 1),
(2, 'justinmarlosibonga@gmail.com', '$2b$10$k1S.OTBJsw3va/1AwqkoEuZ8KpDN7aFrHHGtIjP2b2YBibW4Xnxuq', 'Justin', 'Sibonga', '+639163178412', 'Samal, Bataan', NULL, '/uploads/profile-pictures/2/profile_picture_1750949352242.png', 'business', 'active', 'none', 1, 1, '2025-07-21 01:24:30', '2025-06-16 10:07:10', '2025-07-21 01:24:30', 1, 1),
(3, 'pakalucamel@gmail.com', '$2b$10$FACNm48GgWanJsUCFaZW9OHTY1iHlokagC3hH5LCoPJ0Tr1ufssoa', 'Pet', 'Parents', '+639163178412', 'Mariveles, Bataan', NULL, '/uploads/profile-pictures/3/profile_picture_1752496830882.png', 'fur_parent', 'active', 'none', 1, 1, '2025-07-21 01:25:56', '2025-06-20 22:55:48', '2025-07-21 01:25:56', 1, 1);

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
-- Indexes for table `business_notifications`
--
ALTER TABLE `business_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
-- AUTO_INCREMENT for table `business_notifications`
--
ALTER TABLE `business_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `email_log`
--
ALTER TABLE `email_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `package_addons`
--
ALTER TABLE `package_addons`
  MODIFY `addon_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `package_images`
--
ALTER TABLE `package_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `pet_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `provider_availability`
--
ALTER TABLE `provider_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=429;

--
-- AUTO_INCREMENT for table `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refunds`
--
ALTER TABLE `refunds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `service_bookings`
--
ALTER TABLE `service_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `service_providers`
--
ALTER TABLE `service_providers`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `service_types`
--
ALTER TABLE `service_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
-- Constraints for table `business_notifications`
--
ALTER TABLE `business_notifications`
  ADD CONSTRAINT `business_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

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
