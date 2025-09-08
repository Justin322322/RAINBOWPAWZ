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

async function q(conn, sql, params){
  const [rows] = await conn.execute(sql, params || []);
  return rows;
}

(async ()=>{
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[inspect] Connected');

  const showCols = async (table) => {
    const rows = await q(conn, `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`, [table]);
    console.log(`\n[inspect] Columns for ${table}:`);
    rows.forEach(r => console.log(` - ${r.COLUMN_NAME} ${r.COLUMN_TYPE}`));
  };

  await showCols('provider_availability');
  await showCols('availability_time_slots');
  await showCols('bookings');

  const pa = await q(conn, `SELECT * FROM provider_availability ORDER BY availability_date DESC LIMIT 10`);
  console.log(`\n[inspect] provider_availability sample:`);
  console.log(pa);

  const ats = await q(conn, `SELECT * FROM availability_time_slots ORDER BY availability_date DESC, start_time LIMIT 10`);
  console.log(`\n[inspect] availability_time_slots sample:`);
  console.log(ats);

  const b = await q(conn, `SELECT id, user_id, provider_id, package_id, booking_date, booking_time, status, total_price FROM bookings ORDER BY id DESC LIMIT 10`);
  console.log(`\n[inspect] bookings sample:`);
  console.log(b);

  await conn.end();
  console.log('\n[inspect] Done');
})().catch(e=>{
  console.error('[inspect] Error:', e.message);
  process.exit(1);
});
