import mysql from 'mysql2/promise';

// Only log in development mode
const isDev = process.env.NODE_ENV === 'development';

// Conditional logging function
const logDebug = (message: string, data?: any) => {
  if (isDev) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Log environment variables for debugging (only in development)
if (isDev) {
  console.log('Environment variables in db.ts:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]');
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_PORT:', process.env.DB_PORT);
}

// IMPORTANT: Always use 3306 for MySQL, regardless of the web server port
const MYSQL_PORT = 3306;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: MYSQL_PORT, // Always use 3306 for MySQL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Use hostname rather than socket for all connections
  socketPath: undefined,
  insecureAuth: true,
};

// Log the database configuration (only in development)
logDebug('Database configuration in db.ts:', {
  host: dbConfig.host,
  user: dbConfig.user,
  port: dbConfig.port,
  database: dbConfig.database
});

// Create a connection pool with error handling
let pool;

// Force specific values for production to ensure consistency
const productionConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'rainbow_paws',
  port: MYSQL_PORT, // Always use 3306 for MySQL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  socketPath: undefined,
  insecureAuth: true,
};

// Use production config in production, otherwise use environment variables
const finalConfig = process.env.NODE_ENV === 'production'
  ? productionConfig
  : dbConfig;

logDebug('Final database configuration:', {
  host: finalConfig.host,
  user: finalConfig.user,
  port: finalConfig.port,
  database: finalConfig.database,
  environment: process.env.NODE_ENV
});

try {
  logDebug('Attempting to create MySQL connection pool with config:', {
    host: finalConfig.host,
    user: finalConfig.user,
    database: finalConfig.database,
    port: finalConfig.port
  });

  pool = mysql.createPool(finalConfig);
  logDebug('MySQL connection pool created successfully');

  // Test the connection immediately
  (async () => {
    try {
      const connection = await pool.getConnection();
      logDebug('Successfully got a test connection from the pool');
      connection.release();
      logDebug('Test connection released back to pool');
    } catch (testError) {
      console.error('Failed to get a test connection from the pool:', testError);
    }
  })();

} catch (error) {
  console.error('Error creating MySQL connection pool:', error);
  console.error('Error details:', error.message);

  if (error.code === 'ECONNREFUSED') {
    console.error('Connection refused. Make sure MySQL is running on port 3306.');
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Access denied. Check your MySQL username and password.');
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    console.error('Database does not exist. Make sure the database name is correct.');
  }

  // Create a fallback pool with default values
  logDebug('Creating fallback MySQL connection pool with default values');
  try {
    pool = mysql.createPool(productionConfig);
    logDebug('Fallback pool created successfully');
  } catch (fallbackError) {
    console.error('Failed to create fallback pool:', fallbackError);
    // Create a minimal pool as last resort
    pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'rainbow_paws',
      port: 3306
    });
  }
}

// Helper function to execute SQL queries
export async function query(sql: string, params: any[] = []) {
  try {
    // Always log the query in development mode
    if (isDev) {
      console.log(`Executing query: ${sql}`);
      if (params && params.length > 0) {
        console.log('Query parameters:', params);
      }
    }

    // Get a connection from the pool
    const connection = await pool.getConnection();
    logDebug('Got connection from pool');

    try {
      // Execute the query
      const [results] = await connection.query(sql, params);

      // Log the results in development mode
      if (isDev) {
        if (Array.isArray(results)) {
          console.log(`Query returned ${results.length} rows`);
          if (results.length > 0 && results.length <= 5) {
            console.log('Sample results:', results);
          } else if (results.length > 5) {
            console.log('First 5 results:', results.slice(0, 5));
          }
        } else {
          console.log('Query result:', results);
        }
      }

      return results;
    } finally {
      // Release the connection back to the pool
      connection.release();
      logDebug('Connection released back to pool');
    }
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Failed query:', sql);
    console.error('Query parameters:', params);

    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED') {
      console.error('Database connection refused. Make sure MySQL is running and accessible.');
      console.error('Current connection settings:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      });
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied. Check your username and password.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('Database does not exist. Make sure the database name is correct.');
    } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed. Trying to reconnect...');
      // The connection was lost, try to reconnect
      try {
        pool = mysql.createPool(finalConfig);
        console.log('Reconnected to MySQL successfully');
      } catch (reconnectError) {
        console.error('Failed to reconnect to MySQL:', reconnectError);
      }
    }

    throw error;
  }
}

// Test the database connection
export async function testConnection() {
  try {
    logDebug('Testing database connection...');
    const result = await query('SELECT 1 as test');
    logDebug('Database connection test successful');

    // Check if users table exists
    try {
      logDebug('Checking users table...');
      const users = await query('SELECT COUNT(*) as count FROM users');
      logDebug(`Users table has ${users[0].count} records`);
    } catch (tableError) {
      console.error('Error checking users table:', tableError.message);
    }

    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);

    // Try to connect directly without using the pool
    try {
      logDebug('Trying direct connection without pool...');
      const connection = await mysql.createConnection({
        host: finalConfig.host,
        user: finalConfig.user,
        password: finalConfig.password,
        port: MYSQL_PORT, // Always use standard MySQL port
        database: finalConfig.database
      });

      logDebug('Direct connection successful');
      await connection.end();
      logDebug('Direct connection closed');

      // If direct connection works but pool doesn't, recreate the pool
      pool = mysql.createPool(finalConfig);
      logDebug('Connection pool recreated');

      return true;
    } catch (directError) {
      console.error('Direct connection failed:', directError);
      return false;
    }
  }
}

// Helper function to ensure the availability tables exist
export async function ensureAvailabilityTablesExist(): Promise<boolean> {
  try {
    // Check if tables exist
    const tablesCheckQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('provider_availability', 'provider_time_slots')
    `;
    
    const tablesResult = await query(tablesCheckQuery) as any[];
    const existingTables = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
    
    console.log('[DB] Checking availability tables, found:', existingTables);
    
    // Create provider_availability table if needed
    if (!existingTables.includes('provider_availability')) {
      console.log('[DB] Creating provider_availability table...');
      const createAvailabilityTableQuery = `
        CREATE TABLE provider_availability (
          id INT AUTO_INCREMENT PRIMARY KEY,
          provider_id INT NOT NULL,
          date DATE NOT NULL,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY provider_date_unique (provider_id, date)
        )
      `;
      await query(createAvailabilityTableQuery);
      console.log('[DB] provider_availability table created successfully');
    }
    
    // Create provider_time_slots table if needed
    if (!existingTables.includes('provider_time_slots')) {
      console.log('[DB] Creating provider_time_slots table...');
      const createTimeSlotsTableQuery = `
        CREATE TABLE provider_time_slots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          provider_id INT NOT NULL,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          available_services TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (provider_id, date)
        )
      `;
      await query(createTimeSlotsTableQuery);
      console.log('[DB] provider_time_slots table created successfully');
    } else {
      // Check if available_services column exists in the provider_time_slots table
      const columnCheckQuery = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'provider_time_slots' 
        AND COLUMN_NAME = 'available_services'
      `;
      
      const columnResult = await query(columnCheckQuery) as any[];
      
      // If the column doesn't exist, add it
      if (columnResult.length === 0) {
        console.log('[DB] Adding available_services column to provider_time_slots table...');
        const addColumnQuery = `
          ALTER TABLE provider_time_slots
          ADD COLUMN available_services TEXT DEFAULT NULL
        `;
        
        await query(addColumnQuery);
        console.log('[DB] Added available_services column to provider_time_slots table');
      } else {
        console.log('[DB] available_services column already exists in provider_time_slots table');
      }
    }
    
    return true;
  } catch (error) {
    console.error('[DB] Error ensuring availability tables exist:', error);
    return false;
  }
}

export default pool;