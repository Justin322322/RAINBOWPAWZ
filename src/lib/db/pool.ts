import mysql from "mysql2/promise";

// IMPORTANT: Always use 3306 for MySQL, regardless of the web server port
export const MYSQL_PORT = 3306;

// Helper function to get SSL config
export const getSSLConfig = () => {
  // Use SSL for cloud databases in production
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
    // Railway MySQL requires SSL
    if (isRailwayMySQL()) {
      return { rejectUnauthorized: false }; // Railway uses self-signed certificates
    }
    // PlanetScale requires strict SSL
    if (isPlanetScale()) {
      return { rejectUnauthorized: true };
    }
    // Default SSL for other cloud providers
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

// Detect Railway MySQL environment
export function isRailwayMySQL(): boolean {
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
    /railway/i.test(url) ||
    /rlwy\.net/i.test(host) ||
    process.env.RAILWAY === "true"
  );
}

// Prefer DATABASE_URL if provided (e.g., Railway, PlanetScale)
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
      connectTimeout: 60000,
      idleTimeout: 60000,
    });
    return pool;
  } catch {
    return null;
  }
}

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? undefined : 'localhost'), // Don't use localhost in production
  user: process.env.DB_USER || (process.env.NODE_ENV === 'production' ? undefined : 'root'),
  password: process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : ''),
  database: process.env.DB_NAME || (process.env.NODE_ENV === 'production' ? undefined : 'rainbow_paws'),
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
  // Railway/PlanetScale requires SSL in production
  ssl: getSSLConfig(),
  // Database optimizations
  connectTimeout: 60000,
  idleTimeout: 60000,
};

export const finalConfig = process.env.NODE_ENV === "production" ? productionConfig : dbConfig;

let _pool: mysql.Pool;

function initPool(): mysql.Pool {
  let pool: mysql.Pool;
  
  // Strategy 1: Try cloud database if DATABASE_URL is provided
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  
  // Use cloud database if we have a valid DATABASE_URL (not placeholder)
  if (databaseUrl && 
      !databaseUrl.includes('your-planetscale-host') &&
      !databaseUrl.includes('your-planetscale-username') &&
      !databaseUrl.includes('localhost')) {
    console.log("🔄 Attempting to connect to cloud database...");
    try {
      const cloudPool = tryCreatePoolFromDatabaseUrl();
      if (cloudPool) {
        console.log("✅ Created cloud database pool, will test on first use");
        return cloudPool;
      }
    } catch {
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


