-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 07, 2025 at 04:45 PM
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
(8, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-06-27 21:05:54'),
(9, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-06-27 21:06:00'),
(10, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 07:05:34'),
(11, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 07:05:39'),
(12, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 07:39:17'),
(13, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 07:39:21'),
(14, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 08:30:30'),
(15, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 08:30:36'),
(16, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 09:50:24'),
(17, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 10:05:25'),
(18, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 11:20:21'),
(19, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 11:20:31'),
(20, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 11:24:20'),
(21, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 11:25:32'),
(22, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 13:33:57'),
(23, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 13:34:12'),
(24, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 13:35:03'),
(25, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 14:05:44'),
(26, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 14:16:40'),
(27, 0, 'restrict_business', 'service_providers', 1, '{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}', NULL, '2025-07-07 14:17:28'),
(28, 0, 'restore_business', 'service_providers', 1, '{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}', NULL, '2025-07-07 14:37:12');

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
(1, 1, 'pending', 'approved', 1, '', '2025-07-07 11:11:15', 'Status changed from pending to approved by admin (ID: 1)'),
(2, 1, 'approved', 'approved', 1, NULL, '2025-07-07 11:11:15', 'Account restrictions removed and user status restored to active'),
(3, 2, 'pending', 'approved', 1, '', '2025-07-07 11:25:21', 'Status changed from pending to approved by admin (ID: 1)'),
(4, 2, 'approved', 'approved', 1, NULL, '2025-07-07 11:25:21', 'Account restrictions removed and user status restored to active'),
(5, 3, 'pending', 'approved', 1, '', '2025-07-07 13:37:27', 'Status changed from pending to approved by admin (ID: 1)'),
(6, 3, 'approved', 'approved', 1, NULL, '2025-07-07 13:37:27', 'Account restrictions removed and user status restored to active'),
(7, 4, 'pending', 'rejected', 1, '', '2025-07-07 14:07:58', 'Status changed from pending to rejected by admin (ID: 1)');

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

--
-- Dumping data for table `business_notifications`
--

INSERT INTO `business_notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `link`, `created_at`) VALUES
(1, 2, 'Real-time Updates Enabled', 'Hello Justin! You will now receive real-time notifications for your business.', 'success', 0, NULL, '2025-06-27 17:53:18');

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
(41, 'pakalucamel@gmail.com', 'Booking In progress - Rainbow Paws', '<07a497ef-f831-9c08-bc7b-797ed6ccc46e@gmail.com>', '2025-07-05 05:10:52'),
(42, 'pakalucamel@gmail.com', 'Booking Completed - Rainbow Paws', '<0223e87c-46ca-50fa-c1a9-438d2b072401@gmail.com>', '2025-07-05 05:12:57'),
(43, 'justinmarlosibonga@gmail.com', 'New 5-Star Review Received - Rainbow Paws', '<48a0739f-bebd-6abd-20e5-1577bbf0b26f@gmail.com>', '2025-07-05 05:14:19'),
(44, 'justinmarlosibonga@gmail.com', '🎉 Appeal Approved - Welcome Back!', '<b5359485-88d1-90c8-937e-cd6657008b10@gmail.com>', '2025-07-07 11:25:24'),
(45, 'justinmarlosibonga@gmail.com', '🚨 Account Restricted - Action Required', '<3faae0de-3c4b-dbb4-3e85-922395b62841@gmail.com>', '2025-07-07 13:33:57'),
(46, 'justinmarlosibonga@gmail.com', '🚨 Account Restricted - Action Required', '<d9d250f0-f375-8130-102a-00b9b5431777@gmail.com>', '2025-07-07 13:35:03'),
(47, 'justinmarlosibonga@gmail.com', '🎉 Appeal Approved - Welcome Back!', '<9a409a9c-4cb4-4ea1-1b8d-182f9b2b8ef8@gmail.com>', '2025-07-07 13:37:30'),
(48, 'justinmarlosibonga@gmail.com', '🚨 Account Restricted - Action Required', '<e9ae5c98-7b2e-91bc-e139-ed2af4c57488@gmail.com>', '2025-07-07 14:05:48'),
(49, 'justinmarlosibonga@gmail.com', '❌ Appeal Decision - Not Approved', '<60abc576-b17a-1546-fbad-1a9edff09cc3@gmail.com>', '2025-07-07 14:08:02'),
(50, 'justinmarlosibonga@gmail.com', '🚨 Account Restricted - Action Required', '<2f764c74-004e-a304-4eb8-eab4c40e54a5@gmail.com>', '2025-07-07 14:17:32'),
(51, 'admin@rainbowpaws.com', '🚨 New Appeal Submitted - Action Required', '<12114f7d-5f39-7acc-6e8b-a61af3ce48e1@gmail.com>', '2025-07-07 14:18:00'),
(52, 'admin@rainbowpaws.com', '🚨 New Appeal Submitted - Action Required', '<f4453620-e562-d966-53d7-283a26517680@gmail.com>', '2025-07-07 14:36:58');

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

--
-- Dumping data for table `migration_history`
--

INSERT INTO `migration_history` (`id`, `migration_name`, `executed_at`, `success`, `error_message`) VALUES
(1, 'restriction_system_users_update', '2025-06-27 18:07:21', 1, NULL),
(2, 'restriction_system_create_user_reports_table', '2025-06-27 18:08:44', 1, NULL),
(3, 'restriction_system_create_user_restrictions_table', '2025-06-27 18:09:45', 1, NULL),
(4, 'manual_database_cleanup', '2025-06-28 03:30:07', 1, 'Manual cleanup via phpMyAdmin');

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
(37, 3, 'Service In Progress', 'The null for Test Pet is now in progress. You will be notified when it\'s completed.', 'info', 1, '/user/furparent_dashboard/bookings?bookingId=7', '2025-07-05 05:10:49'),
(38, 3, 'Service Completed', 'The null for Test Pet has been completed. Thank you for choosing our services.', 'success', 1, '/user/furparent_dashboard/bookings?bookingId=7', '2025-07-05 05:12:54'),
(40, 3, 'Appeal Approved', 'Great news! Your appeal has been approved and your account restrictions have been lifted.', 'info', 0, '/appeals', '2025-07-07 11:11:15'),
(48, 3, 'Account Restricted', 'Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.', 'error', 0, '/appeals', '2025-07-07 14:16:57'),
(49, 3, 'Account Restricted', 'Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.', 'error', 0, '/appeals', '2025-07-07 14:17:06'),
(50, 3, 'Account Restricted', 'Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.', 'error', 0, '/appeals', '2025-07-07 14:17:16'),
(51, 3, 'Account Restricted', 'Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.', 'error', 0, '/appeals', '2025-07-07 14:17:24'),
(52, 3, 'Account Restricted', 'Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.', 'error', 0, '/appeals', '2025-07-07 14:17:24'),
(54, 1, 'New Appeal Submitted', 'undefined undefined has submitted an appeal: \"asdasd\"', 'warning', 0, '/admin/users/cremation?appealId=5&userId=2', '2025-07-07 14:17:57'),
(55, 3, 'Account Restricted', 'Your account has been restricted. Reason: Restricted by admin Duration: indefinite. You can submit an appeal to request a review.', 'error', 0, '/appeals', '2025-07-07 14:36:36'),
(56, 1, 'New Appeal Submitted', 'undefined undefined has submitted an appeal: \"asdasdas\"', 'warning', 0, '/admin/users/furparents?appealId=6&userId=3', '2025-07-07 14:36:56');

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
(4, -262050975, 'lucamel@gmail.com🎉 Appeal Approve', 'd - Welcome Back!<cfc4122e-65eb-c3eb-480d-bb39f0', 'e28af3@gmail.com>hk�V\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0', '', '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0', 0, '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0', NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00');

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
(7, 3, 1, 5, 'Test Pet', 'Dog', NULL, NULL, '2025-07-01', '10:00:00', 'completed', NULL, 'cash', 'paid', NULL, 'pickup', NULL, 0, 0.00, 500.00, '2025-06-27 17:47:27', '2025-07-05 05:12:54');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_providers`
--

INSERT INTO `service_providers` (`provider_id`, `user_id`, `name`, `provider_type`, `contact_first_name`, `contact_last_name`, `phone`, `address`, `hours`, `description`, `application_status`, `verification_date`, `verification_notes`, `bir_certificate_path`, `business_permit_path`, `government_id_path`, `created_at`, `updated_at`) VALUES
(1, 2, 'Justin Sibonga', 'cremation', 'Test', 'Nmae', '+639163178412', 'Orani, Bataan', 'asdadad', 'asddssdsdadsdad', 'approved', '2025-07-07 14:37:12', 'Application approved', '/uploads/documents/2/bir_certificate_1750371808943.png', '/uploads/documents/2/business_permit_1750371808764.png', '/uploads/documents/2/government_id_1750371808962.png', '2025-06-16 10:07:14', '2025-07-07 14:37:12');

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
(1, 'admin@rainbowpaws.com', '$2b$10$/TMOT7juT/ytAoRAOjjP.uOu1ZpQiMYRVnvQP9UJLv/KC2CfLaxTe', 'Admin', 'Admin', '+639163178412', 'balanga, Bataan', 'Male', '/uploads/admin-profile-pictures/1/admin_profile_picture_1750985838993.png', 'admin', 'active', 'none', 1, 1, '2025-07-07 14:37:04', '2025-06-14 07:15:42', '2025-07-07 14:37:04', 1, 1),
(2, 'justinmarlosibonga@gmail.com', '$2b$10$k1S.OTBJsw3va/1AwqkoEuZ8KpDN7aFrHHGtIjP2b2YBibW4Xnxuq', 'Justin', 'Sibonga', '+639163178412', 'Orani, Bataan', NULL, '/uploads/profile-pictures/2/profile_picture_1750949352242.png', 'business', 'active', 'none', 1, 1, '2025-07-07 14:38:27', '2025-06-16 10:07:10', '2025-07-07 14:38:27', 1, 1),
(3, 'pakalucamel@gmail.com', '$2b$10$FACNm48GgWanJsUCFaZW9OHTY1iHlokagC3hH5LCoPJ0Tr1ufssoa', 'Pet', 'Parent', NULL, NULL, NULL, '/uploads/profile-pictures/3/profile_picture_1751873254358.png', 'fur_parent', 'restricted', 'none', 1, 1, '2025-07-07 14:36:47', '2025-06-20 22:55:48', '2025-07-07 14:36:47', 1, 1);

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
(1, 3, 'personal', NULL, 'restriction', 'ASDASDASD', 'asdasdasdasddads', '[]', 'approved', NULL, 1, '2025-07-07 11:10:28', NULL, '2025-07-07 11:11:15', '2025-07-07 11:10:28', '2025-07-07 11:11:15'),
(2, 2, 'business', NULL, 'restriction', 'adsadas', 'asdasdsdsad', '[]', 'approved', NULL, 1, '2025-07-07 11:24:41', NULL, '2025-07-07 11:25:21', '2025-07-07 11:24:41', '2025-07-07 11:25:21'),
(3, 2, 'business', NULL, 'restriction', 'asdasdadsdasdsdsd', 'asdasdasdadasdsdsd', '[]', 'approved', NULL, 1, '2025-07-07 13:36:53', NULL, '2025-07-07 13:37:27', '2025-07-07 13:36:53', '2025-07-07 13:37:27'),
(4, 2, 'business', NULL, 'restriction', 'asdasdsdasdadsdsdasdasd', 'asdasdasdasd', '[]', 'rejected', NULL, 1, '2025-07-07 14:06:07', NULL, '2025-07-07 14:07:58', '2025-07-07 14:06:07', '2025-07-07 14:07:58'),
(5, 2, 'business', NULL, 'restriction', 'asdasd', 'asdad', '[]', 'pending', NULL, NULL, '2025-07-07 14:17:57', NULL, NULL, '2025-07-07 14:17:57', '2025-07-07 14:17:57'),
(6, 3, 'personal', NULL, 'restriction', 'asdasdas', 'asdasdasd', '[]', 'pending', NULL, NULL, '2025-07-07 14:36:55', NULL, NULL, '2025-07-07 14:36:55', '2025-07-07 14:36:55');

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
(6, 2, 'Restricted by admin', '2025-06-27 21:05:54', 'indefinite', 0, 0),
(7, 2, 'Restricted by admin', '2025-07-07 07:05:34', 'indefinite', 0, 0),
(8, 2, 'Restricted by admin', '2025-07-07 07:39:17', 'indefinite', 0, 0),
(9, 2, 'Restricted by admin', '2025-07-07 08:30:30', 'indefinite', 0, 0),
(10, 2, 'Restricted by admin', '2025-07-07 09:50:24', 'indefinite', 0, 0),
(11, 3, 'Restricted by admin', '2025-07-07 10:54:48', 'indefinite', 0, 0),
(12, 2, 'Restricted by admin', '2025-07-07 11:20:21', 'indefinite', 0, 0),
(13, 3, 'Restricted by admin', '2025-07-07 11:21:32', 'indefinite', 0, 0),
(14, 2, 'Restricted by admin', '2025-07-07 11:24:20', 'indefinite', 0, 0),
(15, 3, 'Restricted by admin', '2025-07-07 13:33:21', 'indefinite', 0, 0),
(16, 2, 'Restricted by admin', '2025-07-07 13:33:53', 'indefinite', 0, 0),
(17, 2, 'Restricted by admin', '2025-07-07 13:35:01', 'indefinite', 0, 0),
(18, 2, 'asdaddsdasd', '2025-07-07 14:05:44', 'indefinite', 0, 0),
(19, 3, 'asdasdsd asdasdasd asdasdas asdasd', '2025-07-07 14:16:57', 'indefinite', 0, 0),
(20, 2, 'Restricted by admin', '2025-07-07 14:17:28', 'indefinite', 0, 0),
(21, 3, 'Restricted by admin', '2025-07-07 14:36:35', 'indefinite', 0, 1);

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
  ADD KEY `idx_service_bookings_payment` (`payment_status`,`status`,`created_at`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `appeal_history`
--
ALTER TABLE `appeal_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `business_notifications`
--
ALTER TABLE `business_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `email_log`
--
ALTER TABLE `email_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

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
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `pet_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `provider_availability`
--
ALTER TABLE `provider_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=381;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `service_bookings`
--
ALTER TABLE `service_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
-- AUTO_INCREMENT for table `user_appeals`
--
ALTER TABLE `user_appeals`
  MODIFY `appeal_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  MODIFY `restriction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

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
