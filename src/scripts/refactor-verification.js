// Script to refactor the verification system in the database
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Database configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

async function runRefactorScript() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Read the SQL script
    const scriptPath = path.join(process.cwd(), 'database', 'refactor_verification.sql');
    console.log('Reading SQL script from:', scriptPath);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`SQL script not found at ${scriptPath}`);
    }
    
    const sqlScript = fs.readFileSync(scriptPath, 'utf8');
    console.log('SQL script loaded successfully');
    
    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await connection.query(statement);
        console.log(`Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement);
        // Continue with the next statement
      }
    }
    
    console.log('Database refactoring completed successfully');
    
    // Verify the changes
    console.log('Verifying changes...');
    
    // Check business_profiles table structure
    const [bpColumns] = await connection.query(`
      SHOW COLUMNS FROM business_profiles
    `);
    
    console.log('business_profiles table columns:');
    bpColumns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
    });
    
    // Check users table structure
    const [userColumns] = await connection.query(`
      SHOW COLUMNS FROM users
    `);
    
    console.log('users table columns:');
    userColumns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
    });
    
    // Check if the view was created
    try {
      const [viewCheck] = await connection.query(`
        SHOW TABLES LIKE 'verified_businesses'
      `);
      
      if (viewCheck.length > 0) {
        console.log('verified_businesses view created successfully');
      } else {
        console.warn('verified_businesses view was not created');
      }
    } catch (error) {
      console.error('Error checking for verified_businesses view:', error.message);
    }
    
  } catch (error) {
    console.error('Error during database refactoring:', error);
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the script
runRefactorScript().then(() => {
  console.log('Script execution completed');
}).catch(error => {
  console.error('Unhandled error during script execution:', error);
  process.exit(1);
});
