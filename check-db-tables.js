require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const tableDefinitions = {
  pets: `
    CREATE TABLE pets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      species VARCHAR(100) NOT NULL,
      breed VARCHAR(255),
      gender VARCHAR(50),
      age VARCHAR(50),
      weight DECIMAL(8,2),
      photo_path VARCHAR(255),
      special_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  // Add more table definitions here as needed
};

async function main() {
  // Database connection configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    port: 3306,
  };

  console.log('Connecting to database...');
  console.log(`Host: ${dbConfig.host}, Database: ${dbConfig.database}`);

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Successfully connected to database');

    // Check and create each table
    for (const [tableName, tableDefinition] of Object.entries(tableDefinitions)) {
      console.log(`Checking if ${tableName} table exists...`);
      
      const [tableExists] = await connection.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = ? AND table_name = ?
      `, [dbConfig.database, tableName]);
      
      if (tableExists[0].count === 0) {
        console.log(`Table ${tableName} does not exist. Creating...`);
        await connection.query(tableDefinition);
        console.log(`Table ${tableName} created successfully`);
      } else {
        console.log(`Table ${tableName} already exists`);
      }
    }

    console.log('Database check completed successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

main(); 