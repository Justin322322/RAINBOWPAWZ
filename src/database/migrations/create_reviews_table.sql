-- Create reviews table
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `service_provider_id` INT NOT NULL,
  `booking_id` INT NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_booking_review` (`booking_id` ASC),
  INDEX `fk_reviews_users_idx` (`user_id` ASC),
  INDEX `fk_reviews_service_providers_idx` (`service_provider_id` ASC),
  INDEX `fk_reviews_service_bookings_idx` (`booking_id` ASC),
  CONSTRAINT `fk_reviews_users`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_service_providers`
    FOREIGN KEY (`service_provider_id`)
    REFERENCES `service_providers` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_service_bookings`
    FOREIGN KEY (`booking_id`)
    REFERENCES `service_bookings` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
