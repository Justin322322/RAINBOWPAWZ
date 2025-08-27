const mysql = require('mysql2/promise');
const fs = require('fs');

async function fullImport() {
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
    
    // First, drop existing tables to start fresh
    console.log('Dropping existing tables...');
    const [existingTables] = await connection.query('SHOW TABLES');
    
    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const table of existingTables) {
      const tableName = Object.values(table)[0];
      try {
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        console.log(`Dropped table: ${tableName}`);
      } catch (error) {
        console.log(`Could not drop ${tableName}: ${error.message}`);
      }
    }
    
    // Read and process the SQL dump
    let sqlContent = fs.readFileSync('rainbow_paws.sql', 'utf8');
    
    // Clean up the SQL content
    sqlContent = sqlContent
      .replace(/SET SQL_MODE.*?;/g, '')
      .replace(/START TRANSACTION;/g, '')
      .replace(/SET time_zone.*?;/g, '')
      .replace(/\/\*!40101.*?\*\/;/g, '')
      .replace(/\/\*!40000.*?\*\/;/g, '')
      .replace(/-- phpMyAdmin.*?\n/g, '')
      .replace(/-- version.*?\n/g, '')
      .replace(/-- https:\/\/www\.phpmyadmin\.net\/.*?\n/g, '')
      .replace(/-- Host:.*?\n/g, '')
      .replace(/-- Generation Time:.*?\n/g, '')
      .replace(/-- Server version:.*?\n/g, '')
      .replace(/-- PHP Version:.*?\n/g, '')
      .replace(/COMMIT;/g, '');
    
    // Split into statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*') &&
        stmt !== ''
      );

    console.log(`Processing ${statements.length} statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    let phase = 'CREATE TABLES';
    
    // Process statements in phases
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (!statement) continue;
      
      // Detect phase changes
      if (statement.toUpperCase().startsWith('CREATE TABLE')) {
        phase = 'CREATE TABLES';
      } else if (statement.toUpperCase().startsWith('INSERT INTO')) {
        if (phase !== 'INSERT DATA') {
          console.log('\nSwitching to INSERT DATA phase...');
          phase = 'INSERT DATA';
        }
      } else if (statement.toUpperCase().startsWith('ALTER TABLE')) {
        if (phase !== 'ALTER TABLES') {
          console.log('\nSwitching to ALTER TABLES phase...');
          phase = 'ALTER TABLES';
        }
      }
      
      try {
        await connection.query(statement);
        successCount++;
        
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE `?(\w+)`?/i)?.[1];
          console.log(`Created table: ${tableName}`);
        }
        
        if (i % 100 === 0) {
          console.log(`[${phase}] Processed ${i + 1}/${statements.length} statements`);
        }
        
      } catch (error) {
        errorCount++;
        
        // Handle specific errors
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          // Skip table exists errors
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log(`Missing table dependency: ${error.message}`);
        } else if (error.code === 'ER_DUP_ENTRY') {
          // Skip duplicate entries
        } else if (error.code === 'WARN_DATA_TRUNCATED') {
          console.log(`Data truncated: ${error.message.substring(0, 100)}...`);
        } else {
          console.log(`Error: ${error.message.substring(0, 100)}...`);
        }
      }
    }
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log(`\nImport completed:`);
    console.log(`- Successful: ${successCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    // Final verification
    const [finalTables] = await connection.query('SHOW TABLES');
    console.log(`\nDatabase now contains ${finalTables.length} tables:`);
    
    for (const table of finalTables) {
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

fullImport();