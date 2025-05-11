const mysql = require('mysql2/promise');

async function checkOtpTables() {
  console.log('Checking OTP tables in the database...');
  
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
    
    // Check if the users table has the is_otp_verified column
    console.log('Checking if users table has is_otp_verified column...');
    const [userColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_otp_verified'
    `, [dbConfig.database]);
    
    if (userColumns.length === 0) {
      console.log('Adding is_otp_verified column to users table...');
      await connection.query(`
        ALTER TABLE users ADD COLUMN is_otp_verified TINYINT(1) NOT NULL DEFAULT 0
      `);
      console.log('is_otp_verified column added successfully');
    } else {
      console.log('is_otp_verified column already exists');
    }
    
    // Check if otp_codes table exists
    console.log('Checking if otp_codes table exists...');
    const [otpCodesTable] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'otp_codes'
    `, [dbConfig.database]);
    
    if (otpCodesTable.length === 0) {
      console.log('Creating otp_codes table...');
      await connection.query(`
        CREATE TABLE otp_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          otp_code VARCHAR(6) NOT NULL,
          expires_at DATETIME NOT NULL,
          is_used TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (user_id),
          INDEX (otp_code),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('otp_codes table created successfully');
    } else {
      console.log('otp_codes table already exists');
    }
    
    // Check if otp_attempts table exists
    console.log('Checking if otp_attempts table exists...');
    const [otpAttemptsTable] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'otp_attempts'
    `, [dbConfig.database]);
    
    if (otpAttemptsTable.length === 0) {
      console.log('Creating otp_attempts table...');
      await connection.query(`
        CREATE TABLE otp_attempts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          attempt_type ENUM('generate', 'verify') NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (user_id),
          INDEX (attempt_time),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('otp_attempts table created successfully');
    } else {
      console.log('otp_attempts table already exists');
    }
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    console.log('OTP tables setup completed successfully');
    
  } catch (error) {
    console.error('Error setting up OTP tables:', error);
    process.exit(1);
  }
}

// Run the function
checkOtpTables().catch(console.error); 