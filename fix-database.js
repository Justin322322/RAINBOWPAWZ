// Direct database script to remove pet_id dependency
const mysql = require('mysql2/promise');

async function fixDatabase() {
  console.log('Starting database fix script...');
  
  let connection;
  try {
    // Create connection to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'rainbow_paws'
    });
    
    console.log('Connected to database successfully');
    
    // Log the database structure to understand what we're working with
    console.log('Current database tables:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    
    // First, check if the bookings table exists
    const [bookingsCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
    `);
    
    if (bookingsCheck[0].count === 0) {
      console.log('ERROR: bookings table does not exist in the database');
      return;
    }
    
    console.log('\nChecking bookings table structure:');
    const [columns] = await connection.query('DESCRIBE bookings');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}), Nullable: ${col.Null}, Key: ${col.Key}`);
    });
    
    // Check if the column exists
    const [columnCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'pet_id'
    `);
    
    if (columnCheck[0].count === 0) {
      console.log('\npet_id column does not exist in bookings table, no action needed');
      return;
    }
    
    console.log('\npet_id column exists, checking for constraints...');
    
    // Check for constraints
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'pet_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    // Drop any constraints
    if (constraints.length > 0) {
      for (const constraint of constraints) {
        console.log(`Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
        await connection.query(`
          ALTER TABLE bookings
          DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
        console.log(`Constraint ${constraint.CONSTRAINT_NAME} dropped successfully`);
      }
    } else {
      console.log('No constraints found on pet_id column');
    }
    
    // Now try to alter the table to make pet_id nullable
    try {
      console.log('\nMaking pet_id column nullable...');
      await connection.query(`
        ALTER TABLE bookings
        MODIFY COLUMN pet_id INT NULL
      `);
      console.log('Successfully made pet_id column nullable');
    } catch (nullableError) {
      console.error('Error making column nullable:', nullableError);
    }
    
    // Then try to drop the column
    try {
      console.log('\nAttempting to drop pet_id column...');
      await connection.query('ALTER TABLE bookings DROP COLUMN pet_id');
      console.log('Successfully dropped pet_id column');
      
      // Verify the change
      console.log('\nVerifying bookings table structure after changes:');
      const [newColumns] = await connection.query('DESCRIBE bookings');
      newColumns.forEach(col => {
        console.log(`- ${col.Field} (${col.Type}), Nullable: ${col.Null}, Key: ${col.Key}`);
      });
      
      // Check if pet_id is gone
      const [verifyPetId] = await connection.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
        AND COLUMN_NAME = 'pet_id'
      `);
      
      if (verifyPetId[0].count === 0) {
        console.log('\nVERIFIED: pet_id column has been successfully removed from bookings table');
      } else {
        console.log('\nWARNING: pet_id column still exists in bookings table');
      }
    } catch (dropError) {
      console.error('\nCould not drop pet_id column:', dropError);
      console.log('The column is now at least nullable, which should allow your application to work');
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

// Run the script and make sure it completes
(async () => {
  try {
    console.log('Script started');
    await fixDatabase();
    console.log('Script completed successfully');
  } catch (err) {
    console.error('Script failed:', err);
  }
})(); 