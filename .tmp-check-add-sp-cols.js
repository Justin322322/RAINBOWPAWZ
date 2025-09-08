const mysql=require('mysql2/promise');
(async()=>{
  const cfg=process.env.MYSQL_PUBLIC_URL||{host:process.env.MYSQLHOST,port:process.env.MYSQLPORT,user:process.env.MYSQLUSER,password:process.env.MYSQLPASSWORD,database:process.env.MYSQLDATABASE};
  const conn=await mysql.createConnection(cfg);
  const [cols]=await conn.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_providers'");
  const names=new Set(cols.map(r=>r.COLUMN_NAME));
  console.log('[columns]', Array.from(names).join(', '));
  const missing=[];
  if(!names.has('qr_path')) missing.push("ADD COLUMN qr_path MEDIUMTEXT NULL");
  if(!names.has('payment_qr_path')) missing.push("ADD COLUMN payment_qr_path MEDIUMTEXT NULL");
  if(missing.length){
    const sql=ALTER TABLE service_providers ;
    console.log('[alter]', sql);
    await conn.execute(sql);
    console.log('[alter] done');
  } else {
    console.log('[ok] both columns present');
  }
  await conn.end();
})().catch(e=>{console.error('[error]', e.message); process.exit(1);});
