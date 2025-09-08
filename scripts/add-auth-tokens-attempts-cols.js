#!/usr/bin/env node
const mysql = require('mysql2/promise');

function getCfg() {
  const dsn = process.env.MYSQL_PUBLIC_URL || process.env.RAILWAY_DATABASE_URL || process.env.MYSQL_URL;
  if (dsn) return dsn;
  return {
    host: process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway',
  };
}

async function main() {
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[auth_tokens-alter] Connected');

  // Detect existing columns and indexes
  const [colRows] = await conn.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_tokens' ORDER BY ORDINAL_POSITION"
  );
  const existingCols = new Set(colRows.map(r => r.COLUMN_NAME));

  const [idxRows] = await conn.execute(
    "SHOW INDEX FROM auth_tokens"
  );
  const existingIndexes = new Set(idxRows.map(r => r.Key_name));

  const alters = [];

  // Columns expected by code: attempt_type, attempt_time, ip_address
  if (!existingCols.has('attempt_type')) {
    alters.push("ADD COLUMN attempt_type ENUM('verify','generate') NULL AFTER user_id");
  }
  if (!existingCols.has('attempt_time')) {
    alters.push("ADD COLUMN attempt_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at");
  }
  if (!existingCols.has('ip_address')) {
    alters.push("ADD COLUMN ip_address VARCHAR(45) NULL AFTER attempt_type");
  }

  if (alters.length > 0) {
    const sql = `ALTER TABLE auth_tokens ${alters.join(', ')}`;
    console.log('[auth_tokens-alter] Running:', sql);
    await conn.execute(sql);
    console.log('[auth_tokens-alter] Columns ensured');
  } else {
    console.log('[auth_tokens-alter] All required columns already present');
  }

  // Ensure helpful indexes for rate limiting queries
  // Composite index (user_id, attempt_type, attempt_time)
  if (!existingIndexes.has('idx_user_attempt_time')) {
    const idxSql = "CREATE INDEX idx_user_attempt_time ON auth_tokens (user_id, attempt_type, attempt_time)";
    console.log('[auth_tokens-alter] Creating index:', idxSql);
    await conn.execute(idxSql);
  } else {
    console.log('[auth_tokens-alter] Index idx_user_attempt_time already exists');
  }

  await conn.end();
  console.log('[auth_tokens-alter] Done');
}

main().catch(err => {
  console.error('[auth_tokens-alter] Error:', err.message);
  process.exit(1);
});


