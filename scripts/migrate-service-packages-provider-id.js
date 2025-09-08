#!/usr/bin/env node
// Standardize service_packages.provider_id, backfill values, and add FK
const mysql = require('mysql2/promise');

function getCfg() {
  const dsn = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  if (dsn) return dsn;
  return {
    host: process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway',
    multipleStatements: true,
  };
}

async function q(conn, sql, params) {
  const [rows] = await conn.execute(sql, params || []);
  return rows;
}

async function main() {
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[migrate] Connected');

  // Check table exists
  const hasPackages = await q(conn, `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'service_packages'`);
  if (!hasPackages.length) {
    console.log('[migrate] service_packages table not found. Nothing to do.');
    await conn.end();
    return;
  }

  const columns = await q(conn, `SHOW COLUMNS FROM service_packages`);
  const colSet = new Set(columns.map(c => c.Field));

  await conn.beginTransaction();
  try {
    // Add provider_id if missing
    if (!colSet.has('provider_id')) {
      console.log('[migrate] Adding provider_id column to service_packages');
      await q(conn, `ALTER TABLE service_packages ADD COLUMN provider_id INT NULL AFTER id`);
    }

    // Backfill provider_id from service_provider_id if present
    if (colSet.has('service_provider_id')) {
      console.log('[migrate] Backfilling provider_id from service_provider_id');
      await q(conn, `UPDATE service_packages SET provider_id = service_provider_id WHERE provider_id IS NULL`);
    }

    // If still null, try to backfill via known relations (noop here if none)
    console.log('[migrate] Null provider_id remaining:', (await q(conn, `SELECT COUNT(*) AS c FROM service_packages WHERE provider_id IS NULL`))[0].c);

    // Ensure index and FK to service_providers(provider_id)
    try {
      await q(conn, `CREATE INDEX idx_service_packages_provider_id ON service_packages (provider_id)`);
      console.log('[migrate] Created index idx_service_packages_provider_id');
    } catch (e) {
      console.log('[migrate] Index exists or create skipped:', e.message);
    }

    // Drop legacy FK if exists
    const fkRows = await q(conn, `
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'service_packages'
        AND COLUMN_NAME = 'provider_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL`);
    for (const fk of fkRows) {
      console.log('[migrate] Dropping FK', fk.CONSTRAINT_NAME);
      await q(conn, `ALTER TABLE service_packages DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
    }

    console.log('[migrate] Creating FK service_packages(provider_id) → service_providers(provider_id)');
    await q(conn, `
      ALTER TABLE service_packages
        ADD CONSTRAINT service_packages_provider_fk
        FOREIGN KEY (provider_id) REFERENCES service_providers(provider_id)
        ON DELETE CASCADE ON UPDATE CASCADE`);

    await conn.commit();
    console.log('[migrate] Done');
  } catch (e) {
    await conn.rollback();
    console.error('[migrate] Error:', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error('[migrate] Fatal:', e.message);
  process.exit(1);
});


