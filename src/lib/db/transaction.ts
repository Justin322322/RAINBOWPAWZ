import type { QueryResult } from "@/types/database";
import { getPool } from "./pool";

export class DatabaseTransaction {
  private connection: any = null;
  private isActive = false;
  private emulateTransaction = false;

  async begin(): Promise<void> {
    if (this.isActive) {
      throw new Error("Transaction already active");
    }

    try {
      this.connection = await getPool().getConnection();
      try {
        await this.connection.query("START TRANSACTION");
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn("START TRANSACTION not supported, emulating transaction:", err?.code || err?.message);
        this.emulateTransaction = true;
      }
      this.isActive = true;
    } catch (error) {
      if (this.connection) {
        this.connection.release();
        this.connection = null;
      }
      throw error;
    }
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.isActive || !this.connection) {
      throw new Error("Transaction not active or connection not available");
    }

    try {
      const [results] = await this.connection.query(sql, params);
      return results as QueryResult;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Transaction query error:", {
        sql: sql.substring(0, 100) + (sql.length > 100 ? "..." : ""),
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async commit(): Promise<void> {
    if (!this.isActive || !this.connection) {
      throw new Error("No active transaction to commit");
    }

    try {
      if (!this.emulateTransaction) {
        await this.connection.query("COMMIT");
      }
    } finally {
      this.cleanup();
    }
  }

  async rollback(): Promise<void> {
    if (!this.isActive || !this.connection) {
      // eslint-disable-next-line no-console
      console.warn("Attempted to rollback inactive transaction or missing connection");
      this.cleanup();
      return;
    }

    try {
      if (!this.emulateTransaction) {
        await this.connection.query("ROLLBACK");
      }
    } catch (rollbackError) {
      // eslint-disable-next-line no-console
      console.error("Failed to rollback transaction:", rollbackError);
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

  async dispose(): Promise<void> {
    if (this.isActive) {
      await this.rollback();
    }
  }
}

export async function withTransaction<T>(operation: (transaction: DatabaseTransaction) => Promise<T>): Promise<T> {
  const transaction = new DatabaseTransaction();

  try {
    await transaction.begin();
    const result = await operation(transaction);
    await transaction.commit();
    return result;
  } catch (originalError) {
    let errorToThrow = originalError as any;
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // eslint-disable-next-line no-console
      console.error("Error during transaction rollback (original error will be thrown):", rollbackError);
      if (
        originalError instanceof Error &&
        originalError.message.includes("Transaction not active") &&
        rollbackError instanceof Error
      ) {
        errorToThrow = rollbackError;
      }
    }
    throw errorToThrow;
  }
}


