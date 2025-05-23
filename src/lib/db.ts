import mysql from 'mysql2/promise';

// IMPORTANT: Always use 3306 for MySQL, regardless of the web server port
const MYSQL_PORT = 3306;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost', // Use localhost for XAMPP
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  socketPath: undefined,
  insecureAuth: true,
  // Add connection timeout and better error handling
  connectTimeout: 10000,
  debug: process.env.NODE_ENV === 'development',
  multipleStatements: false,
  ssl: false
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
    }
  })();

} catch (error) {
  const err = error as any;

  if (err.code === 'ECONNREFUSED') {
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
  } else if (err.code === 'ER_BAD_DB_ERROR') {
  }

  // Create a fallback pool with default values
  try {
    pool = mysql.createPool(productionConfig);
  } catch (fallbackError) {
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
    const err = error as any;

    // Log the error details
    console.error("Database query error:", {
      code: err.code,
      message: err.message,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      sql: sql.substring(0, 200) // Log only first 200 chars for security
    });

    // Check if it's a connection error
    if (err.code === 'ECONNREFUSED') {
      console.error("Connection refused error - MySQL server might not be running");
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("Access denied error - Check username and password");
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error("Database does not exist - Check database name");
    } else if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error("Connection lost - Attempting to reconnect");
      // The connection was lost, try to reconnect
      try {
        pool = mysql.createPool(finalConfig);
        console.log("Reconnection successful");
      } catch (reconnectError) {
        console.error("Failed to reconnect:", reconnectError);
      }
    }

    throw error;
  }
}

// Test the database connection
export async function testConnection() {
  try {
    const result = await query('SELECT 1 as test');
    return true;
  } catch (error) {
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
    return false;
  }
}

// Helper function to check if a table exists
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(`SHOW TABLES LIKE '${tableName}'`) as any[];
    return result.length > 0;
  } catch (err) {
    return false;
  }
}

export default pool;