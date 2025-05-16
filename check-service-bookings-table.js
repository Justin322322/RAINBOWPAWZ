require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkServiceBookings() {
  console.log('Connecting to database...');
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      multipleStatements: true
    });
    
    console.log('Connected to database');
    
    // Check if service_bookings table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_bookings'
    `);
    
    if (tables.length === 0) {
      console.log('The service_bookings table does not exist.');
    } else {
      console.log('The service_bookings table exists. Checking structure...');
      
      // Get table structure
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'service_bookings'
      `);
      
      console.log('Service_bookings table structure:');
      columns.forEach(column => {
        console.log(`- ${column.COLUMN_NAME} (${column.COLUMN_TYPE})`);
      });
      
      // Check for sample data
      const [rows] = await connection.query(`
        SELECT * FROM service_bookings LIMIT 1
      `);
      
      console.log('\nSample service_bookings data:');
      if (rows.length > 0) {
        console.log(JSON.stringify(rows, null, 2));
      } else {
        console.log('No data found in service_bookings table.');
      }
    }
    
    await connection.end();
    console.log('\nConnection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkServiceBookings(); 