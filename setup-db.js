const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function setupDatabase() {
  console.log('Setting up Rainbow Paws database...');
  
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
    // Connect to MySQL server (without specifying database)
    console.log('Connecting to MySQL server...');
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    console.log('Connected to MySQL server successfully');
    
    // Check if database exists, create if it doesn't
    console.log(`Checking if database '${dbConfig.database}' exists...`);
    const [databases] = await connection.query(`SHOW DATABASES LIKE '${dbConfig.database}'`);
    
    if (databases.length === 0) {
      console.log(`Database '${dbConfig.database}' does not exist, creating it...`);
      await connection.query(`CREATE DATABASE ${dbConfig.database}`);
      console.log(`Database '${dbConfig.database}' created successfully`);
    } else {
      console.log(`Database '${dbConfig.database}' already exists`);
    }
    
    // Close the connection without database
    await connection.end();
    
    // Reconnect with the database specified
    const dbConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database
    });
    console.log(`Connected to database '${dbConfig.database}'`);
    
    // Check if tables exist by looking for the users table
    console.log('Checking if tables exist...');
    const [tables] = await dbConnection.query(`SHOW TABLES LIKE 'users'`);
    
    if (tables.length === 0) {
      console.log('Tables do not exist, importing schema from SQL file...');
      
      // Read and execute the SQL file
      try {
        const sqlFilePath = path.join(process.cwd(), 'refactored_rainbow_paws.sql');
        console.log(`Reading SQL file from: ${sqlFilePath}`);
        
        const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
        
        // Split SQL statements by semicolon
        const statements = sqlContent
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
          .split(';')
          .filter(statement => statement.trim().length > 0);
        
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (statement) {
            try {
              await dbConnection.query(statement);
              if (i % 10 === 0) {
                console.log(`Executed ${i + 1}/${statements.length} statements`);
              }
            } catch (statementError) {
              console.error(`Error executing statement #${i + 1}: ${statementError.message}`);
              console.error('Statement:', statement.substring(0, 100) + '...');
              // Continue with next statement
            }
          }
        }
        
        console.log('Schema imported successfully');
      } catch (fileError) {
        console.error('Error reading or executing SQL file:', fileError);
        throw fileError;
      }
    } else {
      console.log('Tables already exist');
    }
    
    // Check if OTP tables exist
    console.log('Checking if OTP tables exist...');
    const [otpCodesTable] = await dbConnection.query(`SHOW TABLES LIKE 'otp_codes'`);
    const [otpAttemptsTable] = await dbConnection.query(`SHOW TABLES LIKE 'otp_attempts'`);
    
    if (otpCodesTable.length === 0) {
      console.log('Creating otp_codes table...');
      await dbConnection.query(`
        CREATE TABLE IF NOT EXISTS otp_codes (
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
    
    if (otpAttemptsTable.length === 0) {
      console.log('Creating otp_attempts table...');
      await dbConnection.query(`
        CREATE TABLE IF NOT EXISTS otp_attempts (
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
    
    // Check if the users table has the is_otp_verified column
    console.log('Checking if users table has is_otp_verified column...');
    const [userColumns] = await dbConnection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_otp_verified'
    `, [dbConfig.database]);
    
    if (userColumns.length === 0) {
      console.log('Adding is_otp_verified column to users table...');
      await dbConnection.query(`
        ALTER TABLE users ADD COLUMN is_otp_verified TINYINT(1) NOT NULL DEFAULT 0
      `);
      console.log('is_otp_verified column added successfully');
    } else {
      console.log('is_otp_verified column already exists');
    }
    
    // Close the connection
    await dbConnection.end();
    console.log('Database connection closed');
    console.log('Database setup completed successfully');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Run the function
setupDatabase().catch(console.error); 