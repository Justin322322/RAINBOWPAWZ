const mysql = require('mysql2/promise');

// Test database connection with the same config as the app
async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Use the same configuration as the app
    const connection = await mysql.createConnection({
      host: 'gondola.proxy.rlwy.net',
      port: 31323,
      user: 'root',
      password: 'ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ',
      database: 'railway',
      ssl: { rejectUnauthorized: false },
      connectTimeout: 10000,
    });
    
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', rows);
    
    // Test the packages table
    const [packages] = await connection.execute('SELECT COUNT(*) as count FROM service_packages');
    console.log('✅ Packages table accessible:', packages);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('🎉 Database connection test passed!');
  } else {
    console.log('💥 Database connection test failed!');
  }
  process.exit(success ? 0 : 1);
});
