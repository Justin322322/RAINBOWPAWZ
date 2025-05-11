<?php
// Script to check database structure
echo "Checking database structure...\n";

// Database connection details
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'rainbow_paws';

echo "Database config: host=$host, user=$user, database=$database\n";

try {
    // Connect to the database
    echo "Connecting to database...\n";
    $conn = new mysqli($host, $user, $password, $database);
    
    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    echo "Connected to database successfully\n";
    
    // Get list of tables
    echo "\nFetching tables...\n";
    $result = $conn->query("SHOW TABLES");
    
    if ($result) {
        echo "Tables in database:\n";
        while ($row = $result->fetch_array()) {
            echo "- " . $row[0] . "\n";
        }
    } else {
        echo "Error fetching tables: " . $conn->error . "\n";
    }
    
    // Check users table structure
    echo "\nChecking users table structure...\n";
    $result = $conn->query("DESCRIBE users");
    
    if ($result) {
        echo "Fields in users table:\n";
        while ($row = $result->fetch_assoc()) {
            echo "- " . $row['Field'] . " (" . $row['Type'] . ") " . 
                 ($row['Null'] === 'YES' ? 'NULL' : 'NOT NULL') . " " . 
                 $row['Key'] . " " . 
                 ($row['Default'] ? "DEFAULT " . $row['Default'] : "") . "\n";
        }
    } else {
        echo "Error checking users table: " . $conn->error . "\n";
    }
    
    // Check business_profiles table structure
    echo "\nChecking business_profiles table structure...\n";
    $result = $conn->query("DESCRIBE business_profiles");
    
    if ($result) {
        echo "Fields in business_profiles table:\n";
        while ($row = $result->fetch_assoc()) {
            echo "- " . $row['Field'] . " (" . $row['Type'] . ") " . 
                 ($row['Null'] === 'YES' ? 'NULL' : 'NOT NULL') . " " . 
                 $row['Key'] . " " . 
                 ($row['Default'] ? "DEFAULT " . $row['Default'] : "") . "\n";
        }
    } else {
        echo "Error checking business_profiles table: " . $conn->error . "\n";
    }
    
    // Close the connection
    $conn->close();
    echo "\nDatabase check completed\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
