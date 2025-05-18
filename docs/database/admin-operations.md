# Admin Database Operations

This document details the database operations specific to the admin functionality in the Rainbow Paws application.

## Table of Contents

1. [Admin-Related Tables](#admin-related-tables)
2. [Admin Authentication and Authorization](#admin-authentication-and-authorization)
3. [Admin Dashboard Queries](#admin-dashboard-queries)
4. [Admin User Management](#admin-user-management)
5. [Admin Service Provider Management](#admin-service-provider-management)
6. [Admin Logging and Auditing](#admin-logging-and-auditing)

## Admin-Related Tables

### `users` Table (Admin Records)

Admin users are stored in the main `users` table with a role of 'admin':

```sql
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `sex` varchar(20) DEFAULT NULL,
  `role` enum('fur_parent','business','admin') NOT NULL DEFAULT 'fur_parent',
  `status` enum('active','inactive','suspended','restricted') NOT NULL DEFAULT 'active',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_otp_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### `admin_profiles` Table

Additional admin-specific information is stored in the `admin_profiles` table:

```sql
CREATE TABLE `admin_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `admin_role` enum('super_admin','admin','moderator') DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### `admin_logs` Table

Admin actions are logged in the `admin_logs` table for auditing purposes:

```sql
CREATE TABLE `admin_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NOT NULL,
  `details` TEXT,
  `ip_address` VARCHAR(45),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`admin_id`),
  INDEX (`entity_type`, `entity_id`),
  INDEX (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### `admin_notifications` Table

Notifications for admin users are stored in the `admin_notifications` table:

```sql
CREATE TABLE `admin_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `entity_type` (`entity_type`,`entity_id`),
  KEY `is_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## Admin Authentication and Authorization

### Admin Login Query

```sql
-- Check if user exists and has admin role
SELECT u.id, u.email, u.password, u.first_name, u.last_name, u.role, 
       ap.username, ap.admin_role
FROM users u
LEFT JOIN admin_profiles ap ON u.id = ap.user_id
WHERE u.email = ? AND u.role = 'admin'
LIMIT 1
```

### Admin Creation

```typescript
// Start a transaction
await query('START TRANSACTION');

try {
  // Check if user already exists
  const existingUserResult = await query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  ) as any[];

  let userId;

  if (existingUserResult && existingUserResult.length > 0) {
    // User exists, update role
    userId = existingUserResult[0].id;
    await query(
      'UPDATE users SET role = ?, is_verified = 1, is_otp_verified = 1 WHERE id = ?',
      ['admin', userId]
    );
  } else {
    // Create new user
    const userResult = await query(
      `INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_otp_verified)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [email, hashedPassword, firstName, lastName, 'admin']
    ) as any;

    userId = userResult.insertId;
  }

  // Check if admin profile exists
  const existingProfileResult = await query(
    'SELECT id FROM admin_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  ) as any[];

  if (existingProfileResult && existingProfileResult.length > 0) {
    // Update existing profile
    await query(
      `UPDATE admin_profiles 
       SET username = ?, full_name = ?, admin_role = ?
       WHERE user_id = ?`,
      [username, `${firstName} ${lastName}`, role, userId]
    );
  } else {
    // Create new admin profile
    await query(
      `INSERT INTO admin_profiles (user_id, username, full_name, admin_role)
       VALUES (?, ?, ?, ?)`,
      [userId, username, `${firstName} ${lastName}`, role]
    );
  }

  // Commit the transaction
  await query('COMMIT');
} catch (error) {
  // Rollback the transaction on error
  await query('ROLLBACK');
  throw error;
}
```

## Admin Dashboard Queries

### Dashboard Statistics

```sql
-- Get total users count
SELECT COUNT(*) as count FROM users

-- Get service providers count
SELECT COUNT(*) as count FROM service_providers

-- Get active services count
SELECT COUNT(*) as count FROM service_packages WHERE is_active = 1

-- Get recent applications
SELECT
  sp.id,
  sp.id as businessId,
  sp.name as businessName,
  CONCAT(u.first_name, ' ', u.last_name) as owner,
  u.email,
  sp.created_at as submitDate,
  sp.application_status as status
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE sp.provider_type = 'cremation'
ORDER BY sp.created_at DESC
LIMIT 5

-- Get fur parents count
SELECT COUNT(*) as count FROM users WHERE role = 'fur_parent'

-- Get pending applications count for current month
SELECT COUNT(*) as count 
FROM service_providers 
WHERE application_status = 'pending' 
AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
AND YEAR(created_at) = YEAR(CURRENT_DATE())

-- Get restricted users count
SELECT role, COUNT(*) as count
FROM users
WHERE status = 'restricted'
GROUP BY role
```

## Admin User Management

### Fetch User Details

```sql
SELECT id, first_name, last_name, email, phone_number, address, sex,
       created_at, updated_at, is_otp_verified, role, status, is_verified
FROM users WHERE id = ? LIMIT 1
```

### Update User Role

```sql
-- Start a transaction
await query('START TRANSACTION');

try {
  // Update user role in database
  await query(
    'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
    [role, userId]
  );

  // If changing to admin role, create admin profile if it doesn't exist
  if (role === 'admin') {
    // Check if admin profile exists
    const adminProfileResult = await query(
      'SELECT id FROM admin_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    ) as any[];

    if (adminProfileResult.length === 0) {
      // Create admin profile
      await query(
        `INSERT INTO admin_profiles (user_id, username, full_name, admin_role)
         VALUES (?, ?, ?, ?)`,
        [userId, email.split('@')[0], `${firstName} ${lastName}`, 'admin']
      );
    }
  }

  // Log the action
  await query(
    `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [adminId, 'update_role', 'user', userId, JSON.stringify({ role })]
  );

  // Commit the transaction
  await query('COMMIT');
} catch (error) {
  // Rollback the transaction on error
  await query('ROLLBACK');
  throw error;
}
```

### Verify User

```sql
-- For fur parents
UPDATE users
SET is_verified = 1, status = 'active', updated_at = NOW()
WHERE id = ?

-- For cremation centers
UPDATE service_providers
SET verification_status = 'verified', application_status = 'approved', updated_at = NOW()
WHERE id = ?
```

## Admin Service Provider Management

### List Service Providers

```sql
SELECT 
  sp.id,
  sp.name,
  sp.description,
  sp.address,
  sp.phone,
  sp.email,
  sp.provider_type,
  sp.application_status,
  sp.verification_status,
  sp.created_at,
  sp.updated_at,
  u.id as user_id,
  u.first_name,
  u.last_name,
  u.email as user_email
FROM 
  service_providers sp
JOIN 
  users u ON sp.user_id = u.id
WHERE 
  sp.provider_type = 'cremation'
ORDER BY 
  sp.created_at DESC
```

### Approve Service Provider

```sql
-- Start a transaction
await query('START TRANSACTION');

try {
  // Update service provider status
  await query(
    `UPDATE service_providers
     SET application_status = 'approved', verification_status = 'verified', updated_at = NOW()
     WHERE id = ?`,
    [providerId]
  );

  // Get user ID associated with the service provider
  const providerResult = await query(
    'SELECT user_id FROM service_providers WHERE id = ?',
    [providerId]
  ) as any[];

  if (providerResult.length > 0) {
    const userId = providerResult[0].user_id;

    // Update user status
    await query(
      `UPDATE users
       SET is_verified = 1, status = 'active', updated_at = NOW()
       WHERE id = ?`,
      [userId]
    );
  }

  // Log the action
  await query(
    `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [adminId, 'approve', 'service_provider', providerId, '']
  );

  // Commit the transaction
  await query('COMMIT');
} catch (error) {
  // Rollback the transaction on error
  await query('ROLLBACK');
  throw error;
}
```

## Admin Logging and Auditing

### Log Admin Action

```sql
INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details, ip_address)
VALUES (?, ?, ?, ?, ?, ?)
```

### Fetch Admin Logs

```sql
SELECT 
  al.id,
  al.admin_id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.details,
  al.ip_address,
  al.created_at,
  CONCAT(u.first_name, ' ', u.last_name) as admin_name
FROM 
  admin_logs al
LEFT JOIN 
  users u ON al.admin_id = u.id
WHERE 
  1=1
  ${action ? 'AND al.action = ?' : ''}
  ${entityType ? 'AND al.entity_type = ?' : ''}
  ${entityId ? 'AND al.entity_id = ?' : ''}
  ${adminId ? 'AND al.admin_id = ?' : ''}
ORDER BY 
  al.created_at DESC
LIMIT ? OFFSET ?
```
