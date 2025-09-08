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

async function q(conn, sql, params){
  const [rows] = await conn.execute(sql, params || []);
  return rows;
}

async function main(){
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[auth_tokens-nullable] Connected');

  // Read current nullability to avoid unnecessary MODIFYs
  const cols = await q(conn,
    `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_tokens'
       AND COLUMN_NAME IN ('token_type','token_value','expires_at')`
  );
  const byName = Object.fromEntries(cols.map(c => [c.COLUMN_NAME, c]));

  const alters = [];
  // token_type: enum should allow NULL
  if (!byName.token_type || byName.token_type.IS_NULLABLE !== 'YES') {
    alters.push("MODIFY COLUMN token_type ENUM('otp_code','reset_token','verification') NULL");
  }
  // token_value: allow NULL
  if (!byName.token_value || byName.token_value.IS_NULLABLE !== 'YES') {
    alters.push('MODIFY COLUMN token_value VARCHAR(255) NULL');
  }
  // expires_at: allow NULL
  if (!byName.expires_at || byName.expires_at.IS_NULLABLE !== 'YES') {
    alters.push('MODIFY COLUMN expires_at TIMESTAMP NULL');
  }

  if (alters.length > 0) {
    const sql = `ALTER TABLE auth_tokens ${alters.join(', ')}`;
    console.log('[auth_tokens-nullable] Running:', sql);
    await conn.execute(sql);
    console.log('[auth_tokens-nullable] Alter completed');
  } else {
    console.log('[auth_tokens-nullable] Nothing to change; columns already nullable');
  }

  await conn.end();
  console.log('[auth_tokens-nullable] Done');
}

main().catch(err => {
  console.error('[auth_tokens-nullable] Error:', err.message);
  process.exit(1);
});


