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
  console.log('[password-reset] Connected');

  const sql = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_used TINYINT(1) DEFAULT 0,
      UNIQUE KEY unique_token (token),
      INDEX idx_user_id (user_id),
      INDEX idx_token (token),
      INDEX idx_expires_at (expires_at),
      INDEX idx_is_used (is_used),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

  await conn.execute(sql);
  console.log('[password-reset] Table ensured');
  await conn.end();
  console.log('[password-reset] Done');
}

main().catch(err => {
  console.error('[password-reset] Error:', err.message);
  process.exit(1);
});


