const mysql = require('mysql2/promise');
require('dotenv').config();

function getCfg() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
  if (url) {
    try {
      const u = new URL(url);
      return {
        host: u.hostname,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, ''),
        port: Number(u.port) || 3306,
        ssl: { rejectUnauthorized: false },
      };
    } catch {}
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    port: Number(process.env.DB_PORT || 3306),
    ssl: process.env.DB_HOST && /rlwy\.net/i.test(process.env.DB_HOST) ? { rejectUnauthorized: false } : undefined,
  };
}

async function exists(conn, query, params) {
  const [rows] = await conn.execute(query, params);
  return rows.length > 0;
}

async function main() {
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  try {
    const checks = {};
    checks['package_inclusions.image_path'] = await exists(
      conn,
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='package_inclusions' AND COLUMN_NAME='image_path' LIMIT 1`,
      []
    );
    checks['package_inclusions.image_data'] = await exists(
      conn,
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='package_inclusions' AND COLUMN_NAME='image_data' LIMIT 1`,
      []
    );
    checks['package_addons.image_path'] = await exists(
      conn,
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='package_addons' AND COLUMN_NAME='image_path' LIMIT 1`,
      []
    );
    checks['package_addons.image_data'] = await exists(
      conn,
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='package_addons' AND COLUMN_NAME='image_data' LIMIT 1`,
      []
    );
    const [imgTable] = await conn.execute(
      `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='package_images' LIMIT 1`
    );
    checks['package_images.table'] = imgTable.length > 0;
    if (checks['package_images.table']) {
      checks['package_images.display_order'] = await exists(
        conn,
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='package_images' AND COLUMN_NAME='display_order' LIMIT 1`
      );
      checks['package_images.image_data'] = await exists(
        conn,
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='package_images' AND COLUMN_NAME='image_data' LIMIT 1`
      );
    }
    console.log(JSON.stringify(checks, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => { console.error('Check failed:', err?.message || err); process.exit(1); });


