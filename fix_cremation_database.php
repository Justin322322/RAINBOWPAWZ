<?php
// Database connection parameters
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'rainbow_paws';

// Create connection
$conn = new mysqli($host, $user, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "<h1>Rainbow Paws Cremation Center Database Fix</h1>";
echo "<p>Connected to database successfully.</p>";

// Start transaction
$conn->begin_transaction();

try {
    // 1. Get the user ID for justinmarlosibonga@gmail.com
    $userQuery = "SELECT user_id FROM users WHERE email = 'justinmarlosibonga@gmail.com'";
    $userResult = $conn->query($userQuery);

    if ($userResult->num_rows == 0) {
        throw new Exception("User with email justinmarlosibonga@gmail.com not found in the database.");
    }

    $user = $userResult->fetch_assoc();
    $userId = $user['user_id'];

    echo "<p>Found user with ID: $userId</p>";

    // 2. Update the user role to 'business' and ensure verification
    $updateUserQuery = "UPDATE users 
                        SET role = 'business', 
                            is_verified = 1, 
                            is_otp_verified = 1 
                        WHERE user_id = $userId";
    
    if ($conn->query($updateUserQuery) === TRUE) {
        echo "<p>Updated user role to 'business' and set verification flags.</p>";
    } else {
        throw new Exception("Error updating user: " . $conn->error);
    }

    // 3. Check if service provider record exists
    $checkProviderQuery = "SELECT provider_id FROM service_providers WHERE user_id = $userId";
    $providerResult = $conn->query($checkProviderQuery);
    
    if ($providerResult->num_rows > 0) {
        // Update existing service provider record
        $provider = $providerResult->fetch_assoc();
        $providerId = $provider['provider_id'];
        
        $updateProviderQuery = "UPDATE service_providers 
                                SET name = 'Rainbow Paws Cremation Center',
                                    provider_type = 'cremation',
                                    contact_first_name = 'Justin',
                                    contact_last_name = 'Sibonga',
                                    phone = '09123456789',
                                    address = 'Samal Bataan',
                                    province = 'Bataan',
                                    city = 'Samal',
                                    zip = '2113',
                                    hours = '8:00 AM - 5:00 PM, Monday to Saturday',
                                    description = 'Professional pet cremation services with care and respect.',
                                    application_status = 'approved',
                                    verification_date = NOW(),
                                    bir_certificate_path = '/uploads/documents/bir_certificate.jpg',
                                    business_permit_path = '/uploads/documents/business_permit.jpg',
                                    government_id_path = '/uploads/documents/government_id.jpg'
                                WHERE provider_id = $providerId";
        
        if ($conn->query($updateProviderQuery) === TRUE) {
            echo "<p>Updated existing service provider record (ID: $providerId).</p>";
        } else {
            throw new Exception("Error updating service provider: " . $conn->error);
        }
    } else {
        // Create new service provider record
        $insertProviderQuery = "INSERT INTO service_providers (
                                    user_id, 
                                    name, 
                                    provider_type, 
                                    contact_first_name, 
                                    contact_last_name, 
                                    phone, 
                                    address, 
                                    province, 
                                    city, 
                                    zip, 
                                    hours, 
                                    description, 
                                    application_status, 
                                    verification_date,
                                    bir_certificate_path,
                                    business_permit_path,
                                    government_id_path
                                ) VALUES (
                                    $userId,
                                    'Rainbow Paws Cremation Center',
                                    'cremation',
                                    'Justin',
                                    'Sibonga',
                                    '09123456789',
                                    'Samal Bataan',
                                    'Bataan',
                                    'Samal',
                                    '2113',
                                    '8:00 AM - 5:00 PM, Monday to Saturday',
                                    'Professional pet cremation services with care and respect.',
                                    'approved',
                                    NOW(),
                                    '/uploads/documents/bir_certificate.jpg',
                                    '/uploads/documents/business_permit.jpg',
                                    '/uploads/documents/government_id.jpg'
                                )";
        
        if ($conn->query($insertProviderQuery) === TRUE) {
            $providerId = $conn->insert_id;
            echo "<p>Created new service provider record (ID: $providerId).</p>";
        } else {
            throw new Exception("Error creating service provider: " . $conn->error);
        }
    }

    // 4. Create sample service packages if none exist
    $checkPackagesQuery = "SELECT COUNT(*) as package_count FROM service_packages WHERE provider_id = $providerId";
    $packagesResult = $conn->query($checkPackagesQuery);
    $packageCount = $packagesResult->fetch_assoc()['package_count'];
    
    if ($packageCount == 0) {
        // Create sample service packages
        $packageQueries = [
            "INSERT INTO service_packages (
                provider_id, 
                name, 
                description, 
                category, 
                cremation_type, 
                processing_time, 
                price, 
                delivery_fee_per_km, 
                conditions, 
                is_active
            ) VALUES (
                $providerId,
                'Basic Private Cremation',
                'Individual cremation service with basic urn included.',
                'Private',
                'Standard',
                '1-2 days',
                3500.00,
                15.00,
                'For pets up to 20kg. Additional fees may apply for larger pets.',
                1
            )",
            
            "INSERT INTO service_packages (
                provider_id, 
                name, 
                description, 
                category, 
                cremation_type, 
                processing_time, 
                price, 
                delivery_fee_per_km, 
                conditions, 
                is_active
            ) VALUES (
                $providerId,
                'Premium Private Cremation',
                'Individual cremation service with premium wooden urn and paw print keepsake.',
                'Private',
                'Premium',
                '1-2 days',
                5500.00,
                15.00,
                'For pets up to 30kg. Additional fees may apply for larger pets.',
                1
            )",
            
            "INSERT INTO service_packages (
                provider_id, 
                name, 
                description, 
                category, 
                cremation_type, 
                processing_time, 
                price, 
                delivery_fee_per_km, 
                conditions, 
                is_active
            ) VALUES (
                $providerId,
                'Communal Cremation',
                'Shared cremation service for multiple pets.',
                'Communal',
                'Standard',
                '1-3 days',
                1500.00,
                15.00,
                'For pets up to 20kg. Ashes are not returned with communal cremation.',
                1
            )"
        ];
        
        foreach ($packageQueries as $index => $query) {
            if ($conn->query($query) === TRUE) {
                $packageId = $conn->insert_id;
                echo "<p>Created service package #" . ($index + 1) . " (ID: $packageId).</p>";
                
                // Add package inclusions
                if ($index == 0) { // Basic Private
                    $inclusionsQueries = [
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Individual cremation')",
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Basic ceramic urn')",
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Certificate of cremation')"
                    ];
                } elseif ($index == 1) { // Premium Private
                    $inclusionsQueries = [
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Individual cremation')",
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Premium wooden urn')",
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Paw print keepsake')",
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Certificate of cremation')",
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Memorial photo frame')"
                    ];
                } else { // Communal
                    $inclusionsQueries = [
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Communal cremation')",
                        "INSERT INTO package_inclusions (package_id, description) VALUES ($packageId, 'Certificate of cremation')"
                    ];
                }
                
                foreach ($inclusionsQueries as $inclusionQuery) {
                    $conn->query($inclusionQuery);
                }
                
                // Add sample image paths
                $imageQuery = "INSERT INTO package_images (package_id, image_path, display_order) 
                              VALUES ($packageId, '/uploads/packages/cremation_" . ($index + 1) . ".jpg', 1)";
                $conn->query($imageQuery);
            } else {
                throw new Exception("Error creating service package: " . $conn->error);
            }
        }
    } else {
        echo "<p>Service packages already exist for this provider. Skipping package creation.</p>";
    }

    // 5. Create availability records for the next 30 days
    $checkAvailabilityQuery = "SELECT COUNT(*) as availability_count FROM provider_availability WHERE provider_id = $providerId";
    $availabilityResult = $conn->query($checkAvailabilityQuery);
    $availabilityCount = $availabilityResult->fetch_assoc()['availability_count'];
    
    if ($availabilityCount == 0) {
        echo "<p>Creating availability records for the next 30 days...</p>";
        
        for ($i = 0; $i < 30; $i++) {
            $date = date('Y-m-d', strtotime("+$i days"));
            
            // Skip Sundays (day of week = 0)
            if (date('w', strtotime($date)) != 0) {
                $availabilityQuery = "INSERT INTO provider_availability (provider_id, date, is_available) 
                                     VALUES ($providerId, '$date', 1)";
                
                if ($conn->query($availabilityQuery) === TRUE) {
                    // Create time slots for this day (9 AM to 4 PM, hourly)
                    for ($hour = 9; $hour <= 16; $hour++) {
                        $startTime = sprintf("%02d:00:00", $hour);
                        $endTime = sprintf("%02d:00:00", $hour + 1);
                        
                        $timeSlotQuery = "INSERT INTO provider_time_slots (provider_id, date, start_time, end_time, available_services) 
                                         VALUES ($providerId, '$date', '$startTime', '$endTime', 'all')";
                        $conn->query($timeSlotQuery);
                    }
                }
            }
        }
        
        echo "<p>Created availability and time slots for the next 30 days.</p>";
    } else {
        echo "<p>Availability records already exist for this provider. Skipping availability creation.</p>";
    }

    // Commit transaction
    $conn->commit();
    echo "<h2>Database Fix Completed Successfully!</h2>";
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    echo "<h2>Error: " . $e->getMessage() . "</h2>";
}

// Close connection
$conn->close();
echo "<p>Database connection closed.</p>";
echo "<p>You should now be able to access all parts of the cremation dashboard without any issues.</p>";
echo "<p><a href='/app_rainbowpaws/src/app/cremation/dashboard'>Go to Cremation Dashboard</a></p>";
?>
