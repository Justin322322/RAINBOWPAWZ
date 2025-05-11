const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testFullRegistration() {
  console.log('Testing full registration flow...');
  
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
    const timestamp = Date.now();
    const testUser = {
      email: `full_test${timestamp}@example.com`,
      password: 'password123',
      firstName: 'Full Test',
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
    
    // STEP 1: Register user
    console.log('\n=== STEP 1: Register user ===');
    
    // Start transaction
    await connection.query('START TRANSACTION');
    console.log('Transaction started');
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      console.log('Password hashed successfully');
      
      // Check if email already exists
      console.log('Checking if email already exists...');
      const [emailCheck] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [testUser.email]
      );
      
      if (emailCheck.length > 0) {
        throw new Error('Email already exists');
      }
      console.log('Email is available');
      
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
      
      // Commit transaction
      await connection.query('COMMIT');
      console.log('Transaction committed successfully');
      
      // STEP 2: Generate OTP
      console.log('\n=== STEP 2: Generate OTP ===');
      
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
      
      // STEP 3: Verify OTP
      console.log('\n=== STEP 3: Verify OTP ===');
      
      // Record verification attempt
      await connection.query(
        'INSERT INTO otp_attempts (user_id, attempt_type, ip_address) VALUES (?, ?, ?)',
        [userId, 'verify', '127.0.0.1']
      );
      console.log('Verification attempt recorded');
      
      // Mark OTP as used
      await connection.query(
        'UPDATE otp_codes SET is_used = 1 WHERE user_id = ? AND otp_code = ?',
        [userId, otpCode]
      );
      console.log('OTP marked as used');
      
      // Update user verification status
      await connection.query(
        'UPDATE users SET is_otp_verified = 1 WHERE id = ?',
        [userId]
      );
      console.log('User marked as OTP verified');
      
      // STEP 4: Verify final user state
      console.log('\n=== STEP 4: Verify final user state ===');
      
      const [userCheck] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (userCheck.length === 0) {
        throw new Error('User was not created successfully');
      }
      
      console.log('User verified in database:', {
        id: userCheck[0].id,
        email: userCheck[0].email,
        firstName: userCheck[0].first_name,
        lastName: userCheck[0].last_name,
        role: userCheck[0].role,
        isOtpVerified: userCheck[0].is_otp_verified
      });
      
      console.log('\nFull registration test completed successfully');
      
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
testFullRegistration().catch(console.error); 