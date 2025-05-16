require('dotenv').config();
const mysql = require('mysql2/promise');

async function createServiceBookingsTable() {
  console.log('Starting service_bookings table creation...');
  
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      multipleStatements: true
    });
    
    console.log('Connected to the database');
    
    // Create the service_bookings table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS service_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        provider_id INT NOT NULL,
        package_id INT NOT NULL,
        booking_date DATE,
        booking_time TIME,
        status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        special_requests TEXT,
        pet_name VARCHAR(255),
        pet_type VARCHAR(255),
        pet_image_url VARCHAR(255),
        cause_of_death VARCHAR(255),
        payment_method VARCHAR(50) DEFAULT 'cash',
        delivery_option VARCHAR(50) DEFAULT 'pickup',
        delivery_distance FLOAT DEFAULT 0,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE
      )
    `;
    
    await connection.query(createTableSQL);
    console.log('Service_bookings table created successfully!');
    
    // Check if we have data in service_packages to use for a sample booking
    const [packages] = await connection.query(`SELECT id, price FROM service_packages LIMIT 1`);
    const [users] = await connection.query(`SELECT id FROM users WHERE role = 'furparent' LIMIT 1`);
    
    if (packages.length > 0 && users.length > 0) {
      console.log('Creating a sample service booking...');
      
      const insertSampleData = `
        INSERT INTO service_bookings (
          user_id, provider_id, package_id, booking_date, booking_time,
          status, special_requests, pet_name, pet_type, price
        ) VALUES (
          ?, 14, ?, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00:00',
          'pending', 'Please handle with care', 'Max', 'Dog', ?
        )
      `;
      
      await connection.query(insertSampleData, [
        users[0].id,
        packages[0].id,
        packages[0].price
      ]);
      
      console.log('Sample service booking created!');
    } else {
      console.log('No packages or users found for creating a sample service booking.');
    }
    
    await connection.end();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createServiceBookingsTable(); 