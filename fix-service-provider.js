// Script to create a service provider record for user ID 44
const mysql = require('mysql2/promise');

async function createServiceProvider() {
  console.log('Starting service provider fix script...');
  let connection;
  
  try {
    console.log('Attempting to connect to database...');
    // Create connection to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'rainbow_paws'
    });
    
    console.log('Connected to database successfully');
    
    // Check if service_providers table exists
    console.log('Checking if service_providers table exists...');
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'rainbow_paws' 
      AND table_name = 'service_providers'
    `);
    
    console.log(`Table check result: ${JSON.stringify(tables)}`);
    
    if (tables.length === 0) {
      console.error('Error: service_providers table does not exist');
      return;
    }
    
    // Check if a record for user_id 44 already exists
    console.log('Checking if service provider for user ID 44 already exists...');
    const [existingProviders] = await connection.query(
      'SELECT id FROM service_providers WHERE user_id = ?',
      [44]
    );
    
    console.log(`Existing provider check: ${JSON.stringify(existingProviders)}`);
    
    if (existingProviders.length > 0) {
      console.log(`A service provider with ID ${existingProviders[0].id} already exists for user 44`);
      return;
    }
    
    // Get columns in service_providers table
    console.log('Getting columns in service_providers table...');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM service_providers
    `);
    
    console.log('Available columns:');
    columns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));
    
    // Create a new service provider for user ID 44
    console.log('Creating new service provider record...');
    try {
      const [result] = await connection.execute(
        `INSERT INTO service_providers 
         (user_id, name, provider_type, phone, address) 
         VALUES (?, ?, ?, ?, ?)`,
        [44, 'System Admin Cremation Service', 'cremation', '09123456789', 'BPSU, Bataan']
      );
      
      console.log(`Created new service provider with ID ${result.insertId} for user 44`);
    } catch (insertError) {
      console.error('Error during insert:', insertError);
      
      // Try a more minimal insert with just the required fields
      console.log('Trying minimal insert with just user_id and name...');
      const [fallbackResult] = await connection.execute(
        `INSERT INTO service_providers 
         (user_id, name) 
         VALUES (?, ?)`,
        [44, 'System Admin Cremation Service']
      );
      
      console.log(`Created new service provider with ID ${fallbackResult.insertId} using minimal fields`);
    }
    
  } catch (error) {
    console.error('Critical error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
  
  console.log('Script completed');
}

// Run the function
createServiceProvider(); 