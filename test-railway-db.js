const mysql = require('mysql2/promise');
const fs = require('fs');

// Railway database connection
const dbConfig = {
  host: 'gondola.proxy.rlwy.net',
  port: 31323,
  user: 'root',
  password: 'ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
};

async function testConnection() {
  try {
    console.log('🔄 Testing Railway database connection...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Test basic connection
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database connection successful:', rows);
    
    // Check existing tables
    console.log('\n🔍 Checking existing tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Existing tables:', tables);
    
    // Check if key tables exist
    const requiredTables = ['users', 'service_providers', 'service_bookings', 'service_packages'];
    const existingTableNames = tables.map(row => Object.values(row)[0]);
    
    console.log('\n🔍 Required tables check:');
    for (const table of requiredTables) {
      const exists = existingTableNames.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    await connection.end();
    return existingTableNames.length > 0;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function importSQLDump() {
  try {
    console.log('\n🔄 Reading SQL dump file...');
    const sqlContent = fs.readFileSync('rainbow_paws.sql', 'utf8');
    
    console.log('🔄 Connecting to Railway database...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip certain statements that might cause issues
      if (statement.includes('SET SQL_MODE') || 
          statement.includes('START TRANSACTION') ||
          statement.includes('SET time_zone') ||
          statement.includes('SET @OLD_') ||
          statement.includes('SET NAMES') ||
          statement.includes('COMMIT')) {
        continue;
      }
      
      try {
        await connection.execute(statement);
        successCount++;
        
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE `?(\w+)`?/i)?.[1];
          console.log(`✅ Created table: ${tableName}`);
        }
      } catch (error) {
        errorCount++;
        console.log(`⚠️  Statement ${i + 1} failed: ${error.message.substring(0, 100)}...`);
        
        // Continue with other statements even if one fails
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables after import...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables now in database:', tables.map(row => Object.values(row)[0]));
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ SQL import failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Railway Database Setup Tool\n');
  
  // Test connection first
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    return;
  }
  
  // Import SQL dump
  console.log('\n🔄 Starting SQL import...');
  const imported = await importSQLDump();
  
  if (imported) {
    console.log('\n✅ Database setup completed successfully!');
    console.log('🎉 You can now test your Railway application');
  } else {
    console.log('\n❌ Database setup failed');
  }
}

main().catch(console.error);