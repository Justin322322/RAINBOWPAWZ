const mysql = require('mysql2/promise');
const fs = require('fs');

async function cleanImport() {
  const connection = await mysql.createConnection({
    host: 'gondola.proxy.rlwy.net',
    port: 31323,
    user: 'root',
    password: 'ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ',
    database: 'railway',
    multipleStatements: false
  });

  try {
    console.log('Connected to Railway MySQL database');
    
    // Read the SQL dump file
    let sqlContent = fs.readFileSync('rainbow_paws.sql', 'utf8');
    
    // Split into individual statements and clean them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*') &&
        !stmt.includes('SET SQL_MODE') &&
        !stmt.includes('START TRANSACTION') &&
        !stmt.includes('SET time_zone') &&
        stmt !== ''
      );

    console.log(`Found ${statements.length} statements to process`);
    
    let successCount = 0;
    let errorCount = 0;
    let createdTables = [];
    let insertedData = [];
    
    // Process each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (!statement) continue;
      
      try {
        await connection.query(statement);
        successCount++;
        
        // Track what we're creating
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE `?(\w+)`?/i)?.[1];
          if (tableName) createdTables.push(tableName);
        } else if (statement.toUpperCase().startsWith('INSERT INTO')) {
          const tableName = statement.match(/INSERT INTO `?(\w+)`?/i)?.[1];
          if (tableName && !insertedData.includes(tableName)) {
            insertedData.push(tableName);
          }
        }
        
        if (i % 50 === 0) {
          console.log(`Processed ${i + 1}/${statements.length} statements`);
        }
        
      } catch (error) {
        errorCount++;
        
        // Log specific errors for debugging
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`Table already exists: ${error.message.match(/table '(\w+)'/)?.[1] || 'unknown'}`);
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log(`Missing table: ${error.message}`);
        } else if (error.code === 'ER_DUP_ENTRY') {
          console.log(`Duplicate entry: ${error.message.substring(0, 100)}...`);
        } else if (error.code === 'WARN_DATA_TRUNCATED') {
          console.log(`Data truncated: ${error.message.substring(0, 100)}...`);
        } else {
          console.log(`Error in statement ${i + 1}: ${error.message.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`\nImport Summary:`);
    console.log(`- Successful statements: ${successCount}`);
    console.log(`- Failed statements: ${errorCount}`);
    console.log(`- Tables created: ${createdTables.length}`);
    console.log(`- Tables with data: ${insertedData.length}`);
    
    // Verify the final state
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\nFinal database contains ${tables.length} tables:`);
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const count = rows[0].count;
        console.log(`- ${tableName}: ${count} rows`);
      } catch (error) {
        console.log(`- ${tableName}: Error counting rows`);
      }
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await connection.end();
  }
}

cleanImport();