import mysql from "mysql2/promise";

// Use environment variable for port, fallback to 3306 for MySQL
export const MYSQL_PORT = parseInt(process.env.DB_PORT || "3306");

// Helper function to get SSL config
export const getSSLConfig = () => {
  // Always use SSL for Railway database if DATABASE_URL is present
  if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
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
    /gondola\.proxy\.rlwy\.net/i.test(host) ||
    process.env.RAILWAY === "true" ||
    (!!process.env.DB_HOST && /rlwy\.net/i.test(process.env.DB_HOST))
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
      connectTimeout: 10000,
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
  port: MYSQL_PORT, // Use environment variable for port
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

type GlobalWithMysql = typeof globalThis & { __rainbowMysqlPool?: mysql.Pool };
const globalForMysql = globalThis as unknown as GlobalWithMysql;

let _pool: mysql.Pool;

function initPool(): mysql.Pool {
  // Always try to use DATABASE_URL first if it's available and valid
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (databaseUrl &&
      !databaseUrl.includes('your-planetscale-host') &&
      !databaseUrl.includes('your-planetscale-username') &&
      !databaseUrl.includes('localhost')) {
    const cloudPool = tryCreatePoolFromDatabaseUrl();
    if (cloudPool) {
      console.log('Using cloud database from DATABASE_URL');
      return cloudPool;
    }
  }

  // Production: require a valid DATABASE_URL and never fall back to localhost
  if (process.env.NODE_ENV === "production") {
    const cloudPool = tryCreatePoolFromDatabaseUrl();
    if (!cloudPool) {
      throw new Error("DATABASE_URL is required in production and must be valid");
    }
    return cloudPool;
  }

  // Local development pool (fallback)
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
    ssl: undefined,
  } as const;
  console.log('Using local database (fallback)');
  return mysql.createPool(localConfig);
}

// Initialize pool once, with dev/serverless global cache to avoid hot-reload churn
const cachedPool = process.env.NODE_ENV !== "production" ? globalForMysql.__rainbowMysqlPool : undefined;
_pool = cachedPool ?? initPool();
if (process.env.NODE_ENV !== "production") {
  globalForMysql.__rainbowMysqlPool = _pool;
}

export function getPool(): mysql.Pool {
  return _pool;
}

export async function recreatePool(): Promise<void> {
  try {
    const newPool = initPool();
    _pool = newPool;
    if (process.env.NODE_ENV !== "production") {
      globalForMysql.__rainbowMysqlPool = newPool;
    }
  } catch (reconnectError) {
    // Keep old pool if recreation fails
    // eslint-disable-next-line no-console
    console.error("Failed to recreate MySQL pool:", reconnectError);
  }
}

export type { mysql };


