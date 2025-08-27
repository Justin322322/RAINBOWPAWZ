const mysql = require('mysql2/promise');
const fs = require('fs');

async function importDatabase() {
  const connection = await mysql.createConnection({
    host: 'gondola.proxy.rlwy.net',
    port: 31323,
    user: 'root',
    password: 'ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ',
    database: 'railway',
    multipleStatements: true
  });

  try {
    console.log('Connected to Railway MySQL database');
    
    // Read the SQL dump file
    let sqlDump = fs.readFileSync('rainbow_paws.sql', 'utf8');
    
    console.log('Processing SQL dump...');
    
    // Remove MySQL-specific commands that aren't supported
    sqlDump = sqlDump
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
      .replace(/-- PHP Version:.*?\n/g, '');
    
    // Execute the entire dump as one statement
    console.log('Importing database...');
    await connection.query(sqlDump);
    
    console.log('Database import completed successfully!');
    
    // Verify import by checking tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\nImported ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    
  } catch (error) {
    console.error('Error importing database:', error);
    
    // If bulk import fails, try statement by statement
    console.log('\nTrying statement-by-statement import...');
    try {
      let sqlDump = fs.readFileSync('rainbow_paws.sql', 'utf8');
      
      // Clean up the SQL dump
      sqlDump = sqlDump
        .replace(/SET SQL_MODE.*?;/g, '')
        .replace(/START TRANSACTION;/g, '')
        .replace(/SET time_zone.*?;/g, '')
        .replace(/\/\*!40101.*?\*\/;/g, '')
        .replace(/\/\*!40000.*?\*\/;/g, '');
      
      const statements = sqlDump
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
      
      console.log(`Processing ${statements.length} statements...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement && statement.trim() !== '') {
          try {
            await connection.query(statement);
            successCount++;
            if (i % 100 === 0) {
              console.log(`Processed ${i + 1}/${statements.length} statements`);
            }
          } catch (error) {
            errorCount++;
            if (error.message.includes("doesn't exist") || error.message.includes("already exists")) {
              // These are expected errors, continue
            } else {
              console.warn(`Warning: Statement ${i + 1} failed: ${error.message.substring(0, 100)}...`);
            }
          }
        }
      }
      
      console.log(`\nImport completed: ${successCount} successful, ${errorCount} errors`);
      
    } catch (fallbackError) {
      console.error('Fallback import also failed:', fallbackError);
    }
  } finally {
    await connection.end();
  }
}

importDatabase();