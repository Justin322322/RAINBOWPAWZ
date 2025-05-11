-- Create admin user script
-- This script creates an admin user in the database

-- Start transaction
START TRANSACTION;

-- Insert admin user (password: Admin123!)
INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_otp_verified)
VALUES ('admin@example.com', '$2y$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC', 'Admin', 'User', 'admin', 1, 1);

-- Get the last inserted user ID for the admin
SET @admin_user_id = LAST_INSERT_ID();

-- Insert admin profile
INSERT INTO admin_profiles (user_id, username, full_name, admin_role)
VALUES (@admin_user_id, 'admin', 'Admin User', 'super_admin');

-- Commit transaction
COMMIT;

-- Display success message
SELECT 'Admin user created successfully!' AS message;
SELECT 'Email: admin@example.com' AS email;
SELECT 'Password: Admin123!' AS password;
SELECT 'Role: super_admin' AS role;
