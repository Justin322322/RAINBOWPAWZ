<?php
/**
 * Admin User Creation Script
 * 
 * This script creates an admin user in the database.
 * It can be run from the command line with:
 * php create-admin.php
 */

// Database configuration
$host = 'localhost';
$dbname = 'rainbow_paws';
$username = 'root';
$password = '';

// Admin user details
$adminEmail = 'admin@example.com';
$adminPassword = 'Admin123!';
$adminFirstName = 'Admin';
$adminLastName = 'User';
$adminUsername = 'admin';
$adminRole = 'super_admin';

try {
    // Connect to the database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to the database successfully.\n";
    
    // Start a transaction
    $pdo->beginTransaction();
    
    // Hash the password
    $hashedPassword = password_hash($adminPassword, PASSWORD_BCRYPT);
    
    // Check if the user already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$adminEmail]);
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingUser) {
        echo "User with email $adminEmail already exists with ID: {$existingUser['id']}.\n";
        $userId = $existingUser['id'];
        
        // Update the existing user to have admin role
        $stmt = $pdo->prepare("UPDATE users SET role = 'admin', is_verified = 1, is_otp_verified = 1 WHERE id = ?");
        $stmt->execute([$userId]);
        echo "Updated user to have admin role.\n";
    } else {
        // Insert into users table
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_otp_verified)
            VALUES (?, ?, ?, ?, 'admin', 1, 1)
        ");
        $stmt->execute([$adminEmail, $hashedPassword, $adminFirstName, $adminLastName]);
        $userId = $pdo->lastInsertId();
        echo "Created new user with ID: $userId.\n";
    }
    
    // Check if admin profile already exists
    $stmt = $pdo->prepare("SELECT id FROM admin_profiles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $existingProfile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingProfile) {
        echo "Admin profile already exists with ID: {$existingProfile['id']}.\n";
        
        // Update the existing admin profile
        $stmt = $pdo->prepare("
            UPDATE admin_profiles 
            SET username = ?, full_name = ?, admin_role = ?
            WHERE user_id = ?
        ");
        $stmt->execute([$adminUsername, "$adminFirstName $adminLastName", $adminRole, $userId]);
        echo "Updated admin profile.\n";
    } else {
        // Insert into admin_profiles table
        $stmt = $pdo->prepare("
            INSERT INTO admin_profiles (user_id, username, full_name, admin_role)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $adminUsername, "$adminFirstName $adminLastName", $adminRole]);
        echo "Created admin profile.\n";
    }
    
    // Check if the old admins table exists and insert there too for backward compatibility
    $stmt = $pdo->prepare("
        SHOW TABLES LIKE 'admins'
    ");
    $stmt->execute();
    $adminsTableExists = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($adminsTableExists) {
        // Check if admin already exists in old table
        $stmt = $pdo->prepare("SELECT id FROM admins WHERE email = ?");
        $stmt->execute([$adminEmail]);
        $existingOldAdmin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingOldAdmin) {
            echo "Admin already exists in old admins table with ID: {$existingOldAdmin['id']}.\n";
            
            // Update the existing admin
            $stmt = $pdo->prepare("
                UPDATE admins 
                SET username = ?, password = ?, full_name = ?, role = ?
                WHERE email = ?
            ");
            $stmt->execute([$adminUsername, $hashedPassword, "$adminFirstName $adminLastName", $adminRole, $adminEmail]);
            echo "Updated admin in old admins table.\n";
        } else {
            // Insert into old admins table
            $stmt = $pdo->prepare("
                INSERT INTO admins (username, password, email, full_name, role)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$adminUsername, $hashedPassword, $adminEmail, "$adminFirstName $adminLastName", $adminRole]);
            echo "Created admin in old admins table.\n";
        }
    }
    
    // Commit the transaction
    $pdo->commit();
    
    echo "Admin user created successfully!\n";
    echo "Email: $adminEmail\n";
    echo "Password: $adminPassword\n";
    echo "Role: $adminRole\n";
    
} catch (PDOException $e) {
    // Roll back the transaction if something failed
    if ($pdo) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}
?>
