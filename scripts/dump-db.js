const path = require('path');
const fs = require('fs');
const mysqldump = require('mysqldump');

(async () => {
  try {
    const outDir = path.join(process.cwd(), 'db_backups');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outfile = path.join(outDir, `railway_dump_${Date.now()}.sql`);

    await mysqldump({
      connection: {
        host: 'gondola.proxy.rlwy.net',
        port: 31323,
        user: 'root',
        password: 'ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ',
        database: 'railway',
      },
      dumpToFile: outfile,
      dump: {
        schema: {
          addDropTable: true,
        },
        data: {
          lockTables: false,
        },
        trigger: true,
        procedure: true,
        function: true,
        events: true,
      },
    });

    console.log(`Dump saved to: ${outfile}`);
  } catch (err) {
    console.error('Dump error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
