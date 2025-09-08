#!/usr/bin/env node
const mysql = require('mysql2/promise');

function getCfg(){
  const dsn = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  if (dsn) return dsn;
  return {
    host: process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway',
  };
}

async function columnExists(conn, table, column){
  const [rows] = await conn.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function dropIfExists(conn, table, column){
  if (await columnExists(conn, table, column)){
    await conn.execute(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    console.log(`[drop] Dropped ${table}.${column}`);
  } else {
    console.log(`[drop] Skipped ${table}.${column} (not present)`);
  }
}

(async ()=>{
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[drop] Connected');

  await dropIfExists(conn, 'service_providers', 'social_media');
  await dropIfExists(conn, 'service_providers', 'time_slots_data');
  await dropIfExists(conn, 'service_providers', 'availability_data');

  await conn.end();
  console.log('[drop] Done');
})().catch(e=>{
  console.error('[drop] Error:', e.message);
  process.exit(1);
});
