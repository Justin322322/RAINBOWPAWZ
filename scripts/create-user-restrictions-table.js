#!/usr/bin/env node
const mysql = require('mysql2/promise');

function getCfg(){
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

async function main(){
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[user-restrictions] Connected');

  const sql = `
    CREATE TABLE IF NOT EXISTS user_restrictions (
      restriction_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      reason TEXT,
      restriction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration VARCHAR(50) DEFAULT 'indefinite',
      report_count INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      INDEX idx_user_active (user_id, is_active),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

  await conn.execute(sql);
  console.log('[user-restrictions] Table ensured');
  await conn.end();
  console.log('[user-restrictions] Done');
}

main().catch(err => {
  console.error('[user-restrictions] Error:', err.message);
  process.exit(1);
});


