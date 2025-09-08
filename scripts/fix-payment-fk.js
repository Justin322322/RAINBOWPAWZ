#!/usr/bin/env node
/*
  Fix payment_transactions.booking_id foreign key to reference bookings(id)
  - Uses MYSQL* env vars or MYSQL_PUBLIC_URL / MYSQL_URL
  - Safe: inspects current FK; only changes if needed
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
    multipleStatements: true,
  };
}

async function q(conn, sql, params) {
  const [rows] = await conn.execute(sql, params || []);
  return rows;
}

async function main() {
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[fix-fk] Connected');

  const schemaRows = await q(conn, 'SELECT DATABASE() AS db');
  const dbName = schemaRows?.[0]?.db;

  // Inspect current FK
  const fkRows = await q(
    conn,
    `SELECT
       rc.CONSTRAINT_NAME,
       kcu.TABLE_NAME,
       kcu.COLUMN_NAME,
       kcu.REFERENCED_TABLE_NAME,
       kcu.REFERENCED_COLUMN_NAME
     FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
     JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      AND rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
     WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME = 'payment_transactions'
       AND kcu.COLUMN_NAME = 'booking_id'`
  );

  const currentFk = fkRows?.[0];
  if (currentFk) {
    console.log('[fix-fk] Current FK:', currentFk);
  } else {
    console.log('[fix-fk] No existing FK found on payment_transactions.booking_id');
  }

  const needsFix = !currentFk || currentFk.REFERENCED_TABLE_NAME !== 'bookings' || currentFk.REFERENCED_COLUMN_NAME !== 'id';

  // Ensure column types are compatible (MEDIUMINT NOT NULL recommended)
  const colRows = await q(
    conn,
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'id'`
  );
  const bookIdType = (colRows?.[0]?.COLUMN_TYPE || 'INT').toUpperCase();
  const nullable = colRows?.[0]?.IS_NULLABLE === 'YES';
  if (!colRows?.length) {
    throw new Error("'bookings.id' column not found");
  }

  // Align child column type
  const childColRows = await q(
    conn,
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'booking_id'`
  );
  if (!childColRows?.length) {
    throw new Error("'payment_transactions.booking_id' column not found");
  }

  // Use the exact referenced type (incl. length/UNSIGNED) for child column
  const desiredType = bookIdType; // e.g., 'INT', 'INT UNSIGNED', 'MEDIUMINT', 'BIGINT UNSIGNED'
  const alterChildType = `ALTER TABLE payment_transactions MODIFY COLUMN booking_id ${desiredType} NOT NULL`;

  await conn.beginTransaction();
  try {
    // Drop old FK first if it exists and is incorrect
    if (currentFk && needsFix) {
      console.log('[fix-fk] Dropping FK:', currentFk.CONSTRAINT_NAME);
      await q(conn, `ALTER TABLE payment_transactions DROP FOREIGN KEY \`${currentFk.CONSTRAINT_NAME}\``);
    }

    // Align types if needed (safe now that FK is dropped)
    if (childColRows[0].COLUMN_TYPE.toUpperCase() !== desiredType) {
      console.log('[fix-fk] Aligning child column type →', desiredType);
      await q(conn, alterChildType);
      // refresh childColRows snapshot
      childColRows[0].COLUMN_TYPE = desiredType;
    }

    // Delete orphan child rows to avoid FK creation failure
    console.log('[fix-fk] Deleting orphan payment_transactions rows...');
    await q(
      conn,
      `DELETE pt FROM payment_transactions pt
         LEFT JOIN bookings b ON b.id = pt.booking_id
       WHERE pt.booking_id IS NOT NULL AND b.id IS NULL`
    );

    // Ensure index exists on booking_id (MySQL may require explicit index)
    try {
      await q(conn, `CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions (booking_id)`);
      console.log('[fix-fk] Created index idx_payment_transactions_booking_id');
    } catch (e) {
      console.log('[fix-fk] Index create skipped/exists:', e.message);
    }

    // Create FK if missing or incorrect
    if (needsFix) {
      console.log('[fix-fk] Creating FK → payment_transactions.booking_id → bookings(id)');
      await q(
        conn,
        `ALTER TABLE payment_transactions
           ADD CONSTRAINT payment_transactions_booking_fk
           FOREIGN KEY (booking_id) REFERENCES bookings(id)
           ON DELETE CASCADE ON UPDATE CASCADE`
      );
    } else {
      console.log('[fix-fk] FK already correct. No changes made.');
    }

    await conn.commit();
    console.log('[fix-fk] Done');
  } catch (e) {
    await conn.rollback();
    console.error('[fix-fk] Error:', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('[fix-fk] Fatal:', e.message);
  process.exit(1);
});


