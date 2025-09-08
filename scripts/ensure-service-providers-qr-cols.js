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
  console.log('[ensure] Connected');

  const [rows] = await conn.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_providers' ORDER BY ORDINAL_POSITION"
  );
  const cols = new Set(rows.map(r => r.COLUMN_NAME));
  console.log('[ensure] Existing columns:', Array.from(cols).join(', '));

  const alterations = [];
  if (!cols.has('qr_path')) alterations.push('ADD COLUMN qr_path MEDIUMTEXT NULL');
  if (!cols.has('payment_qr_path')) alterations.push('ADD COLUMN payment_qr_path MEDIUMTEXT NULL');

  if (alterations.length > 0) {
    const sql = `ALTER TABLE service_providers ${alterations.join(', ')}`;
    console.log('[ensure] Running:', sql);
    await conn.execute(sql);
    console.log('[ensure] Alter completed');
  } else {
    console.log('[ensure] Nothing to do. Both columns present.');
  }

  await conn.end();
}

main().catch(err => {
  console.error('[ensure] Error:', err.message);
  process.exit(1);
});
