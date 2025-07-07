import mysql from 'mysql2/promise';
import { QueryResult } from '@/types/database';

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
  connectionLimit: process.env.NODE_ENV === 'production' ? 20 : 10, // Increased pool size
  queueLimit: 0,
  socketPath: undefined,
  // Removed insecureAuth for security
  // Add connection timeout and better error handling
  connectTimeout: 10000,
  debug: process.env.NODE_ENV === 'development',
  multipleStatements: false,
  ssl: false
};

// Create a connection pool with error handling
let pool: mysql.Pool;

// Use environment variables for production to ensure security
const productionConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: MYSQL_PORT, // Always use 3306 for MySQL
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'production' ? 20 : 10, // Increased pool size
  queueLimit: 0,
  socketPath: undefined,
  // Removed insecureAuth for security
};

// Use production config in production, otherwise use environment variables
const finalConfig = process.env.NODE_ENV === 'production'
  ? productionConfig
  : dbConfig;

// Connection pool monitoring
interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
}

try {
  pool = mysql.createPool(finalConfig);

  // Test the connection immediately
  (async () => {
    try {
      const connection = await pool.getConnection();
      connection.release();
    } catch {
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
  } catch {
    // Create a minimal pool as last resort using environment variables
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      port: MYSQL_PORT
    });
  }
}



// **🔥 NEW: Database Health Check Endpoint**
export async function getDatabaseHealth(): Promise<{
  isConnected: boolean;
  poolStats: PoolStats;
  responseTime: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let isConnected = false;

  try {
    await query('SELECT 1 as health_check');
    isConnected = true;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown connection error');
  }

  const responseTime = Date.now() - startTime;
  const poolConfig = pool.config;
  const poolStats = {
    totalConnections: poolConfig.connectionLimit || 10,
    activeConnections: (pool as any)._allConnections?.length || 0,
    idleConnections: (pool as any)._freeConnections?.length || 0,
    queuedRequests: (pool as any)._connectionQueue?.length || 0
  };

  // Check for potential issues
  if (poolStats.queuedRequests > 5) {
    errors.push('High number of queued requests detected');
  }

  if (poolStats.idleConnections === 0 && poolStats.activeConnections > 0) {
    errors.push('No idle connections available');
  }

  return {
    isConnected,
    poolStats,
    responseTime,
    errors
  };
}



// Helper function to execute SQL queries with retry logic for lock timeouts
export async function query(sql: string, params: any[] = []): Promise<QueryResult> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let connection: mysql.PoolConnection | undefined;

    try {
      // Get a connection from the pool with timeout
      connection = await Promise.race([
        pool.getConnection(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);

      try {
        // Execute the query with timeout
        const [results] = await Promise.race([
          connection.query(sql, params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query execution timeout')), 15000)
          )
        ]);
        return results as QueryResult;
      } finally {
        // **🔥 CRITICAL: Always release the connection back to the pool**
        connection.release();
      }
    } catch (error) {
      const err = error as any;
      lastError = err;

      // Log the error for debugging
      console.error(`Database query error (attempt ${attempt}/${maxRetries}):`, {
        code: err.code,
        message: err.message,
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params: params
      });

      // Check if it's a retryable error
      const isRetryableError = err.code === 'ER_LOCK_WAIT_TIMEOUT' ||
                              err.code === 'ER_LOCK_DEADLOCK' ||
                              err.code === 'ECONNRESET' ||
                              err.message?.includes('timeout');

      if (isRetryableError && attempt < maxRetries) {
        // Wait before retry with exponential backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`Retrying query in ${waitTime}ms due to ${err.code}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Clean up connection pool if needed
        if (attempt === 2) {
          // Force a small delay to allow pool to recover
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        continue;
      }

      // If it's not retryable or we've exhausted retries, break the loop
      break;
    }
  }

  // Handle the final error after all retries
  const err = lastError;

  // Check if it's a connection error and provide helpful messages
  if (err.code === 'ECONNREFUSED') {
    console.error('MySQL server connection refused. Please ensure MySQL is running on port 3306.');
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('MySQL access denied. Please check database credentials.');
  } else if (err.code === 'ER_BAD_DB_ERROR') {
    console.error('MySQL database does not exist. Please check database name.');
  } else if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('MySQL connection lost. Attempting to recreate pool...');
    try {
      pool = mysql.createPool(finalConfig);
    } catch (reconnectError) {
      console.error('Failed to recreate MySQL pool:', reconnectError);
    }
  } else if (err.code === 'ETIMEDOUT') {
    console.error('MySQL connection timeout. The server may be overloaded.');
  } else if (err.code === 'ER_LOCK_WAIT_TIMEOUT') {
    console.error('Lock wait timeout exceeded. This may indicate database contention.');
  }

  // Throw the final error
  throw lastError;
}

// **🔥 NEW: Proper Transaction Management Class**
export class DatabaseTransaction {
  private connection: mysql.PoolConnection | null = null;
  private isActive = false;

  async begin(): Promise<void> {
    if (this.isActive) {
      throw new Error('Transaction already active');
    }

    try {
      // Get a dedicated connection for this transaction
      this.connection = await pool.getConnection();
      await this.connection.query('START TRANSACTION');
      this.isActive = true;
    } catch (error) {
      // Release connection if we got one but failed to start transaction
      if (this.connection) {
        this.connection.release();
        this.connection = null;
      }
      throw error;
    }
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.isActive || !this.connection) {
      throw new Error('Transaction not active or connection not available');
    }

    try {
      const [results] = await this.connection.query(sql, params);
      return results as QueryResult;
    } catch (error) {
      console.error('Transaction query error:', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async commit(): Promise<void> {
    if (!this.isActive || !this.connection) {
      throw new Error('No active transaction to commit');
    }

    try {
      await this.connection.query('COMMIT');
    } finally {
      this.cleanup();
    }
  }

  async rollback(): Promise<void> {
    if (!this.isActive || !this.connection) {
      // Don't throw error - just log and cleanup
      console.warn('Attempted to rollback inactive transaction or missing connection');
      this.cleanup();
      return;
    }

    try {
      await this.connection.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
      // Don't throw the rollback error - just log it
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.connection) {
      this.connection.release();
      this.connection = null;
    }
    this.isActive = false;
  }

  // **🔥 NEW: Manual cleanup method for environments without Symbol.asyncDispose**
  async dispose(): Promise<void> {
    if (this.isActive) {
      await this.rollback();
    }
  }
}

// **🔥 NEW: Utility function for running transactions safely**
export async function withTransaction<T>(
  operation: (transaction: DatabaseTransaction) => Promise<T>
): Promise<T> {
  const transaction = new DatabaseTransaction();
  
  try {
    await transaction.begin();
    const result = await operation(transaction);
    await transaction.commit();
    return result;
  } catch (originalError) {
    // Store the original error to ensure it's preserved
    let errorToThrow = originalError;
    
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Log rollback error but don't let it mask the original error
      console.error('Error during transaction rollback (original error will be thrown):', rollbackError);
      
      // Only replace the error if the original error was specifically about the transaction state
      // and the rollback error provides more meaningful information
      if (originalError instanceof Error && 
          originalError.message.includes('Transaction not active') &&
          rollbackError instanceof Error) {
        errorToThrow = rollbackError;
      }
    }
    
    // Always throw the original error (or meaningful replacement)
    throw errorToThrow;
  }
}

// Test the database connection
export async function testConnection() {
  try {
    await query('SELECT 1 as test');
    return true;
  } catch {
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
    } catch {
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

    const tablesResult = await query(tablesCheckQuery);
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

      const columnResult = await query(columnCheckQuery);

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
  } catch {
    return false;
  }
}

// Helper function to check if a table exists
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // Use parameterized query to prevent SQL injection
    const result = await query('SHOW TABLES LIKE ?', [tableName]);
    return result.length > 0;
  } catch {
    return false;
  }
}

// Default export removed - not used
