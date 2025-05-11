// Script to check database structure
require('dotenv').config({ path: '.env.local' });

const mysql = require('mysql2/promise');

async function checkDatabase() {
  console.log('Checking database structure...');
  
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
    
    // Get list of tables
    console.log('\nFetching tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables in database:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    
    // Check users table structure
    console.log('\nChecking users table structure...');
    try {
      const [userFields] = await connection.execute('DESCRIBE users');
      console.log('Fields in users table:');
      userFields.forEach(field => {
        console.log(`- ${field.Field} (${field.Type}) ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Key} ${field.Default ? `DEFAULT ${field.Default}` : ''}`);
      });
    } catch (error) {
      console.error('Error checking users table:', error.message);
    }
    
    // Check business_profiles table structure
    console.log('\nChecking business_profiles table structure...');
    try {
      const [businessFields] = await connection.execute('DESCRIBE business_profiles');
      console.log('Fields in business_profiles table:');
      businessFields.forEach(field => {
        console.log(`- ${field.Field} (${field.Type}) ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Key} ${field.Default ? `DEFAULT ${field.Default}` : ''}`);
      });
    } catch (error) {
      console.error('Error checking business_profiles table:', error.message);
    }
    
    // Close the connection
    await connection.end();
    console.log('\nDatabase check completed');
    
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

// Run the function
checkDatabase();
