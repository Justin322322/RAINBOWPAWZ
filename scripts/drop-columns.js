const mysql = require('mysql2/promise');

(async () => {
  const config = {
    host: 'gondola.proxy.rlwy.net',
    port: 31323,
    user: 'root',
    password: 'ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ',
    database: 'railway',
    multipleStatements: true,
  };

  const dropColumnIfExists = async (conn, table, column) => {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (Number(rows[0].cnt) > 0) {
      await conn.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
      console.log(`Dropped column ${table}.${column}`);
    } else {
      console.log(`Column ${table}.${column} not present`);
    }
  };

  try {
    const conn = await mysql.createConnection(config);
    await dropColumnIfExists(conn, 'service_packages', 'price_per_kg');
    await dropColumnIfExists(conn, 'service_packages', 'has_size_pricing');
    await conn.end();
    console.log('Drop columns script completed.');
  } catch (err) {
    console.error('Drop columns failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
