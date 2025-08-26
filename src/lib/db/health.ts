import { getPool } from "./pool";
import { query } from "./query";
import { MYSQL_PORT } from "./pool";
import mysql from "mysql2/promise";

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
    console.log("✅ Primary database connection successful");
    return true;
  } catch (_error) {
    console.log("❌ Primary connection failed, trying fallback...");
    
    // Always try local database as fallback
    try {
      const connection = await mysql.createConnection({
        host: "localhost",
        user: "root", 
        password: "",
        port: MYSQL_PORT,
        database: "rainbow_paws",
        ssl: undefined, // Explicitly disable SSL
      });

      await connection.execute("SELECT 1 as test");
      await connection.end();
      console.log("✅ Fallback local connection successful");
      return true;
    } catch (fallbackError) {
      console.log("❌ Fallback connection also failed:", fallbackError);
      return false;
    }
  }
}


