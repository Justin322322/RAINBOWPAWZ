import type { Pool } from "mysql2/promise";
import type { QueryResult } from "@/types/database";
import { getPool } from "./pool";
import { query } from "./query";
import { MYSQL_PORT, getSSLConfig, finalConfig, mysql } from "./pool";

interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
}

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
    await query("SELECT 1 as health_check");
    isConnected = true;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown connection error");
  }

  const responseTime = Date.now() - startTime;
  const pool: any = getPool();
  const poolConfig: any = (pool as any).config || {};
  const poolStats = {
    totalConnections: poolConfig.connectionLimit || 10,
    activeConnections: (pool as any)._allConnections?.length || 0,
    idleConnections: (pool as any)._freeConnections?.length || 0,
    queuedRequests: (pool as any)._connectionQueue?.length || 0,
  };

  if (poolStats.queuedRequests > 5) {
    errors.push("High number of queued requests detected");
  }

  if (poolStats.idleConnections === 0 && poolStats.activeConnections > 0) {
    errors.push("No idle connections available");
  }

  return { isConnected, poolStats, responseTime, errors };
}

export async function testConnection() {
  try {
    await query("SELECT 1 as test");
    return true;
  } catch {
    try {
      const connection = await mysql.createConnection({
        host: (finalConfig as any).host,
        user: (finalConfig as any).user,
        password: (finalConfig as any).password,
        port: MYSQL_PORT,
        database: (finalConfig as any).database,
        ssl: getSSLConfig(),
      });

      await connection.end();
      return true;
    } catch {
      return false;
    }
  }
}


