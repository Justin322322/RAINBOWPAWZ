-- Fix Test Users SQL Script
-- This script updates the test users with properly hashed passwords

-- Start transaction to ensure data integrity
START TRANSACTION;

-- =============================================
-- Update Test Admin User Password
-- =============================================
-- Update the admin user password (password: TestAdmin123)
UPDATE users 
SET password = '$2a$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC' 
WHERE email = 'testadmin@rainbowpaws.com';

-- =============================================
-- Update Test Cremation Provider Password
-- =============================================
-- Update the cremation provider password (password: TestAdmin123)
UPDATE users 
SET password = '$2a$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC' 
WHERE email = 'testcremation@rainbowpaws.com';

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
