const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testRegistration() {
  console.log('Testing registration process...');
  
  // Get database connection details from environment variables or use defaults
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
    
    // Create test user data
    const testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '1234567890',
      address: '123 Test St',
      sex: 'Male',
      role: 'fur_parent'
    };
    
    console.log('Test user data:', {
      ...testUser,
      password: '[REDACTED]'
    });
    
    // Start transaction
    await connection.query('START TRANSACTION');
    console.log('Transaction started');
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      console.log('Password hashed successfully');
      
      // Check users table structure
      console.log('Checking users table structure...');
      const [tableInfo] = await connection.query('DESCRIBE users');
      console.log('Users table structure:', tableInfo.map(field => field.Field));
      
      // Insert user
      console.log('Inserting test user...');
      const [result] = await connection.query(
        `INSERT INTO users (email, password, first_name, last_name, phone_number, address, sex, role) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testUser.email,
          hashedPassword,
          testUser.firstName,
          testUser.lastName,
          testUser.phoneNumber,
          testUser.address,
          testUser.sex,
          testUser.role
        ]
      );
      
      const userId = result.insertId;
      console.log('User inserted successfully with ID:', userId);
      
      // Generate OTP
      console.log('Generating OTP for user...');
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      
      // Store OTP in database
      await connection.query(
        'INSERT INTO otp_codes (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
        [userId, otpCode, expiresAt]
      );
      console.log('OTP generated and stored successfully:', otpCode);
      
      // Record OTP attempt
      await connection.query(
        'INSERT INTO otp_attempts (user_id, attempt_type, ip_address) VALUES (?, ?, ?)',
        [userId, 'generate', '127.0.0.1']
      );
      console.log('OTP attempt recorded successfully');
      
      // Commit transaction
      await connection.query('COMMIT');
      console.log('Transaction committed successfully');
      
      console.log('Registration test completed successfully');
    } catch (error) {
      // Rollback transaction on error
      await connection.query('ROLLBACK');
      console.error('Error during registration test, transaction rolled back:', error);
      throw error;
    } finally {
      // Close connection
      await connection.end();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error in test registration:', error);
    process.exit(1);
  }
}

// Run the function
testRegistration().catch(console.error); 