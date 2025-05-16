require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateBookingsTable() {
  console.log('Starting service_bookings table update...');
  
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
    
    // Check if service_bookings table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_bookings'
    `);
    
    if (tables.length === 0) {
      console.log('Creating service_bookings table...');
      await connection.query(`
        CREATE TABLE service_bookings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          package_id INT,
          provider_id INT,
          booking_date DATE,
          booking_time TIME,
          pet_name VARCHAR(255),
          pet_type VARCHAR(100),
          pet_breed VARCHAR(100),
          pet_gender VARCHAR(50),
          pet_age VARCHAR(50),
          pet_weight DECIMAL(10,2),
          cause_of_death TEXT,
          special_requests TEXT,
          status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
          payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
          payment_method ENUM('credit_card', 'bank_transfer', 'cash', 'gcash') DEFAULT 'cash',
          delivery_option ENUM('pickup', 'delivery') DEFAULT 'pickup',
          delivery_distance DECIMAL(10,2) DEFAULT 0,
          delivery_fee DECIMAL(10,2) DEFAULT 0,
          total_price DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX(user_id),
          INDEX(package_id),
          INDEX(provider_id)
        )
      `);
      console.log('Table created successfully');
    } else {
      console.log('service_bookings table already exists');
      
      // Check if delivery columns exist and add them if they don't
      const requiredColumns = [
        { name: 'delivery_option', def: "ADD COLUMN delivery_option ENUM('pickup', 'delivery') DEFAULT 'pickup' AFTER payment_method" },
        { name: 'delivery_distance', def: "ADD COLUMN delivery_distance DECIMAL(10,2) DEFAULT 0 AFTER delivery_option" },
        { name: 'delivery_fee', def: "ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0 AFTER delivery_distance" }
      ];
      
      for (const col of requiredColumns) {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'service_bookings'
          AND COLUMN_NAME = ?
        `, [col.name]);
        
        if (columns.length === 0) {
          console.log(`Adding ${col.name} column...`);
          await connection.query(`ALTER TABLE service_bookings ${col.def}`);
          console.log(`${col.name} column added successfully`);
        } else {
          console.log(`${col.name} column already exists`);
        }
      }
    }
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
    console.log('Service bookings table update completed successfully!');
  } catch (error) {
    console.error('Error during table update:', error);
    process.exit(1);
  }
}

updateBookingsTable(); 