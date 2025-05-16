<?php
// Database connection parameters
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'rainbow_paws';

try {
    // Create connection
    $conn = new PDO("mysql:host=$host;dbname=$database", $username, $password);
    
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected successfully. Running SQL...<br>";
    
    // SQL to alter table
    $sql = "ALTER TABLE successful_bookings 
            MODIFY COLUMN payment_status ENUM('completed', 'refunded', 'partial', 'cancelled') 
            NOT NULL DEFAULT 'completed'";
    
    // Execute SQL
    $conn->exec($sql);
    echo "Table 'successful_bookings' altered successfully.<br>";
}
catch(PDOException $e) {
    echo "Connection failed or SQL error: " . $e->getMessage() . "<br>";
}

// Close connection
$conn = null;
echo "Done.";
?> 