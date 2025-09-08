#!/usr/bin/env node
// Inspect notifications_unified for a given user and show unread counts
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
  };
}

async function q(conn, sql, params) {
  const [rows] = await conn.execute(sql, params || []);
  return rows;
}

async function main() {
  const userId = Number(process.argv[2] || '54');
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[inspect] Connected');

  const rows = await q(conn, `
    SELECT id, user_id, type, category, title, status, read_at, created_at
    FROM notifications_unified
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `, [userId]);

  console.log(`[inspect] notifications_unified for user ${userId}:`, rows.length);
  const unread = rows.filter(r => String(r.status).toLowerCase() !== 'read' && !r.read_at);
  console.log('[inspect] unread (derived):', unread.length);

  const countRow = await q(conn, `
    SELECT 
      SUM(CASE WHEN status != 'read' OR read_at IS NULL THEN 1 ELSE 0 END) AS unread,
      COUNT(*) AS total
    FROM notifications_unified
    WHERE user_id = ?
  `, [userId]);
  console.log('[inspect] counts:', countRow[0]);

  await conn.end();
}

main().catch(e => {
  console.error('[inspect] Fatal:', e.message);
  process.exit(1);
});


