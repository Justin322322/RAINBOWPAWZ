-- Add document paths columns to businesses table
ALTER TABLE businesses
ADD COLUMN bir_certificate_path VARCHAR(255) NULL,
ADD COLUMN business_permit_path VARCHAR(255) NULL,
ADD COLUMN government_id_path VARCHAR(255) NULL,
ADD COLUMN verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
ADD COLUMN verification_date TIMESTAMP NULL,
ADD COLUMN verification_notes TEXT NULL; 