-- Create Test Users SQL Script
-- This script creates test users for admin and cremation provider roles

-- Start transaction to ensure data integrity
START TRANSACTION;

-- =============================================
-- Create Test Admin User
-- =============================================
-- Check if the test admin user already exists
SET @admin_email = 'testadmin@rainbowpaws.com';

-- Insert admin user (password: TestAdmin123) if it doesn't exist
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    role,
    is_verified,
    is_otp_verified
)
SELECT
    @admin_email,
    '$2y$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC',
    'Test',
    'Admin',
    'admin',
    1,
    1
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = @admin_email);

-- Get the user ID for the admin
SET @admin_user_id = (SELECT id FROM users WHERE email = @admin_email);

-- Insert admin profile if it doesn't exist
INSERT INTO admin_profiles (
    user_id,
    username,
    full_name,
    admin_role
)
SELECT
    @admin_user_id,
    'testadmin',
    'Test Admin',
    'super_admin'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = @admin_user_id);

-- =============================================
-- Create Test Cremation Provider User
-- =============================================
-- Check if the test cremation provider already exists
SET @cremation_email = 'testcremation@rainbowpaws.com';

-- Insert cremation provider user (password: TestAdmin123)
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    role,
    is_verified,
    is_otp_verified
)
SELECT
    @cremation_email,
    '$2y$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC',
    'Test',
    'Cremation',
    'business',
    1,
    1
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = @cremation_email);

-- Get the user ID for the cremation provider
SET @cremation_user_id = (SELECT id FROM users WHERE email = @cremation_email);

-- Insert business profile for cremation provider if it doesn't exist
INSERT INTO business_profiles (
    user_id,
    business_name,
    business_type,
    contact_first_name,
    contact_last_name,
    business_phone,
    business_address,
    province,
    city,
    zip,
    business_hours,
    service_description,
    verification_status
)
SELECT
    @cremation_user_id,
    'Test Cremation Center',
    'cremation',
    'Test',
    'Cremation',
    '123-456-7890',
    '123 Test Street',
    'Test Province',
    'Test City',
    '12345',
    'Monday-Friday: 9am-5pm',
    'Test cremation services for pets',
    'verified'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM business_profiles WHERE user_id = @cremation_user_id);

-- Commit the transaction
COMMIT;

-- Display login information
SELECT 'Test Admin Login Information:' AS info;
SELECT 'Email: testadmin@rainbowpaws.com' AS email;
SELECT 'Password: TestAdmin123' AS password;
SELECT 'Role: admin' AS role;

SELECT 'Test Cremation Provider Login Information:' AS info;
SELECT 'Email: testcremation@rainbowpaws.com' AS email;
SELECT 'Password: TestAdmin123' AS password;
SELECT 'Role: business' AS role;
