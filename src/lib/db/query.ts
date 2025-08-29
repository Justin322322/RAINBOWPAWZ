import type { QueryResult } from "@/types/database";
import { getPool, recreatePool } from "./pool";
import { isPlanetScale } from "./pool";

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

export async function query(sql: string, params: any[] = []): Promise<QueryResult> {
  const isDDL = /^(\s*)(CREATE|ALTER|DROP)\s+/i.test(sql);
  if (process.env.NODE_ENV === "production" && isDDL && process.env.ALLOW_DDL !== "true") {
    throw new Error("DDL statements are blocked in production. Set ALLOW_DDL=true to allow.");
  }

  if (isDDL && isPlanetScale()) {
    sql = sanitizeCreateTableForPlanetScale(sql);
  }

  const maxRetries = 3;
  let lastError: any;

  const startedAt = Date.now();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pool = getPool();
      const [results] = await Promise.race([
        pool.execute(sql, params),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Query execution timeout")), 8000)),
      ]);
      const durationMs = Date.now() - startedAt;
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
        params: params,
      });

      const isRetryableError =
        err.code === "ER_LOCK_WAIT_TIMEOUT" ||
        err.code === "ER_LOCK_DEADLOCK" ||
        err.code === "ECONNRESET" ||
        err.code === "PROTOCOL_CONNECTION_LOST" ||
        err.code === "ETIMEDOUT" ||
        err.message?.includes("timeout");

      if (isRetryableError && attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        // eslint-disable-next-line no-console
        console.warn(`Retrying query in ${waitTime}ms due to ${err.code}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        if (attempt === 2) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
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


