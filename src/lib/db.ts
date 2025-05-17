import mysql from 'mysql2/promise';

// Only for conditional operations in development mode
const isDev = process.env.NODE_ENV === 'development';

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



try {
  pool = mysql.createPool(finalConfig);

  // Test the connection immediately
  (async () => {
    try {
      const connection = await pool.getConnection();
      connection.release();
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
  try {
    pool = mysql.createPool(productionConfig);
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
    // Get a connection from the pool
    const connection = await pool.getConnection();

    try {
      // Execute the query
      const [results] = await connection.query(sql, params);
      return results;
    } finally {
      // Release the connection back to the pool
      connection.release();
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
    const result = await query('SELECT 1 as test');

    // Check if users table exists
    try {
      const users = await query('SELECT COUNT(*) as count FROM users');
    } catch (tableError) {
      console.error('Error checking users table:', tableError.message);
    }

    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);

    // Try to connect directly without using the pool
    try {
      const connection = await mysql.createConnection({
        host: finalConfig.host,
        user: finalConfig.user,
        password: finalConfig.password,
        port: MYSQL_PORT, // Always use standard MySQL port
        database: finalConfig.database
      });

      await connection.end();

      // If direct connection works but pool doesn't, recreate the pool
      pool = mysql.createPool(finalConfig);

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

    // Create provider_availability table if needed
    if (!existingTables.includes('provider_availability')) {
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
    }

    // Create provider_time_slots table if needed
    if (!existingTables.includes('provider_time_slots')) {
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
        const addColumnQuery = `
          ALTER TABLE provider_time_slots
          ADD COLUMN available_services TEXT DEFAULT NULL
        `;

        await query(addColumnQuery);
      }
    }

    return true;
  } catch (error) {
    console.error('[DB] Error ensuring availability tables exist:', error);
    return false;
  }
}

export default pool;