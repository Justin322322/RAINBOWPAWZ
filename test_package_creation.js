// Test script to verify package creation fixes
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testPackageCreation() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws'
    });

    console.log('Connected to database');

    // Check if package_addons table exists
    const [tableExists] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'package_addons'
    `);

    console.log('package_addons table exists:', tableExists[0].count > 0);

    if (tableExists[0].count === 0) {
      console.log('Creating package_addons table...');
      
      // Create the table
      await connection.execute(`
        CREATE TABLE package_addons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          addon_id INT,
          package_id INT NOT NULL,
          description TEXT NOT NULL,
          price DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_package_id (package_id),
          INDEX idx_addon_id (addon_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      
      console.log('package_addons table created successfully');
    } else {
      // Check if id column exists
      const [idColumnExists] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'package_addons'
        AND column_name = 'id'
      `);

      console.log('id column exists:', idColumnExists[0].count > 0);

      if (idColumnExists[0].count === 0) {
        console.log('Adding id column to package_addons table...');
        
        await connection.execute(`
          ALTER TABLE package_addons 
          ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST
        `);
        
        console.log('id column added successfully');
      }
    }

    // Test the MAX(id) query that was failing
    try {
      const [maxResult] = await connection.execute('SELECT MAX(id) AS maxId FROM package_addons');
      console.log('MAX(id) query successful:', maxResult[0]);
    } catch (error) {
      console.error('MAX(id) query failed:', error.message);
    }

    console.log('Package creation database structure is ready!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testPackageCreation();
