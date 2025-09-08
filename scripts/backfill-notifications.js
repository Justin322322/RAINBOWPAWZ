#!/usr/bin/env node
/*
 Backfill notifications_unified missing fields:
 - provider_id for business users
 - category normalization (e.g., Application Approved → admin)
 - link inference from title/message
 - priority default to 'normal'
 - data JSON for specific actions
*/
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

function inferLink(title, message){
  const text = `${title || ''} ${message || ''}`.toLowerCase();
  if (text.includes('booking')) return '/user/furparent_dashboard/bookings';
  if (text.includes('payment') || text.includes('refund')) return '/user/furparent_dashboard/bookings';
  if (text.includes('profile')) return '/user/profile';
  if (text.includes('appeal')) return '/appeals';
  if (text.includes('business') || text.includes('provider') || text.includes('cremation')) return '/cremation/dashboard';
  if (text.includes('admin') || text.includes('application')) return '/admin/dashboard';
  return null;
}

async function main(){
  const cfg = getCfg();
  const conn = await mysql.createConnection(cfg);
  console.log('[backfill] Connected');

  // 1) Ensure columns exist (portable across MySQL versions)
  async function ensureColumn(table, column, ddl){
    const [rows] = await conn.execute(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    const exists = Array.isArray(rows) && rows[0] && rows[0].c > 0;
    if (!exists){
      console.log(`[backfill] Adding column ${column}...`);
      await conn.execute(ddl);
    }
  }

  try { await ensureColumn('notifications_unified', 'provider_id', "ALTER TABLE notifications_unified ADD COLUMN provider_id INT NULL AFTER user_id"); } catch(e){ console.warn('[backfill] add provider_id failed:', e.message); }
  try { await ensureColumn('notifications_unified', 'priority', "ALTER TABLE notifications_unified ADD COLUMN priority ENUM('low','normal','high') NULL AFTER status"); } catch(e){ console.warn('[backfill] add priority failed:', e.message); }
  try { await ensureColumn('notifications_unified', 'data', "ALTER TABLE notifications_unified ADD COLUMN data JSON NULL AFTER message"); } catch(e){ console.warn('[backfill] add data failed:', e.message); }
  try { await ensureColumn('notifications_unified', 'link', "ALTER TABLE notifications_unified ADD COLUMN link VARCHAR(255) NULL AFTER priority"); } catch(e){ console.warn('[backfill] add link failed:', e.message); }

  // 2) Backfill provider_id for business users where missing
  const [providerRows] = await conn.execute(`
    SELECT n.id, sp.provider_id
    FROM notifications_unified n
    JOIN users u ON u.user_id = n.user_id AND u.role = 'business'
    JOIN service_providers sp ON sp.user_id = u.user_id
    WHERE (n.provider_id IS NULL OR n.provider_id = 0)
  `);
  if (Array.isArray(providerRows) && providerRows.length){
    console.log(`[backfill] provider_id candidates: ${providerRows.length}`);
    for (const row of providerRows){
      try {
        await conn.execute('UPDATE notifications_unified SET provider_id = ? WHERE id = ?', [row.provider_id, row.id]);
      } catch (e) {
        console.warn('[backfill] provider_id update failed for id', row.id, e.message);
      }
    }
  }

  // 3) Normalize category for known titles (Application Approved → admin)
  try {
    const [affected] = await conn.execute(`
      UPDATE notifications_unified
      SET category = 'admin'
      WHERE (category IS NULL OR category != 'admin')
        AND (LOWER(title) LIKE '%application approved%')
    `);
    console.log('[backfill] category admin normalized:', JSON.stringify(affected));
  } catch (e) {
    console.warn('[backfill] category normalize failed:', e.message);
  }

  // 4) Backfill priority default
  try {
    const [affected] = await conn.execute(`
      UPDATE notifications_unified
      SET priority = 'normal'
      WHERE priority IS NULL
    `);
    console.log('[backfill] priority defaulted:', JSON.stringify(affected));
  } catch (e) {
    console.warn('[backfill] priority default failed:', e.message);
  }

  // 5) Backfill link using inference when NULL
  const [linkRows] = await conn.execute(`
    SELECT id, title, message FROM notifications_unified WHERE link IS NULL OR link = ''
  `);
  if (Array.isArray(linkRows) && linkRows.length){
    console.log(`[backfill] link inference candidates: ${linkRows.length}`);
    for (const row of linkRows){
      const link = inferLink(row.title, row.message);
      if (!link) continue;
      try {
        await conn.execute('UPDATE notifications_unified SET link = ? WHERE id = ?', [link, row.id]);
      } catch (e) {
        console.warn('[backfill] link update failed for id', row.id, e.message);
      }
    }
  }

  // 6) Backfill data JSON for application approved
  const [dataRows] = await conn.execute(`
    SELECT n.id, n.provider_id FROM notifications_unified n
    WHERE (n.data IS NULL OR JSON_TYPE(n.data) IS NULL)
      AND (LOWER(n.title) LIKE '%application approved%')
  `);
  if (Array.isArray(dataRows) && dataRows.length){
    console.log(`[backfill] data JSON candidates: ${dataRows.length}`);
    for (const row of dataRows){
      const payload = { action: 'application_approved', providerId: row.provider_id || null };
      try {
        await conn.execute('UPDATE notifications_unified SET data = ? WHERE id = ?', [JSON.stringify(payload), row.id]);
      } catch (e) {
        console.warn('[backfill] data update failed for id', row.id, e.message);
      }
    }
  }

  await conn.end();
  console.log('[backfill] Done');
}

main().catch(err => {
  console.error('[backfill] Error:', err.message);
  process.exit(1);
});


