// Script to directly fix package 45
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  console.log('Starting direct fix for package 45...');
  
  try {
    // Create a connection
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Update package 45 directly
    await connection.query(`
      UPDATE service_packages
      SET name = 'Basic Cremation',
          description = 'Basic cremation service with standard urn',
          price = 2200.00,
          delivery_fee_per_km = 50.00,
          conditions = 'Available for pets up to 20kg'
      WHERE id = 45
    `);
    
    console.log('Updated package 45 price to 2200.00');
    
    // Fix inclusions for package 45
    await connection.query('DELETE FROM package_inclusions WHERE package_id = 45');
    await connection.query(`
      INSERT INTO package_inclusions (package_id, description, created_at) VALUES
      (45, 'Professional handling', NOW()),
      (45, 'Basic urn', NOW()),
      (45, 'Cremation service', NOW())
    `);
    
    // Fix addons for package 45
    await connection.query('DELETE FROM package_addons WHERE package_id = 45');
    await connection.query(`
      INSERT INTO package_addons (package_id, description, price, created_at) VALUES
      (45, 'Upgrade to standard urn', 300.00, NOW()),
      (45, 'Memorial certificate', 150.00, NOW())
    `);
    
    console.log('Package 45 fixed successfully!');
    await connection.end();
    
  } catch (error) {
    console.error('Error updating package 45:', error);
    process.exit(1);
  }
}

main(); 