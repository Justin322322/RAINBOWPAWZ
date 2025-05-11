-- Create Test Users SQL Script with properly hashed passwords
-- Generated on 2025-05-11T14:42:42.595Z

-- Start transaction to ensure data integrity
START TRANSACTION;

-- =============================================
-- Create Test Admin User
-- =============================================
-- Delete existing test admin user if exists
DELETE FROM admin_profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'testadmin@rainbowpaws.com');
DELETE FROM users WHERE email = 'testadmin@rainbowpaws.com';

-- Insert admin user (password: TestAdmin123)
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    role, 
    is_verified, 
    is_otp_verified
) VALUES (
    'testadmin@rainbowpaws.com', 
    '$2b$10$e7FKN0GudQp4rHoLo2RAXOLiWSx6UuRWPgogMF7LwtlM9HfE5EENa', 
    'Test', 
    'Admin', 
    'admin', 
    1, 
    1
);

-- Get the last inserted user ID for the admin
SET @admin_user_id = LAST_INSERT_ID();

-- Insert admin profile
INSERT INTO admin_profiles (
    user_id, 
    username, 
    full_name, 
    admin_role
) VALUES (
    @admin_user_id, 
    'testadmin', 
    'Test Admin', 
    'super_admin'
);

-- =============================================
-- Create Test Cremation Provider User
-- =============================================
-- Delete existing test cremation provider if exists
DELETE FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'testcremation@rainbowpaws.com');
DELETE FROM users WHERE email = 'testcremation@rainbowpaws.com';

-- Insert cremation provider user (password: TestAdmin123)
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    role, 
    is_verified, 
    is_otp_verified
) VALUES (
    'testcremation@rainbowpaws.com', 
    '$2b$10$e7FKN0GudQp4rHoLo2RAXOLiWSx6UuRWPgogMF7LwtlM9HfE5EENa', 
    'Test', 
    'Cremation', 
    'business', 
    1, 
    1
);

-- Get the last inserted user ID for the cremation provider
SET @cremation_user_id = LAST_INSERT_ID();

-- Insert business profile for cremation provider
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
) VALUES (
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
);

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