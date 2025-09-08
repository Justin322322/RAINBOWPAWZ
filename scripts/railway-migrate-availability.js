#!/usr/bin/env node

/*
  Creates normalized availability tables and optional backfill from service_providers JSON.
  Env precedence: MYSQL_PUBLIC_URL or MYSQL_URL or (MYSQLUSER, MYSQLPASSWORD, MYSQLHOST, MYSQLPORT, MYSQLDATABASE)
*/

const mysql = require('mysql2/promise');

function getConnectionConfig() {
  const dsn = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  if (dsn) return dsn;
  const host = process.env.MYSQLHOST || '127.0.0.1';
  const port = Number(process.env.MYSQLPORT || 3306);
  const user = process.env.MYSQLUSER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || '';
  const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';
  return { host, port, user, password, database };
}

async function main() {
  const cfg = getConnectionConfig();
  const conn = await mysql.createConnection(cfg);
  console.log('[migrate] Connected');

  const createDays = `
    CREATE TABLE IF NOT EXISTS provider_availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider_id INT NOT NULL,
      availability_date DATE NOT NULL,
      is_available TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_provider_date (provider_id, availability_date),
      KEY idx_provider_date (provider_id, availability_date)
    ) ENGINE=InnoDB;
  `;

  const createSlots = `
    CREATE TABLE IF NOT EXISTS availability_time_slots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider_id INT NOT NULL,
      availability_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_provider_date (provider_id, availability_date, start_time)
    ) ENGINE=InnoDB;
  `;

  await conn.execute(createDays);
  await conn.execute(createSlots);
  console.log('[migrate] Tables ensured');

  const doBackfill = (process.env.BACKFILL_JSON || 'true').toLowerCase() === 'true';
  if (doBackfill) {
    console.log('[migrate] Backfilling from JSON columns (if present)...');

    // Backfill days
    const backfillDays = `
      INSERT INTO provider_availability (provider_id, availability_date, is_available)
      SELECT sp.provider_id,
             STR_TO_DATE(JSON_UNQUOTE(jk.k), '%Y-%m-%d'),
             CASE JSON_EXTRACT(sp.availability_data, CONCAT('$.', JSON_UNQUOTE(jk.k)))
               WHEN 'true' THEN 1 WHEN '1' THEN 1 ELSE 0 END
      FROM service_providers sp
      JOIN JSON_TABLE(JSON_KEYS(COALESCE(sp.availability_data, JSON_OBJECT())), '$[*]' COLUMNS (k VARCHAR(64) PATH '$')) jk
      ON TRUE
      ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), updated_at = NOW();
    `;

    // Backfill slots
    const backfillSlots = `
      WITH per_date AS (
        SELECT sp.provider_id,
               JSON_UNQUOTE(jk.k) AS date_key,
               JSON_EXTRACT(sp.time_slots_data, CONCAT('$.', JSON_UNQUOTE(jk.k))) AS slots_array
        FROM service_providers sp
        JOIN JSON_TABLE(JSON_KEYS(COALESCE(sp.time_slots_data, JSON_OBJECT())), '$[*]' COLUMNS (k VARCHAR(64) PATH '$')) jk
      ),
      per_slot AS (
        SELECT pd.provider_id,
               pd.date_key,
               JSON_UNQUOTE(JSON_EXTRACT(s.value, '$.start')) AS start_str,
               JSON_UNQUOTE(JSON_EXTRACT(s.value, '$.end'))   AS end_str
        FROM per_date pd
        JOIN JSON_TABLE(pd.slots_array, '$[*]' COLUMNS (value JSON PATH '$')) s
      )
      INSERT INTO availability_time_slots (provider_id, availability_date, start_time, end_time)
      SELECT provider_id,
             STR_TO_DATE(date_key, '%Y-%m-%d'),
             STR_TO_DATE(start_str, '%H:%i'),
             STR_TO_DATE(end_str,   '%H:%i')
      FROM per_slot
      WHERE start_str IS NOT NULL AND end_str IS NOT NULL;
    `;

    try {
      await conn.execute(backfillDays);
      await conn.execute(backfillSlots);
      console.log('[migrate] Backfill complete');
    } catch (e) {
      console.warn('[migrate] Backfill skipped or failed:', e.message);
    }
  }

  await conn.end();
  console.log('[migrate] Done');
}

main().catch((e) => {
  console.error('[migrate] Error:', e);
  process.exit(1);
});
