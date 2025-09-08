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

async function main(){
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[create-email-queue] Connected');

  const sql = `
    CREATE TABLE IF NOT EXISTS email_queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      to_email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      html TEXT NOT NULL,
      text TEXT,
      from_email VARCHAR(255),
      cc VARCHAR(255),
      bcc VARCHAR(255),
      attachments TEXT,
      status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      error TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      sent_at TIMESTAMP NULL,
      INDEX (status, attempts, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

  await conn.execute(sql);
  console.log('[create-email-queue] Table ensured');

  await conn.end();
  console.log('[create-email-queue] Done');
}

main().catch(err => {
  console.error('[create-email-queue] Error:', err.message);
  process.exit(1);
});


