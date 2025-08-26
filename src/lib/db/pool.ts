import mysql from "mysql2/promise";

// IMPORTANT: Always use 3306 for MySQL, regardless of the web server port
export const MYSQL_PORT = 3306;

// Helper function to get SSL config
export const getSSLConfig = () => {
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: true };
  }
  return undefined; // No SSL for local development
};

// Detect PlanetScale/Vitess environment
export function isPlanetScale(): boolean {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL || "";
  const host = (() => {
    try {
      const u = new URL(url);
      return u.hostname || "";
    } catch {
      return "";
    }
  })();
  return (
    /planetscale/i.test(url) ||
    /vitess/i.test(url) ||
    /psdb\.cloud/i.test(host) ||
    process.env.PLANETSCALE === "true"
  );
}

// Prefer DATABASE_URL if provided (e.g., PlanetScale)
function tryCreatePoolFromDatabaseUrl(): mysql.Pool | null {
  if (process.env.USE_DATABASE_URL === 'false') {
    return null;
  }
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (!databaseUrl) return null;
  try {
    const url = new URL(databaseUrl);
    const pool = mysql.createPool({
      host: url.hostname,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname ? url.pathname.replace(/^\//, "") : undefined,
      port: Number(url.port) || MYSQL_PORT,
      waitForConnections: true,
      connectionLimit: process.env.NODE_ENV === "production" ? 20 : 10,
      queueLimit: 0,
      multipleStatements: false,
      ssl: getSSLConfig(),
    });
    return pool;
  } catch {
    return null;
  }
}

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost", // Use localhost for XAMPP
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rainbow_paws",
  port: MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === "production" ? 20 : 10, // Increased pool size
  queueLimit: 0,
  socketPath: undefined,
  connectTimeout: 10000,
  debug: process.env.NODE_ENV === "development",
  multipleStatements: false,
  ssl: getSSLConfig(),
};

// Use environment variables for production to ensure security
export const productionConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rainbow_paws",
  port: MYSQL_PORT, // Always use 3306 for MySQL
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === "production" ? 20 : 10, // Increased pool size
  queueLimit: 0,
  socketPath: undefined,
  // PlanetScale requires SSL in production
  ssl: getSSLConfig(),
  // PlanetScale optimizations
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
};

export const finalConfig = process.env.NODE_ENV === "production" ? productionConfig : dbConfig;

let _pool: mysql.Pool;

function initPool(): mysql.Pool {
  let pool: mysql.Pool;
  try {
    pool = tryCreatePoolFromDatabaseUrl() || mysql.createPool(finalConfig);

    // Test the connection immediately
    (async () => {
      try {
        const connection = await pool.getConnection();
        connection.release();
      } catch {}
    })();
  } catch (error) {
    const err = error as any;

    if (err.code === "ECONNREFUSED") {
      // no-op, fallbacks below
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      // no-op
    } else if (err.code === "ER_BAD_DB_ERROR") {
      // no-op
    }

    // Create a fallback pool with default values
    try {
      pool = tryCreatePoolFromDatabaseUrl() || mysql.createPool(productionConfig);
    } catch {
      // Create a minimal pool as last resort using environment variables
      pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "rainbow_paws",
        port: MYSQL_PORT,
        ssl: getSSLConfig(),
      });
    }
  }
  return pool;
}

// Initialize pool once
_pool = initPool();

export function getPool(): mysql.Pool {
  return _pool;
}

export async function recreatePool(): Promise<void> {
  try {
    _pool = initPool();
  } catch (reconnectError) {
    // Keep old pool if recreation fails
    // eslint-disable-next-line no-console
    console.error("Failed to recreate MySQL pool:", reconnectError);
  }
}

export type { mysql };


