export { query } from './query';
export { withTransaction } from './transaction';
export { getDatabaseHealth, testConnection } from './health';
export { ensureAvailabilityTablesExist, checkTableExists } from './schema';
// getPool is intentionally not exported; prefer query/withTransaction APIs


