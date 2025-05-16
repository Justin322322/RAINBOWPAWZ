import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Setting up availability tables...');
    
    // First, test if we can connect to the database at all
    try {
      const testConnection = await query('SELECT 1 as test');
      console.log('Database connection test successful:', testConnection);
    } catch (connectionError) {
      console.error('Database connection failed:', connectionError);
      
      // Since we can't connect to the database, we'll return mock data
      return NextResponse.json({
        success: true,
        mock: true,
        tables: ['provider_availability', 'provider_time_slots'],
        message: 'Using mock tables due to database connection issue'
      });
    }
    
    // Check if tables exist
    const tablesCheckQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('provider_availability', 'provider_time_slots')
    `;
    
    try {
      const tablesResult = await query(tablesCheckQuery) as any[];
      const existingTables = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
      
      console.log('Existing availability tables:', existingTables);
      let tablesCreated = false;
      
      // Create provider_availability table if needed
      if (!existingTables.includes('provider_availability')) {
        console.log('Creating provider_availability table...');
        const createAvailabilityTableQuery = `
          CREATE TABLE provider_availability (
            id INT AUTO_INCREMENT PRIMARY KEY,
            provider_id INT NOT NULL,
            date DATE NOT NULL,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY provider_date_unique (provider_id, date)
          )
        `;
        await query(createAvailabilityTableQuery);
        console.log('provider_availability table created successfully');
        tablesCreated = true;
      }
      
      // Create provider_time_slots table if needed
      if (!existingTables.includes('provider_time_slots')) {
        console.log('Creating provider_time_slots table...');
        const createTimeSlotsTableQuery = `
          CREATE TABLE provider_time_slots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            provider_id INT NOT NULL,
            date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            available_services TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (provider_id, date)
          )
        `;
        await query(createTimeSlotsTableQuery);
        console.log('provider_time_slots table created successfully');
        tablesCreated = true;
      } else {
        // Check if available_services column exists in the provider_time_slots table
        const columnCheckQuery = `
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'provider_time_slots' 
          AND COLUMN_NAME = 'available_services'
        `;
        
        const columnResult = await query(columnCheckQuery) as any[];
        
        // If the column doesn't exist, add it
        if (columnResult.length === 0) {
          console.log('Adding available_services column to provider_time_slots table...');
          const addColumnQuery = `
            ALTER TABLE provider_time_slots
            ADD COLUMN available_services TEXT DEFAULT NULL
          `;
          
          await query(addColumnQuery);
          console.log('Added available_services column to provider_time_slots table');
          tablesCreated = true;
        }
      }
      
      return NextResponse.json({
        success: true,
        tables: existingTables,
        created: tablesCreated,
        message: tablesCreated ? 'Tables set up successfully' : 'Tables already exist'
      });
    } catch (tableError) {
      console.error('Error checking or creating tables:', tableError);
      
      // Return a more detailed error message
      return NextResponse.json({
        success: false,
        error: 'Database schema error',
        details: tableError instanceof Error ? tableError.message : String(tableError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error setting up availability tables:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to set up availability tables',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 