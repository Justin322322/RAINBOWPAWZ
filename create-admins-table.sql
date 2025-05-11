-- Create Admins Table SQL Script
-- This script creates the missing admins table and adds records for existing admin users

-- Start transaction to ensure data integrity
START TRANSACTION;

-- =============================================
-- Create Admins Table
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- Add Admin Records for Existing Admin Users
-- =============================================
-- Insert admin records for users with admin role
INSERT INTO admins (
  username,
  password,
  email,
  full_name,
  role
)
SELECT 
  ap.username,
  u.password,
  u.email,
  ap.full_name,
  ap.admin_role
FROM users u
JOIN admin_profiles ap ON u.id = ap.user_id
WHERE u.role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM admins a WHERE a.email = u.email
);

-- Commit the transaction
COMMIT;

-- Display admin records
SELECT 'Admins Table Created Successfully' AS message;
SELECT id, username, email, full_name, role FROM admins;
