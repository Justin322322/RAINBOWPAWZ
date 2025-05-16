// Script to add document path columns to the service_providers table
const mysql = require('mysql2/promise');

async function addDocumentColumns() {
  console.log('Starting script to add document columns to service_providers table...');
  let connection;
  
  try {
    console.log('Connecting to database...');
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
    
    if (tables.length === 0) {
      console.error('Error: service_providers table does not exist');
      return;
    }
    
    // Get existing columns
    console.log('Getting existing columns in service_providers table...');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM service_providers
    `);
    
    const existingColumns = columns.map(col => col.Field);
    console.log('Existing columns:', existingColumns);
    
    // Define document columns to add
    const documentColumns = [
      { name: 'business_permit_path', type: 'VARCHAR(255)' },
      { name: 'bir_certificate_path', type: 'VARCHAR(255)' },
      { name: 'government_id_path', type: 'VARCHAR(255)' }
    ];
    
    // Add missing columns
    for (const column of documentColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding column ${column.name} to service_providers table...`);
        try {
          await connection.query(`
            ALTER TABLE service_providers 
            ADD COLUMN ${column.name} ${column.type} DEFAULT NULL
          `);
          console.log(`Column ${column.name} added successfully`);
        } catch (err) {
          console.error(`Error adding column ${column.name}:`, err);
        }
      } else {
        console.log(`Column ${column.name} already exists in service_providers table`);
      }
    }
    
    console.log('Completed adding document columns to service_providers table');
    
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
addDocumentColumns(); 