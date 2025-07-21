-- Migration: Add Price Per Kg to Service Packages
-- Description: Adds price_per_kg column to service_packages table
-- Date: 2025-07-22

-- Add price_per_kg column to service_packages table
ALTER TABLE service_packages
ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2) DEFAULT 0 AFTER price;
