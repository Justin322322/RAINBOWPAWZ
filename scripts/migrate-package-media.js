/*
  Adds image columns to package_inclusions and package_addons,
  and ensures package_images table exists. Safe to run multiple times.
*/
const mysql = require('mysql2/promise');
require('dotenv').config();

function parseDatabaseConfigFromEnv() {
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
    } catch {
      // fallthrough to legacy env vars
    }
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

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function main() {
  const cfg = parseDatabaseConfigFromEnv();
  console.log('Connecting to DB...', { host: cfg.host, db: cfg.database, port: cfg.port });
  const conn = await mysql.createConnection(cfg);
  try {
    // package_inclusions
    if (!(await columnExists(conn, 'package_inclusions', 'image_path'))) {
      console.log('Adding package_inclusions.image_path');
      await conn.execute(`ALTER TABLE package_inclusions ADD COLUMN image_path VARCHAR(255) NULL`);
    }
    if (!(await columnExists(conn, 'package_inclusions', 'image_data'))) {
      console.log('Adding package_inclusions.image_data');
      await conn.execute(`ALTER TABLE package_inclusions ADD COLUMN image_data MEDIUMTEXT NULL`);
    }

    // package_addons
    if (!(await columnExists(conn, 'package_addons', 'image_path'))) {
      console.log('Adding package_addons.image_path');
      await conn.execute(`ALTER TABLE package_addons ADD COLUMN image_path VARCHAR(255) NULL`);
    }
    if (!(await columnExists(conn, 'package_addons', 'image_data'))) {
      console.log('Adding package_addons.image_data');
      await conn.execute(`ALTER TABLE package_addons ADD COLUMN image_data MEDIUMTEXT NULL`);
    }

    // package_images table
    if (!(await tableExists(conn, 'package_images'))) {
      console.log('Creating package_images table');
      await conn.execute(`
        CREATE TABLE package_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          package_id INT NOT NULL,
          image_path VARCHAR(255) NULL,
          image_data MEDIUMTEXT NULL,
          display_order INT NOT NULL DEFAULT 1,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } else {
      if (!(await columnExists(conn, 'package_images', 'display_order'))) {
        console.log('Adding package_images.display_order');
        await conn.execute(`ALTER TABLE package_images ADD COLUMN display_order INT NOT NULL DEFAULT 1`);
      }
      if (!(await columnExists(conn, 'package_images', 'image_data'))) {
        console.log('Adding package_images.image_data');
        await conn.execute(`ALTER TABLE package_images ADD COLUMN image_data MEDIUMTEXT NULL`);
      }
    }

    console.log('Migration completed successfully.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err && err.message ? err.message : err);
  process.exit(1);
});


