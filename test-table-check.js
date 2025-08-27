const mysql = require('mysql2/promise');

// Railway database connection
const dbConfig = {
  host: 'gondola.proxy.rlwy.net',
  port: 31323,
  user: 'root',
  password: 'ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
};

async function testTableCheck() {
  try {
    console.log('🔄 Testing table check logic...');
    const connection = await mysql.createConnection(dbConfig);
    
    // This is the exact query from your approve endpoint
    const [tableCheckResult] = await connection.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name IN ('business_profiles', 'service_providers')
    `);
    
    console.log('📋 Table check result:', tableCheckResult);
    
    // Determine which table to use (same logic as your code)
    const tableNames = tableCheckResult.map(row => row.TABLE_NAME || row.table_name);
    console.log('📝 Table names found:', tableNames);
    
    const useServiceProvidersTable = tableNames.includes('service_providers');
    const useBusinessProfilesTable = tableNames.includes('business_profiles');
    
    console.log('✅ service_providers table exists:', useServiceProvidersTable);
    console.log('✅ business_profiles table exists:', useBusinessProfilesTable);
    
    if (!useServiceProvidersTable && !useBusinessProfilesTable) {
      console.log('❌ ERROR: Required tables do not exist');
    } else {
      console.log('✅ SUCCESS: Required tables exist');
    }
    
    // Also check what DATABASE() returns
    const [dbResult] = await connection.execute('SELECT DATABASE() as current_db');
    console.log('🗄️  Current database:', dbResult);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
  }
}

testTableCheck().catch(console.error);