// Script to check users in the database
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkUsers() {
  let connection;

  try {
    // Create database connection
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      port: parseInt(process.env.DB_PORT || '3306')
    };

    console.log(`Connecting to database ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check if the users table exists
    console.log('Checking if users table exists...');
    const [tableResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'users'`
    );

    if (tableResult[0].count === 0) {
      console.error('Users table does not exist');
      return;
    }

    // Get table structure
    console.log('Getting table structure...');
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('User table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });

    // Get all users
    console.log('\nGetting all users...');
    const [users] = await connection.execute('SELECT * FROM users LIMIT 10');

    if (!users || users.length === 0) {
      console.log('No users found in the database');
      return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name || ''} ${user.last_name || ''}`);
    });

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

checkUsers();
