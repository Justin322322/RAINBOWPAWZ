// Script to test database insertion
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testDatabaseInsertion() {
  console.log('Testing database insertion...');
  
  // Get database connection details from environment variables
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
  };
  
  console.log('Database config:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password ? '[REDACTED]' : 'empty'
  });
  
  try {
    // Connect to the database
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Start a transaction
    await connection.beginTransaction();
    console.log('Transaction started');
    
    try {
      // Generate test data
      const testEmail = `test_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('Test123!', 10);
      
      console.log('Test data:', {
        email: testEmail,
        password: '[REDACTED]',
        hashedPassword: hashedPassword.substring(0, 10) + '...'
      });
      
      // Check if the users table exists
      console.log('Checking if users table exists...');
      const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
      
      if (tables.length === 0) {
        throw new Error('Users table does not exist');
      }
      
      console.log('Users table exists');
      
      // Check the structure of the users table
      console.log('Checking users table structure...');
      const [userFields] = await connection.execute('DESCRIBE users');
      
      console.log('Fields in users table:');
      const fieldNames = userFields.map(field => field.Field);
      console.log(fieldNames);
      
      // Determine if we should use 'role' or 'user_type'
      const roleField = fieldNames.includes('role') ? 'role' : 
                        fieldNames.includes('user_type') ? 'user_type' : null;
      
      if (!roleField) {
        throw new Error('Neither role nor user_type field found in users table');
      }
      
      console.log(`Using ${roleField} field for user role`);
      
      // Try to insert a test user
      console.log('Inserting test user...');
      
      // Build the SQL query dynamically based on the available fields
      const validFields = ['first_name', 'last_name', 'email', 'password', 'phone_number', 'address', 'sex', roleField]
        .filter(field => fieldNames.includes(field));
      
      const placeholders = validFields.map(() => '?').join(', ');
      const sql = `INSERT INTO users (${validFields.join(', ')}) VALUES (${placeholders})`;
      
      console.log('SQL Query:', sql);
      
      const values = [
        'Test', // first_name
        'User', // last_name
        testEmail, // email
        hashedPassword, // password
        '1234567890', // phone_number
        '123 Test St', // address
        'male', // sex
        'fur_parent' // role or user_type
      ].slice(0, validFields.length);
      
      console.log('Values:', values.map((val, i) => i === 3 ? '[REDACTED]' : val));
      
      const [result] = await connection.execute(sql, values);
      
      console.log('Insert result:', result);
      console.log(`User inserted with ID: ${result.insertId}`);
      
      // Commit the transaction
      await connection.commit();
      console.log('Transaction committed');
      
      // Verify the user was inserted
      console.log('Verifying user insertion...');
      const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [testEmail]);
      
      if (users.length === 0) {
        throw new Error('User was not inserted correctly');
      }
      
      console.log('User verified:', {
        id: users[0].id,
        email: users[0].email,
        first_name: users[0].first_name,
        last_name: users[0].last_name,
        role: users[0][roleField]
      });
      
      // Clean up - delete the test user
      console.log('Cleaning up - deleting test user...');
      await connection.execute('DELETE FROM users WHERE email = ?', [testEmail]);
      console.log('Test user deleted');
      
    } catch (error) {
      // Rollback the transaction in case of error
      await connection.rollback();
      console.error('Transaction rolled back due to error:', error);
      throw error;
    } finally {
      // Close the connection
      await connection.end();
      console.log('Database connection closed');
    }
    
    console.log('Database insertion test completed successfully');
    
  } catch (error) {
    console.error('Error during database test:', error);
  }
}

// Run the function
testDatabaseInsertion();
