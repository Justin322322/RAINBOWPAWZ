import mysql from "mysql2/promise";

// IMPORTANT: Always use 3306 for MySQL, regardless of the web server port
export const MYSQL_PORT = 3306;

// Helper function to get SSL config
export const getSSLConfig = () => {
  // Only use SSL in production and when explicitly configured
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
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
const productionConfig = {
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
  
  // Strategy 1: Try cloud database only if we have a valid real PlanetScale URL
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  
  // Only use cloud if we have a real PlanetScale URL (not placeholder)
  if (databaseUrl && 
      databaseUrl.includes('psdb.cloud') && 
      !databaseUrl.includes('your-planetscale-host') &&
      !databaseUrl.includes('your-planetscale-username')) {
    console.log("🔄 Attempting to connect to cloud database...");
    try {
      const cloudPool = tryCreatePoolFromDatabaseUrl();
      if (cloudPool) {
        console.log("✅ Created cloud database pool, will test on first use");
        return cloudPool;
      }
    } catch (_error) {
      console.log("❌ Failed to create cloud pool, falling back to local database");
    }
  } else {
    console.log("🔄 No valid cloud database URL found, using local database");
  }

  // Strategy 2: Use local database (always fallback)
  try {
    const localConfig = {
      host: "localhost",
      user: "root",
      password: "",
      database: "rainbow_paws",
      port: MYSQL_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      ssl: undefined, // Explicitly disable SSL for local
    };
    pool = mysql.createPool(localConfig);
    console.log("✅ Created local database pool");
    return pool;
  } catch (error) {
    console.error("❌ Local database connection failed:", error);
    throw new Error("Failed to connect to local database");
  }
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


