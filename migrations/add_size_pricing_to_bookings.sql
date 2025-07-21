-- Migration: Add Size Pricing to Bookings
-- Description: Adds columns to the bookings table to support pet size-based pricing
-- Date: 2025-07-22

-- Add size pricing columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS selected_size_category VARCHAR(50) NULL AFTER cause_of_death,
ADD COLUMN IF NOT EXISTS selected_size_price DECIMAL(10,2) NULL AFTER selected_size_category,
ADD COLUMN IF NOT EXISTS has_size_pricing TINYINT(1) DEFAULT 0 AFTER selected_size_price,
ADD COLUMN IF NOT EXISTS pet_weight DECIMAL(8,2) NULL AFTER pet_type;
