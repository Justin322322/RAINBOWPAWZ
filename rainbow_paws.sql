-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: rainbow_paws
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `rainbow_paws`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `rainbow_paws` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `rainbow_paws`;

--
-- Table structure for table `admin_logs`
--

DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  KEY `entity_type` (`entity_type`,`entity_id`),
  KEY `action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_logs`
--

LOCK TABLES `admin_logs` WRITE;
/*!40000 ALTER TABLE `admin_logs` DISABLE KEYS */;
INSERT INTO `admin_logs` VALUES (8,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-06-27 21:05:54'),(9,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-06-27 21:06:00'),(10,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 07:05:34'),(11,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 07:05:39'),(12,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 07:39:17'),(13,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 07:39:21'),(14,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 08:30:30'),(15,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 08:30:36'),(16,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 09:50:24'),(17,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 10:05:25'),(18,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 11:20:21'),(19,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 11:20:31'),(20,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 11:24:20'),(21,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 11:25:32'),(22,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 13:33:57'),(23,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 13:34:12'),(24,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 13:35:03'),(25,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 14:05:44'),(26,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 14:16:40'),(27,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 14:17:28'),(28,0,'restore_business','service_providers',1,'{\"action\":\"restore\",\"businessId\":1,\"newStatus\":\"verified\",\"newApplicationStatus\":\"approved\"}',NULL,'2025-07-07 14:37:12'),(29,0,'restrict_business','service_providers',1,'{\"action\":\"restrict\",\"businessId\":1,\"newStatus\":\"restricted\",\"newApplicationStatus\":\"restricted\"}',NULL,'2025-07-07 15:02:22');
/*!40000 ALTER TABLE `admin_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_notifications`
--

DROP TABLE IF EXISTS `admin_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `type` (`type`),
  KEY `is_read` (`is_read`),
  KEY `created_at` (`created_at`),
  KEY `idx_admin_notifications_unread` (`is_read`,`type`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_notifications`
--

LOCK TABLES `admin_notifications` WRITE;
/*!40000 ALTER TABLE `admin_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_profiles`
--

DROP TABLE IF EXISTS `admin_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `admin_role` varchar(50) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `username` (`username`),
  CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_profiles`
--

LOCK TABLES `admin_profiles` WRITE;
/*!40000 ALTER TABLE `admin_profiles` DISABLE KEYS */;
INSERT INTO `admin_profiles` VALUES (1,1,'admin','Admin Admin','admin','2025-06-26 00:24:53','2025-07-07 07:06:49');
/*!40000 ALTER TABLE `admin_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appeal_history`
--

DROP TABLE IF EXISTS `appeal_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appeal_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `appeal_id` int(11) NOT NULL,
  `previous_status` enum('pending','under_review','approved','rejected') DEFAULT NULL,
  `new_status` enum('pending','under_review','approved','rejected') NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `admin_response` text DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `admin_id` (`admin_id`),
  KEY `idx_appeal_history` (`appeal_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `appeal_history_ibfk_1` FOREIGN KEY (`appeal_id`) REFERENCES `user_appeals` (`appeal_id`) ON DELETE CASCADE,
  CONSTRAINT `appeal_history_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appeal_history`
--

LOCK TABLES `appeal_history` WRITE;
/*!40000 ALTER TABLE `appeal_history` DISABLE KEYS */;
INSERT INTO `appeal_history` VALUES (1,1,'pending','approved',1,'','2025-07-07 11:11:15','Status changed from pending to approved by admin (ID: 1)'),(2,1,'approved','approved',1,NULL,'2025-07-07 11:11:15','Account restrictions removed and user status restored to active'),(3,2,'pending','approved',1,'','2025-07-07 11:25:21','Status changed from pending to approved by admin (ID: 1)'),(4,2,'approved','approved',1,NULL,'2025-07-07 11:25:21','Account restrictions removed and user status restored to active'),(5,3,'pending','approved',1,'','2025-07-07 13:37:27','Status changed from pending to approved by admin (ID: 1)'),(6,3,'approved','approved',1,NULL,'2025-07-07 13:37:27','Account restrictions removed and user status restored to active'),(7,4,'pending','rejected',1,'','2025-07-07 14:07:58','Status changed from pending to rejected by admin (ID: 1)'),(8,6,'pending','approved',1,'','2025-07-07 15:02:42','Status changed from pending to approved by admin (ID: 1)'),(9,6,'approved','approved',1,NULL,'2025-07-07 15:02:42','Account restrictions removed and user status restored to active');
/*!40000 ALTER TABLE `appeal_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_notifications`
--

DROP TABLE IF EXISTS `business_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `business_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_notifications`
--

LOCK TABLES `business_notifications` WRITE;
/*!40000 ALTER TABLE `business_notifications` DISABLE KEYS */;
INSERT INTO `business_notifications` VALUES (1,2,'Real-time Updates Enabled','Hello Justin! You will now receive real-time notifications for your business.','success',0,NULL,'2025-06-27 17:53:18');
/*!40000 ALTER TABLE `business_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_log`
--

DROP TABLE IF EXISTS `email_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recipient` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `recipient` (`recipient`),
  KEY `sent_at` (`sent_at`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_log`
--

LOCK TABLES `email_log` WRITE;
/*!40000 ALTER TABLE `email_log` DISABLE KEYS */;
INSERT INTO `email_log` VALUES (41,'pakalucamel@gmail.com','Booking In progress - Rainbow Paws','<07a497ef-f831-9c08-bc7b-797ed6ccc46e@gmail.com>','2025-07-05 05:10:52'),(42,'pakalucamel@gmail.com','Booking Completed - Rainbow Paws','<0223e87c-46ca-50fa-c1a9-438d2b072401@gmail.com>','2025-07-05 05:12:57'),(43,'justinmarlosibonga@gmail.com','New 5-Star Review Received - Rainbow Paws','<48a0739f-bebd-6abd-20e5-1577bbf0b26f@gmail.com>','2025-07-05 05:14:19'),(44,'justinmarlosibonga@gmail.com','🎉 Appeal Approved - Welcome Back!','<b5359485-88d1-90c8-937e-cd6657008b10@gmail.com>','2025-07-07 11:25:24'),(45,'justinmarlosibonga@gmail.com','🚨 Account Restricted - Action Required','<3faae0de-3c4b-dbb4-3e85-922395b62841@gmail.com>','2025-07-07 13:33:57'),(46,'justinmarlosibonga@gmail.com','🚨 Account Restricted - Action Required','<d9d250f0-f375-8130-102a-00b9b5431777@gmail.com>','2025-07-07 13:35:03'),(47,'justinmarlosibonga@gmail.com','🎉 Appeal Approved - Welcome Back!','<9a409a9c-4cb4-4ea1-1b8d-182f9b2b8ef8@gmail.com>','2025-07-07 13:37:30'),(48,'justinmarlosibonga@gmail.com','🚨 Account Restricted - Action Required','<e9ae5c98-7b2e-91bc-e139-ed2af4c57488@gmail.com>','2025-07-07 14:05:48'),(49,'justinmarlosibonga@gmail.com','❌ Appeal Decision - Not Approved','<60abc576-b17a-1546-fbad-1a9edff09cc3@gmail.com>','2025-07-07 14:08:02'),(50,'justinmarlosibonga@gmail.com','🚨 Account Restricted - Action Required','<2f764c74-004e-a304-4eb8-eab4c40e54a5@gmail.com>','2025-07-07 14:17:32'),(51,'admin@rainbowpaws.com','🚨 New Appeal Submitted - Action Required','<12114f7d-5f39-7acc-6e8b-a61af3ce48e1@gmail.com>','2025-07-07 14:18:00'),(52,'admin@rainbowpaws.com','🚨 New Appeal Submitted - Action Required','<f4453620-e562-d966-53d7-283a26517680@gmail.com>','2025-07-07 14:36:58'),(53,'justinmarlosibonga@gmail.com','🚨 Account Restricted - Action Required','<de742fdc-7951-68e0-58e4-c40e6776214d@gmail.com>','2025-07-07 15:02:26'),(54,'pakalucamel@gmail.com','🎉 Appeal Approved - Welcome Back!','<4764fe1c-4755-8bdb-3a01-e2e053529968@gmail.com>','2025-07-07 15:02:45'),(55,'admin@rainbowpaws.com','🚨 New Appeal Submitted - Action Required','<39332910-a2cb-5534-c6ed-97c286d18d31@gmail.com>','2025-07-07 15:03:14');
/*!40000 ALTER TABLE `email_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_queue`
--

DROP TABLE IF EXISTS `email_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `status` (`status`,`attempts`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_queue`
--

LOCK TABLES `email_queue` WRITE;
/*!40000 ALTER TABLE `email_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migration_history`
--

DROP TABLE IF EXISTS `migration_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migration_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(255) NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `success` tinyint(1) DEFAULT 1,
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration_name` (`migration_name`),
  KEY `idx_migration_name` (`migration_name`),
  KEY `idx_executed_at` (`executed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migration_history`
--

LOCK TABLES `migration_history` WRITE;
/*!40000 ALTER TABLE `migration_history` DISABLE KEYS */;
INSERT INTO `migration_history` VALUES (1,'restriction_system_users_update','2025-06-27 18:07:21',1,NULL),(2,'restriction_system_create_user_reports_table','2025-06-27 18:08:44',1,NULL),(3,'restriction_system_create_user_restrictions_table','2025-06-27 18:09:45',1,NULL),(4,'manual_database_cleanup','2025-06-28 03:30:07',1,'Manual cleanup via phpMyAdmin');
/*!40000 ALTER TABLE `migration_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `user_id` (`user_id`),
  KEY `idx_notifications_user_unread` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (37,3,'Service In Progress','The null for Test Pet is now in progress. You will be notified when it\'s completed.','info',1,'/user/furparent_dashboard/bookings?bookingId=7','2025-07-05 05:10:49'),(38,3,'Service Completed','The null for Test Pet has been completed. Thank you for choosing our services.','success',1,'/user/furparent_dashboard/bookings?bookingId=7','2025-07-05 05:12:54'),(40,3,'Appeal Approved','Great news! Your appeal has been approved and your account restrictions have been lifted.','info',0,'/appeals','2025-07-07 11:11:15'),(48,3,'Account Restricted','Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 14:16:57'),(49,3,'Account Restricted','Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 14:17:06'),(50,3,'Account Restricted','Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 14:17:16'),(51,3,'Account Restricted','Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 14:17:24'),(52,3,'Account Restricted','Your account has been restricted. Reason: asdasdsd asdasdasd asdasdas asdasd Duration: indefinite. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 14:17:24'),(54,1,'New Appeal Submitted','undefined undefined has submitted an appeal: \"asdasd\"','warning',0,'/admin/users/cremation?appealId=5&userId=2','2025-07-07 14:17:57'),(55,3,'Account Restricted','Your account has been restricted. Reason: Restricted by admin Duration: indefinite. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 14:36:36'),(56,1,'New Appeal Submitted','undefined undefined has submitted an appeal: \"asdasdas\"','warning',0,'/admin/users/furparents?appealId=6&userId=3','2025-07-07 14:36:56'),(57,2,'Account Restricted','Your cremation center account has been restricted. Reason: Restricted by admin. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 15:02:22'),(58,3,'Appeal Approved','Great news! Your appeal has been approved and your account restrictions have been lifted.','info',0,'/appeals','2025-07-07 15:02:42'),(59,3,'Account Restricted','Your account has been restricted. Reason: Restricted by admin Duration: indefinite. You can submit an appeal to request a review.','error',0,'/appeals','2025-07-07 15:02:51'),(60,1,'New Appeal Submitted','undefined undefined has submitted an appeal: \"sad\"','warning',0,'/admin/users/furparents?appealId=7&userId=3','2025-07-07 15:03:10');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_attempts`
--

DROP TABLE IF EXISTS `otp_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `otp_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `attempt_type` enum('generate','verify') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `attempt_time` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `attempt_type` (`attempt_type`),
  KEY `attempt_time` (`attempt_time`),
  CONSTRAINT `otp_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_attempts`
--

LOCK TABLES `otp_attempts` WRITE;
/*!40000 ALTER TABLE `otp_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_codes`
--

DROP TABLE IF EXISTS `otp_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `otp_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `otp_code` (`otp_code`),
  KEY `expires_at` (`expires_at`),
  KEY `is_used` (`is_used`),
  CONSTRAINT `otp_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_codes`
--

LOCK TABLES `otp_codes` WRITE;
/*!40000 ALTER TABLE `otp_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_addons`
--

DROP TABLE IF EXISTS `package_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `package_addons` (
  `addon_id` int(11) NOT NULL AUTO_INCREMENT,
  `package_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`addon_id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `package_addons_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_addons`
--

LOCK TABLES `package_addons` WRITE;
/*!40000 ALTER TABLE `package_addons` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_addons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_images`
--

DROP TABLE IF EXISTS `package_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `package_images` (
  `image_id` int(11) NOT NULL AUTO_INCREMENT,
  `package_id` int(11) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`image_id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `package_images_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_images`
--

LOCK TABLES `package_images` WRITE;
/*!40000 ALTER TABLE `package_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_inclusions`
--

DROP TABLE IF EXISTS `package_inclusions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `package_inclusions` (
  `inclusion_id` int(11) NOT NULL AUTO_INCREMENT,
  `package_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`inclusion_id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `package_inclusions_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`package_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_inclusions`
--

LOCK TABLES `package_inclusions` WRITE;
/*!40000 ALTER TABLE `package_inclusions` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_inclusions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_source_id` (`source_id`),
  KEY `idx_payment_intent_id` (`payment_intent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_refund_id` (`refund_id`),
  KEY `idx_payment_transactions_booking_status` (`booking_id`,`status`,`created_at`),
  KEY `idx_payment_transactions_analytics` (`payment_method`,`status`,`created_at`),
  KEY `idx_payment_transactions_refunds` (`refund_id`,`status`,`created_at`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `service_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pets`
--

DROP TABLE IF EXISTS `pets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pets` (
  `pet_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`pet_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pets`
--

LOCK TABLES `pets` WRITE;
/*!40000 ALTER TABLE `pets` DISABLE KEYS */;
/*!40000 ALTER TABLE `pets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_availability`
--

DROP TABLE IF EXISTS `provider_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `provider_availability` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `provider_date_unique` (`provider_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_availability`
--

LOCK TABLES `provider_availability` WRITE;
/*!40000 ALTER TABLE `provider_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `provider_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_time_slots`
--

DROP TABLE IF EXISTS `provider_time_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `provider_time_slots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `available_services` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=381 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_time_slots`
--

LOCK TABLES `provider_time_slots` WRITE;
/*!40000 ALTER TABLE `provider_time_slots` DISABLE KEYS */;
/*!40000 ALTER TABLE `provider_time_slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_limits`
--

DROP TABLE IF EXISTS `rate_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rate_limits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) NOT NULL,
  `action` varchar(100) NOT NULL,
  `request_count` int(11) DEFAULT 1,
  `window_start` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_identifier_action` (`identifier`,`action`),
  KEY `idx_window_start` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_limits`
--

LOCK TABLES `rate_limits` WRITE;
/*!40000 ALTER TABLE `rate_limits` DISABLE KEYS */;
/*!40000 ALTER TABLE `rate_limits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `refunds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','processing','processed','failed','cancelled') DEFAULT 'pending',
  `processed_by` int(11) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `service_provider_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expiration_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_review` (`booking_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_bookings`
--

DROP TABLE IF EXISTS `service_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_service_bookings_user` (`user_id`),
  KEY `idx_service_bookings_provider` (`provider_id`),
  KEY `idx_service_bookings_package` (`package_id`),
  KEY `idx_service_bookings_status` (`status`),
  KEY `idx_service_bookings_date` (`booking_date`),
  KEY `idx_refund_id` (`refund_id`),
  KEY `idx_service_bookings_user_dashboard` (`user_id`,`status`,`booking_date`),
  KEY `idx_service_bookings_provider_dashboard` (`provider_id`,`status`,`booking_date`),
  KEY `idx_service_bookings_admin_management` (`status`,`booking_date`,`created_at`),
  KEY `idx_service_bookings_payment` (`payment_status`,`status`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_bookings`
--

LOCK TABLES `service_bookings` WRITE;
/*!40000 ALTER TABLE `service_bookings` DISABLE KEYS */;
INSERT INTO `service_bookings` VALUES (7,3,1,5,'Test Pet','Dog',NULL,NULL,'2025-07-01','10:00:00','completed',NULL,'cash','paid',NULL,'pickup',NULL,0,0.00,500.00,'2025-06-27 17:47:27','2025-07-05 05:12:54');
/*!40000 ALTER TABLE `service_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_packages`
--

DROP TABLE IF EXISTS `service_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_packages` (
  `package_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`package_id`),
  KEY `idx_service_packages_provider` (`provider_id`),
  KEY `idx_service_packages_search` (`is_active`,`category`,`provider_id`,`name`),
  KEY `idx_service_packages_provider_active` (`provider_id`,`is_active`,`created_at`),
  CONSTRAINT `service_packages_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`provider_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_packages`
--

LOCK TABLES `service_packages` WRITE;
/*!40000 ALTER TABLE `service_packages` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_providers`
--

DROP TABLE IF EXISTS `service_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_providers` (
  `provider_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`provider_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_service_providers_type` (`provider_type`),
  CONSTRAINT `service_providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_providers`
--

LOCK TABLES `service_providers` WRITE;
/*!40000 ALTER TABLE `service_providers` DISABLE KEYS */;
INSERT INTO `service_providers` VALUES (1,2,'Justin Sibonga','cremation','Test','Nmae','+639163178412','Orani, Bataan','asdadad','asddssdsdadsdad','restricted','2025-07-07 14:37:12','Application approved','/uploads/documents/2/bir_certificate_1750371808943.png','/uploads/documents/2/business_permit_1750371808764.png','/uploads/documents/2/government_id_1750371808962.png','2025-06-16 10:07:14','2025-07-07 15:02:22');
/*!40000 ALTER TABLE `service_providers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_appeals`
--

DROP TABLE IF EXISTS `user_appeals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_appeals` (
  `appeal_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`appeal_id`),
  KEY `admin_id` (`admin_id`),
  KEY `idx_user_appeals` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_submitted_at` (`submitted_at`),
  CONSTRAINT `user_appeals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_appeals_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_appeals`
--

LOCK TABLES `user_appeals` WRITE;
/*!40000 ALTER TABLE `user_appeals` DISABLE KEYS */;
INSERT INTO `user_appeals` VALUES (1,3,'personal',NULL,'restriction','ASDASDASD','asdasdasdasddads','[]','approved',NULL,1,'2025-07-07 11:10:28',NULL,'2025-07-07 11:11:15','2025-07-07 11:10:28','2025-07-07 11:11:15'),(2,2,'business',NULL,'restriction','adsadas','asdasdsdsad','[]','approved',NULL,1,'2025-07-07 11:24:41',NULL,'2025-07-07 11:25:21','2025-07-07 11:24:41','2025-07-07 11:25:21'),(3,2,'business',NULL,'restriction','asdasdadsdasdsdsd','asdasdasdadasdsdsd','[]','approved',NULL,1,'2025-07-07 13:36:53',NULL,'2025-07-07 13:37:27','2025-07-07 13:36:53','2025-07-07 13:37:27'),(4,2,'business',NULL,'restriction','asdasdsdasdadsdsdasdasd','asdasdasdasd','[]','rejected',NULL,1,'2025-07-07 14:06:07',NULL,'2025-07-07 14:07:58','2025-07-07 14:06:07','2025-07-07 14:07:58'),(5,2,'business',NULL,'restriction','asdasd','asdad','[]','pending',NULL,NULL,'2025-07-07 14:17:57',NULL,NULL,'2025-07-07 14:17:57','2025-07-07 14:17:57'),(6,3,'personal',NULL,'restriction','asdasdas','asdasdasd','[]','approved',NULL,1,'2025-07-07 14:36:55',NULL,'2025-07-07 15:02:42','2025-07-07 14:36:55','2025-07-07 15:02:42'),(7,3,'personal',NULL,'restriction','sad','asd','[]','pending',NULL,NULL,'2025-07-07 15:03:10',NULL,NULL,'2025-07-07 15:03:10','2025-07-07 15:03:10');
/*!40000 ALTER TABLE `user_appeals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_restrictions`
--

DROP TABLE IF EXISTS `user_restrictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_restrictions` (
  `restriction_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `restriction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `duration` varchar(50) DEFAULT 'indefinite',
  `report_count` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`restriction_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_restrictions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Manages active and historical user account restrictions';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_restrictions`
--

LOCK TABLES `user_restrictions` WRITE;
/*!40000 ALTER TABLE `user_restrictions` DISABLE KEYS */;
INSERT INTO `user_restrictions` VALUES (6,2,'Restricted by admin','2025-06-27 21:05:54','indefinite',0,0),(7,2,'Restricted by admin','2025-07-07 07:05:34','indefinite',0,0),(8,2,'Restricted by admin','2025-07-07 07:39:17','indefinite',0,0),(9,2,'Restricted by admin','2025-07-07 08:30:30','indefinite',0,0),(10,2,'Restricted by admin','2025-07-07 09:50:24','indefinite',0,0),(11,3,'Restricted by admin','2025-07-07 10:54:48','indefinite',0,0),(12,2,'Restricted by admin','2025-07-07 11:20:21','indefinite',0,0),(13,3,'Restricted by admin','2025-07-07 11:21:32','indefinite',0,0),(14,2,'Restricted by admin','2025-07-07 11:24:20','indefinite',0,0),(15,3,'Restricted by admin','2025-07-07 13:33:21','indefinite',0,0),(16,2,'Restricted by admin','2025-07-07 13:33:53','indefinite',0,0),(17,2,'Restricted by admin','2025-07-07 13:35:01','indefinite',0,0),(18,2,'asdaddsdasd','2025-07-07 14:05:44','indefinite',0,0),(19,3,'asdasdsd asdasdasd asdasdas asdasd','2025-07-07 14:16:57','indefinite',0,0),(20,2,'Restricted by admin','2025-07-07 14:17:28','indefinite',0,0),(21,3,'Restricted by admin','2025-07-07 14:36:35','indefinite',0,0),(22,2,'Restricted by admin','2025-07-07 15:02:22','indefinite',0,1),(23,3,'Restricted by admin','2025-07-07 15:02:51','indefinite',0,0);
/*!40000 ALTER TABLE `user_restrictions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `email_notifications` tinyint(1) DEFAULT 1 COMMENT 'User preference for email notifications',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_restriction_status` (`restriction_status`),
  KEY `idx_users_search_composite` (`role`,`status`,`first_name`,`last_name`,`email`),
  KEY `idx_users_auth_composite` (`email`,`status`,`is_verified`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@rainbowpaws.com','$2b$10$/TMOT7juT/ytAoRAOjjP.uOu1ZpQiMYRVnvQP9UJLv/KC2CfLaxTe','Admin','Admin','+639163178412','balanga, Bataan','Male','/uploads/admin-profile-pictures/1/admin_profile_picture_1750985838993.png','admin','active','none',1,1,'2025-07-07 15:03:19','2025-06-14 07:15:42','2025-07-07 15:03:19',1,1),(2,'justinmarlosibonga@gmail.com','$2b$10$k1S.OTBJsw3va/1AwqkoEuZ8KpDN7aFrHHGtIjP2b2YBibW4Xnxuq','Justin','Sibonga','+639163178412','Orani, Bataan',NULL,'/uploads/profile-pictures/2/profile_picture_1750949352242.png','business','restricted','none',1,1,'2025-07-07 15:02:05','2025-06-16 10:07:10','2025-07-07 15:02:22',1,1),(3,'pakalucamel@gmail.com','$2b$10$FACNm48GgWanJsUCFaZW9OHTY1iHlokagC3hH5LCoPJ0Tr1ufssoa','Pet','Parent',NULL,NULL,NULL,'/uploads/profile-pictures/3/profile_picture_1751873254358.png','fur_parent','active','none',1,1,'2025-07-07 15:03:03','2025-06-20 22:55:48','2025-07-07 15:03:31',1,1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'rainbow_paws'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-12  1:32:44
