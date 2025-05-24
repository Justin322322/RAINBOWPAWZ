-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 24, 2025 at 01:14 AM
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
(1, 1, 'New Cremation Center Registration', 'business has registered as a cremation center and is pending verification.', 'info', 0, '/admin/applications/2', '2025-05-23 01:56:12');

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
(1, 4, '/uploads/packages/cremation_1.jpg', 1, '2025-05-23 02:43:36'),
(2, 5, '/uploads/packages/cremation_2.jpg', 1, '2025-05-23 02:43:36'),
(3, 6, '/uploads/packages/cremation_3.jpg', 1, '2025-05-23 02:43:36');

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
(1, 4, 'Individual cremation', '2025-05-23 02:43:36'),
(2, 4, 'Basic ceramic urn', '2025-05-23 02:43:36'),
(3, 4, 'Certificate of cremation', '2025-05-23 02:43:36'),
(4, 5, 'Individual cremation', '2025-05-23 02:43:36'),
(5, 5, 'Premium wooden urn', '2025-05-23 02:43:36'),
(6, 5, 'Paw print keepsake', '2025-05-23 02:43:36'),
(7, 5, 'Certificate of cremation', '2025-05-23 02:43:36'),
(8, 5, 'Memorial photo frame', '2025-05-23 02:43:36'),
(9, 6, 'Communal cremation', '2025-05-23 02:43:36'),
(10, 6, 'Certificate of cremation', '2025-05-23 02:43:36');

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
(1, 4, '2025-05-23', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(2, 4, '2025-05-24', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(3, 4, '2025-05-26', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(4, 4, '2025-05-27', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(5, 4, '2025-05-28', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(6, 4, '2025-05-29', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(7, 4, '2025-05-30', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(8, 4, '2025-05-31', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(9, 4, '2025-06-02', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(10, 4, '2025-06-03', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(11, 4, '2025-06-04', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(12, 4, '2025-06-05', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(13, 4, '2025-06-06', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(14, 4, '2025-06-07', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(15, 4, '2025-06-09', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(16, 4, '2025-06-10', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(17, 4, '2025-06-11', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(18, 4, '2025-06-12', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(19, 4, '2025-06-13', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(20, 4, '2025-06-14', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(21, 4, '2025-06-16', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(22, 4, '2025-06-17', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(23, 4, '2025-06-18', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(24, 4, '2025-06-19', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(25, 4, '2025-06-20', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(26, 4, '2025-06-21', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36');

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
(1, 4, '2025-05-23', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(2, 4, '2025-05-23', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(3, 4, '2025-05-23', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(4, 4, '2025-05-23', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(5, 4, '2025-05-23', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(6, 4, '2025-05-23', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(7, 4, '2025-05-23', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(8, 4, '2025-05-23', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(9, 4, '2025-05-24', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(10, 4, '2025-05-24', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(11, 4, '2025-05-24', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(12, 4, '2025-05-24', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(13, 4, '2025-05-24', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(14, 4, '2025-05-24', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(15, 4, '2025-05-24', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(16, 4, '2025-05-24', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(17, 4, '2025-05-26', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(18, 4, '2025-05-26', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(19, 4, '2025-05-26', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(20, 4, '2025-05-26', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(21, 4, '2025-05-26', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(22, 4, '2025-05-26', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(23, 4, '2025-05-26', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(24, 4, '2025-05-26', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(25, 4, '2025-05-27', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(26, 4, '2025-05-27', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(27, 4, '2025-05-27', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(28, 4, '2025-05-27', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(29, 4, '2025-05-27', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(30, 4, '2025-05-27', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(31, 4, '2025-05-27', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(32, 4, '2025-05-27', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(33, 4, '2025-05-28', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(34, 4, '2025-05-28', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(35, 4, '2025-05-28', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(36, 4, '2025-05-28', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(37, 4, '2025-05-28', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(38, 4, '2025-05-28', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(39, 4, '2025-05-28', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(40, 4, '2025-05-28', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(41, 4, '2025-05-29', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(42, 4, '2025-05-29', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(43, 4, '2025-05-29', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(44, 4, '2025-05-29', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(45, 4, '2025-05-29', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(46, 4, '2025-05-29', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(47, 4, '2025-05-29', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(48, 4, '2025-05-29', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(49, 4, '2025-05-30', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(50, 4, '2025-05-30', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(51, 4, '2025-05-30', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(52, 4, '2025-05-30', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(53, 4, '2025-05-30', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(54, 4, '2025-05-30', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(55, 4, '2025-05-30', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(56, 4, '2025-05-30', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(57, 4, '2025-05-31', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(58, 4, '2025-05-31', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(59, 4, '2025-05-31', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(60, 4, '2025-05-31', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(61, 4, '2025-05-31', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(62, 4, '2025-05-31', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(63, 4, '2025-05-31', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(64, 4, '2025-05-31', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(65, 4, '2025-06-02', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(66, 4, '2025-06-02', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(67, 4, '2025-06-02', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(68, 4, '2025-06-02', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(69, 4, '2025-06-02', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(70, 4, '2025-06-02', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(71, 4, '2025-06-02', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(72, 4, '2025-06-02', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(73, 4, '2025-06-03', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(74, 4, '2025-06-03', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(75, 4, '2025-06-03', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(76, 4, '2025-06-03', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(77, 4, '2025-06-03', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(78, 4, '2025-06-03', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(79, 4, '2025-06-03', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(80, 4, '2025-06-03', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(81, 4, '2025-06-04', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(82, 4, '2025-06-04', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(83, 4, '2025-06-04', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(84, 4, '2025-06-04', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(85, 4, '2025-06-04', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(86, 4, '2025-06-04', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(87, 4, '2025-06-04', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(88, 4, '2025-06-04', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(89, 4, '2025-06-05', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(90, 4, '2025-06-05', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(91, 4, '2025-06-05', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(92, 4, '2025-06-05', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(93, 4, '2025-06-05', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(94, 4, '2025-06-05', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(95, 4, '2025-06-05', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(96, 4, '2025-06-05', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(97, 4, '2025-06-06', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(98, 4, '2025-06-06', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(99, 4, '2025-06-06', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(100, 4, '2025-06-06', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(101, 4, '2025-06-06', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(102, 4, '2025-06-06', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(103, 4, '2025-06-06', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(104, 4, '2025-06-06', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(105, 4, '2025-06-07', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(106, 4, '2025-06-07', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(107, 4, '2025-06-07', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(108, 4, '2025-06-07', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(109, 4, '2025-06-07', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(110, 4, '2025-06-07', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(111, 4, '2025-06-07', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(112, 4, '2025-06-07', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(113, 4, '2025-06-09', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(114, 4, '2025-06-09', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(115, 4, '2025-06-09', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(116, 4, '2025-06-09', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(117, 4, '2025-06-09', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(118, 4, '2025-06-09', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(119, 4, '2025-06-09', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(120, 4, '2025-06-09', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(121, 4, '2025-06-10', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(122, 4, '2025-06-10', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(123, 4, '2025-06-10', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(124, 4, '2025-06-10', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(125, 4, '2025-06-10', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(126, 4, '2025-06-10', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(127, 4, '2025-06-10', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(128, 4, '2025-06-10', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(129, 4, '2025-06-11', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(130, 4, '2025-06-11', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(131, 4, '2025-06-11', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(132, 4, '2025-06-11', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(133, 4, '2025-06-11', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(134, 4, '2025-06-11', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(135, 4, '2025-06-11', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(136, 4, '2025-06-11', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(137, 4, '2025-06-12', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(138, 4, '2025-06-12', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(139, 4, '2025-06-12', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(140, 4, '2025-06-12', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(141, 4, '2025-06-12', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(142, 4, '2025-06-12', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(143, 4, '2025-06-12', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(144, 4, '2025-06-12', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(145, 4, '2025-06-13', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(146, 4, '2025-06-13', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(147, 4, '2025-06-13', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(148, 4, '2025-06-13', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(149, 4, '2025-06-13', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(150, 4, '2025-06-13', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(151, 4, '2025-06-13', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(152, 4, '2025-06-13', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(153, 4, '2025-06-14', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(154, 4, '2025-06-14', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(155, 4, '2025-06-14', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(156, 4, '2025-06-14', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(157, 4, '2025-06-14', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(158, 4, '2025-06-14', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(159, 4, '2025-06-14', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(160, 4, '2025-06-14', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(161, 4, '2025-06-16', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(162, 4, '2025-06-16', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(163, 4, '2025-06-16', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(164, 4, '2025-06-16', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(165, 4, '2025-06-16', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(166, 4, '2025-06-16', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(167, 4, '2025-06-16', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(168, 4, '2025-06-16', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(169, 4, '2025-06-17', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(170, 4, '2025-06-17', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(171, 4, '2025-06-17', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(172, 4, '2025-06-17', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(173, 4, '2025-06-17', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(174, 4, '2025-06-17', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(175, 4, '2025-06-17', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(176, 4, '2025-06-17', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(177, 4, '2025-06-18', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(178, 4, '2025-06-18', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(179, 4, '2025-06-18', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(180, 4, '2025-06-18', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(181, 4, '2025-06-18', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(182, 4, '2025-06-18', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(183, 4, '2025-06-18', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(184, 4, '2025-06-18', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(185, 4, '2025-06-19', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(186, 4, '2025-06-19', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(187, 4, '2025-06-19', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(188, 4, '2025-06-19', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(189, 4, '2025-06-19', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(190, 4, '2025-06-19', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(191, 4, '2025-06-19', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(192, 4, '2025-06-19', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(193, 4, '2025-06-20', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(194, 4, '2025-06-20', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(195, 4, '2025-06-20', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(196, 4, '2025-06-20', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(197, 4, '2025-06-20', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(198, 4, '2025-06-20', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(199, 4, '2025-06-20', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(200, 4, '2025-06-20', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(201, 4, '2025-06-21', '09:00:00', '10:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(202, 4, '2025-06-21', '10:00:00', '11:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(203, 4, '2025-06-21', '11:00:00', '12:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(204, 4, '2025-06-21', '12:00:00', '13:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(205, 4, '2025-06-21', '13:00:00', '14:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(206, 4, '2025-06-21', '14:00:00', '15:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(207, 4, '2025-06-21', '15:00:00', '16:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(208, 4, '2025-06-21', '16:00:00', '17:00:00', 'all', '2025-05-23 02:43:36', '2025-05-23 02:43:36');

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
  `payment_status` enum('not_paid','paid','refunded') DEFAULT 'not_paid',
  `delivery_option` enum('pickup','delivery') DEFAULT 'pickup',
  `delivery_address` text DEFAULT NULL,
  `delivery_distance` float DEFAULT 0,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(4, 4, 'Basic Private Cremation', 'Individual cremation service with basic urn included.', 'Private', 'Standard', '1-2 days', 3500.00, 15.00, 'For pets up to 20kg. Additional fees may apply for larger pets.', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(5, 4, 'Premium Private Cremation', 'Individual cremation service with premium wooden urn and paw print keepsake.', 'Private', 'Premium', '1-2 days', 5500.00, 15.00, 'For pets up to 30kg. Additional fees may apply for larger pets.', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36'),
(6, 4, 'Communal Cremation', 'Shared cremation service for multiple pets.', 'Communal', 'Standard', '1-3 days', 1500.00, 15.00, 'For pets up to 20kg. Ashes are not returned with communal cremation.', 1, '2025-05-23 02:43:36', '2025-05-23 02:43:36');

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
(4, 3, 'Rainbow Paws Cremation Center', 'cremation', 'Justin', 'Sibonga', '09123456789', 'Samal Bataan', 'Bataan', 'Samal', '2113', '8:00 AM - 5:00 PM, Monday to Saturday', 'Professional pet cremation services with care and respect.', 'approved', '2025-05-23 02:43:36', NULL, '/uploads/documents/bir_certificate.jpg', '/uploads/documents/business_permit.jpg', '/uploads/documents/government_id.jpg', 0, '2025-05-23 02:43:36', '2025-05-23 02:43:36');

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
  `role` enum('fur_parent','business','admin') NOT NULL DEFAULT 'fur_parent',
  `status` enum('active','inactive','suspended','restricted') DEFAULT 'active',
  `is_verified` tinyint(1) DEFAULT 0,
  `is_otp_verified` tinyint(1) DEFAULT 0,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `email`, `password`, `first_name`, `last_name`, `phone`, `address`, `gender`, `role`, `status`, `is_verified`, `is_otp_verified`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin@rainbowpaws.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', NULL, NULL, NULL, 'admin', 'active', 1, 1, NULL, '2025-05-20 11:23:57', '2025-05-20 11:23:57'),
(3, 'justinmarlosibonga@gmail.com', '$2b$10$o5Z8B7.WqzcOecJ4Nq51DO869mMmTFAGZc5IDv6J.3Ym6zIRWiwh.', 'Justin', 'Sibonga', 'asdsd', 'Capitol Compound, Tenejero', NULL, 'business', 'active', 1, 1, '2025-05-23 23:09:25', '2025-05-23 01:56:11', '2025-05-23 23:09:25');

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
-- Indexes for dumped tables
--

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
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `otp_attempts`
--
ALTER TABLE `otp_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `package_addons`
--
ALTER TABLE `package_addons`
  MODIFY `addon_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `package_images`
--
ALTER TABLE `package_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `package_inclusions`
--
ALTER TABLE `package_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pets`
--
ALTER TABLE `pets`
  MODIFY `pet_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `provider_availability`
--
ALTER TABLE `provider_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `provider_time_slots`
--
ALTER TABLE `provider_time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=209;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_bookings`
--
ALTER TABLE `service_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `service_providers`
--
ALTER TABLE `service_providers`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_restrictions`
--
ALTER TABLE `user_restrictions`
  MODIFY `restriction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

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
