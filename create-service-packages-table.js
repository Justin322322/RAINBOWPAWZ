require('dotenv').config();
const mysql = require('mysql2/promise');

async function createServicePackagesTable() {
  console.log('Starting service_packages table creation...');
  
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbowpaws',
      multipleStatements: true
    });
    
    console.log('Connected to the database');
    
    // Create the basic service_packages table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS service_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT,
        business_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('Private', 'Communal') DEFAULT 'Private',
        cremation_type ENUM('Standard', 'Premium', 'Deluxe') DEFAULT 'Standard',
        processing_time VARCHAR(50) DEFAULT '1-2 days',
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        delivery_fee_per_km DECIMAL(10,2) DEFAULT 50.00,
        conditions TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(provider_id),
        INDEX(business_id)
      );
      
      -- Create package_inclusions table if it doesn't exist
      CREATE TABLE IF NOT EXISTS package_inclusions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        package_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
      );
      
      -- Create package_addons table if it doesn't exist
      CREATE TABLE IF NOT EXISTS package_addons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        package_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
      );
      
      -- Create package_images table if it doesn't exist
      CREATE TABLE IF NOT EXISTS package_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        package_id INT NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        image_id VARCHAR(100),
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
      );
    `;
    
    console.log('Creating service_packages table if it does not exist...');
    await connection.query(createTableSQL);
    
    console.log('Table creation SQL executed successfully');
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
    console.log('Service packages table creation completed successfully!');
  } catch (error) {
    console.error('Error during table creation:', error);
    process.exit(1);
  }
}

createServicePackagesTable(); 