import type { QueryResult } from "@/types/database";
import { getPool, recreatePool } from "./pool";
import { isPlanetScale } from "./pool";

const QUERY_TIMEOUT_MS = Number(process.env.DB_QUERY_TIMEOUT_MS ?? "") || 8000;
const DB_QUERY_MAX_RETRIES = Number(process.env.DB_QUERY_MAX_RETRIES ?? "") || 3;
const DB_QUERY_BACKOFF_CAP_MS = Number(process.env.DB_QUERY_BACKOFF_CAP_MS ?? "") || 5000;
const DB_QUERY_TOTAL_TIMEOUT_MS = Number(process.env.DB_QUERY_TOTAL_TIMEOUT_MS ?? "") || 30000;

// PlanetScale: Remove FOREIGN KEY constraints from CREATE TABLE
function sanitizeCreateTableForPlanetScale(sql: string): string {
  if (!/^\s*CREATE\s+TABLE/i.test(sql) || !/FOREIGN\s+KEY/i.test(sql)) {
    return sql;
  }
  let cleaned = sql
    .replace(/,?\s*CONSTRAINT\s+[^,)]*\s+FOREIGN\s+KEY[^,)]*(?=,|\))/gis, "")
    .replace(/,?\s*FOREIGN\s+KEY[^,)]*(?=,|\))/gis, "");
  cleaned = cleaned.replace(/,\s*\)/g, ")");
  return cleaned;
}

// Sanitize parameters to prevent logging PII/secrets
function sanitizeParams(params: any): any {
  if (params === null || params === undefined) {
    return params;
  }

  // Handle arrays
  if (Array.isArray(params)) {
    return params.map(param => sanitizeParams(param));
  }

  // Handle objects
  if (typeof params === 'object') {
    // Check if it's a Buffer or Blob-like object
    if (params instanceof Buffer || (params && typeof params === 'object' && 'length' in params && typeof params.length === 'number' && params.length > 1000)) {
      return "[REDACTED: Large Buffer/Blob]";
    }

    // Handle regular objects
    const sanitized: any = {};
    for (const [key, value] of Object.entries(params)) {
      sanitized[key] = sanitizeParams(value);
    }
    return sanitized;
  }

  // Handle strings - truncate long ones
  if (typeof params === 'string' && params.length > 256) {
    return params.substring(0, 256) + "...";
  }

  // Return primitive types as-is
  return params;
}

export async function query(sql: string, params: any[] = []): Promise<QueryResult> {
  const isDDL = /^(\s*)(CREATE|ALTER|DROP)\s+/i.test(sql);
  if (process.env.NODE_ENV === "production" && isDDL && process.env.ALLOW_DDL !== "true") {
    throw new Error("DDL statements are blocked in production. Set ALLOW_DDL=true to allow.");
  }

  if (isDDL && isPlanetScale()) {
    sql = sanitizeCreateTableForPlanetScale(sql);
  }

  const maxRetries = DB_QUERY_MAX_RETRIES;
  let lastError: any;
  const queryStartTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pool = getPool();
      const [results] = await pool.execute({ sql, timeout: QUERY_TIMEOUT_MS }, params);
      const durationMs = Date.now() - queryStartTime;
      if (durationMs > 200) {
        // eslint-disable-next-line no-console
        console.warn(`[DB SLOW ${durationMs}ms]`, sql.substring(0, 120));
      }
      return results as QueryResult;
    } catch (error) {
      const err = error as any;
      lastError = err;

      // eslint-disable-next-line no-console
      console.error(`Database query error (attempt ${attempt}/${maxRetries}):`, {
        code: err.code,
        message: err.message,
        sql: sql.substring(0, 100) + (sql.length > 100 ? "..." : ""),
        params: sanitizeParams(params),
      });

      const isRetryableError =
        err.code === "ER_LOCK_WAIT_TIMEOUT" ||
        err.code === "ER_LOCK_DEADLOCK" ||
        err.code === "ECONNRESET" ||
        err.code === "PROTOCOL_CONNECTION_LOST" ||
        err.code === "ETIMEDOUT" ||
        err.message?.includes("timeout");

      if (isRetryableError && attempt < maxRetries) {
        // Check if we have enough time left for another attempt
        const elapsedTime = Date.now() - queryStartTime;
        const remainingTime = DB_QUERY_TOTAL_TIMEOUT_MS - elapsedTime;

        if (remainingTime <= 0) {
          // eslint-disable-next-line no-console
          console.warn(`Query retry budget exceeded (${elapsedTime}ms elapsed, ${DB_QUERY_TOTAL_TIMEOUT_MS}ms total timeout). Stopping retries.`);
          break;
        }

        // Calculate backoff time with configurable cap
        const baseWaitTime = 1000 * Math.pow(2, attempt - 1);
        const waitTime = Math.min(baseWaitTime, DB_QUERY_BACKOFF_CAP_MS, remainingTime);

        // eslint-disable-next-line no-console
        console.warn(`Retrying query in ${waitTime}ms due to ${err.code} (attempt ${attempt}/${maxRetries}, elapsed: ${elapsedTime}ms)`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      break;
    }
  }

  const err = lastError;
  if (err.code === "ECONNREFUSED") {
    // eslint-disable-next-line no-console
    console.error("MySQL server connection refused. Please ensure MySQL is running on port 3306.");
  } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
    // eslint-disable-next-line no-console
    console.error("MySQL access denied. Please check database credentials.");
  } else if (err.code === "ER_BAD_DB_ERROR") {
    // eslint-disable-next-line no-console
    console.error("MySQL database does not exist. Please check database name.");
  } else if (err.code === "PROTOCOL_CONNECTION_LOST") {
    // eslint-disable-next-line no-console
    console.error("MySQL connection lost. Attempting to recreate pool...");
    try {
      await recreatePool();
    } catch (reconnectError) {
      // eslint-disable-next-line no-console
      console.error("Failed to recreate MySQL pool:", reconnectError);
    }
  } else if (err.code === "ETIMEDOUT") {
    // eslint-disable-next-line no-console
    console.error("MySQL connection timeout. The server may be overloaded.");
  } else if (err.code === "ER_LOCK_WAIT_TIMEOUT") {
    // eslint-disable-next-line no-console
    console.error("Lock wait timeout exceeded. This may indicate database contention.");
  }

  throw lastError;
}


