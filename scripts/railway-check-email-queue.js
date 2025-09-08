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
    multipleStatements: false,
  };
}

async function main(){
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[email-queue] Connected');

  const [rows] = await conn.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_queue'`
  );

  const exists = rows.length > 0;
  console.log(`[email-queue] email_queue exists: ${exists}`);

  if (exists) {
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_queue' ORDER BY ORDINAL_POSITION`
    );
    console.log('[email-queue] Columns:');
    cols.forEach(c => console.log(` - ${c.COLUMN_NAME} ${c.COLUMN_TYPE} NULLABLE=${c.IS_NULLABLE} DEFAULT=${c.COLUMN_DEFAULT}`));
  }

  await conn.end();
  console.log('[email-queue] Done');
}

main().catch(err => {
  console.error('[email-queue] Error:', err.message);
  process.exit(1);
});


