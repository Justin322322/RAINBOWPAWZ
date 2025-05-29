-- Create email_queue table for queued email processing
CREATE TABLE IF NOT EXISTS `email_queue` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `to_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `html` TEXT NOT NULL,
  `text` TEXT,
  `from_email` VARCHAR(255),
  `cc` VARCHAR(255),
  `bcc` VARCHAR(255),
  `attachments` TEXT,
  `status` ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  `attempts` INT NOT NULL DEFAULT 0,
  `error` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sent_at` TIMESTAMP NULL,
  INDEX `idx_email_queue_status` (`status`, `attempts`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create email_log table for tracking sent emails
CREATE TABLE IF NOT EXISTS `email_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message_id` VARCHAR(255),
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_log_recipient` (`recipient`),
  INDEX `idx_email_log_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
