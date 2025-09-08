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
    multipleStatements: true,
  };
}

async function main(){
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[restrictions] Connected');

  // 1) Create unified table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS restrictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subject_type ENUM('user','provider') NOT NULL,
      subject_id INT NOT NULL,
      reason TEXT,
      restriction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration VARCHAR(50) DEFAULT 'indefinite',
      report_count INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      actor_admin_id INT NULL,
      data JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_subject_active (subject_type, subject_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // 2) Migrate user_restrictions -> restrictions
  try {
    const [rows] = await conn.execute(`SELECT restriction_id, user_id, reason, restriction_date, duration, report_count, is_active FROM user_restrictions`);
    let migrated = 0;
    for (const r of rows){
      await conn.execute(
        `INSERT INTO restrictions (subject_type, subject_id, reason, restriction_date, duration, report_count, is_active)
         VALUES ('user', ?, ?, ?, ?, ?, ?)`,
        [r.user_id, r.reason, r.restriction_date, r.duration, r.report_count, r.is_active]
      );
      migrated++;
    }
    console.log(`[restrictions] Migrated user_restrictions: ${migrated}`);
  } catch (e) {
    console.warn('[restrictions] Skipped user_restrictions migration:', e.message);
  }

  // 3) Migrate provider_restrictions -> restrictions
  try {
    const [rows] = await conn.execute(`SELECT restriction_id, provider_id, user_id, reason, restriction_date, duration, report_count, is_active FROM provider_restrictions`);
    let migrated = 0;
    for (const r of rows){
      await conn.execute(
        `INSERT INTO restrictions (subject_type, subject_id, reason, restriction_date, duration, report_count, is_active, data)
         VALUES ('provider', ?, ?, ?, ?, ?, ?, JSON_OBJECT('user_id', ?))`,
        [r.provider_id, r.reason, r.restriction_date, r.duration, r.report_count, r.is_active, r.user_id]
      );
      migrated++;
    }
    console.log(`[restrictions] Migrated provider_restrictions: ${migrated}`);
  } catch (e) {
    console.warn('[restrictions] Skipped provider_restrictions migration:', e.message);
  }

  await conn.end();
  console.log('[restrictions] Done');
}

main().catch(err => {
  console.error('[restrictions] Error:', err.message);
  process.exit(1);
});


