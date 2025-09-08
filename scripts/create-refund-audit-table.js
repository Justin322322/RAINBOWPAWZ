#!/usr/bin/env node
/*
  Creates refund_audit_logs table in the connected Railway MySQL database.
  Usage: railway run -- node scripts/create-refund-audit-table.js
*/
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

(async () => {
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[audit-migrate] Connected');

  // Ensure refunds table exists first (required by FK). We won't create it here; just check.
  const refundsExists = await q(
    conn,
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'refunds'`
  );
  if (!refundsExists || !refundsExists[0] || refundsExists[0].count === 0) {
    console.error('[audit-migrate] refunds table is missing. Create refunds table first.');
    process.exit(1);
  }

  const auditExists = await q(
    conn,
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'refund_audit_logs'`
  );

  if (auditExists[0].count > 0) {
    console.log('[audit-migrate] refund_audit_logs already exists. Nothing to do.');
    await conn.end();
    process.exit(0);
  }

  console.log('[audit-migrate] Creating refund_audit_logs...');
  await q(
    conn,
    `CREATE TABLE refund_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      refund_id INT NOT NULL,
      action VARCHAR(100) NOT NULL,
      previous_status VARCHAR(50) NULL,
      new_status VARCHAR(50) NOT NULL,
      performed_by INT NULL,
      performed_by_type ENUM('system','admin','staff') NOT NULL,
      details TEXT NULL,
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_refund_id (refund_id),
      INDEX idx_action (action),
      INDEX idx_performed_by (performed_by),
      INDEX idx_performed_by_type (performed_by_type),
      INDEX idx_created_at (created_at),
      CONSTRAINT fk_refund_audit_refund FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  console.log('[audit-migrate] refund_audit_logs created.');
  await conn.end();
  console.log('[audit-migrate] Done');
})().catch((e) => {
  console.error('[audit-migrate] Error:', e.message);
  process.exit(1);
});


