require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateDeliveryFeeColumn() {
  console.log('Starting delivery fee column update...');
  
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbowpaws',
      multipleStatements: true
    });
    
    console.log('Connected to the database');
    
    // Check if delivery_fee_per_km column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_packages'
      AND COLUMN_NAME = 'delivery_fee_per_km'
    `);
    
    if (columns.length === 0) {
      console.log('Adding delivery_fee_per_km column...');
      await connection.query(`
        ALTER TABLE service_packages 
        ADD COLUMN delivery_fee_per_km DECIMAL(10,2) DEFAULT 50.00 AFTER price
      `);
      console.log('Column added successfully');
    } else {
      console.log('delivery_fee_per_km column already exists');
    }
    
    // Update NULL values to the default value
    console.log('Updating NULL delivery fee values to default...');
    const [updateResult] = await connection.query(`
      UPDATE service_packages 
      SET delivery_fee_per_km = 50.00 
      WHERE delivery_fee_per_km IS NULL
    `);
    
    console.log(`Updated ${updateResult.affectedRows} records`);
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
    console.log('Delivery fee column update completed successfully!');
  } catch (error) {
    console.error('Error during column update:', error);
    process.exit(1);
  }
}

updateDeliveryFeeColumn(); 