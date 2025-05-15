// Database inspection script
const mysql = require('mysql2/promise');

async function checkDatabase() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'rainbow_paws'
    });
    
    console.log('Connected to database');
    
    // Check bookings table structure
    console.log('\nBookings table structure:');
    const [columns] = await connection.query('DESCRIBE bookings');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
    // Get some sample data
    console.log('\nSample booking data:');
    const [bookings] = await connection.query('SELECT * FROM bookings LIMIT 2');
    console.log(JSON.stringify(bookings, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConnection closed');
    }
  }
}

checkDatabase(); 