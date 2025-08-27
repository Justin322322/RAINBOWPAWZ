import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check if database connection works
    const testResult = await query('SELECT 1 as test') as any[];
    
    if (!testResult || testResult.length === 0 || testResult[0].test !== 1) {
      throw new Error('Database connection test failed');
    }

    // Check for required tables - handle different result structures
    let tableNames: string[] = [];
    try {
      const tablesResult = await query('SHOW TABLES') as any[];
      
      // Handle different result structures from SHOW TABLES
      if (tablesResult && tablesResult.length > 0) {
        // MySQL/MariaDB returns array of objects with table names as keys
        tableNames = tablesResult.map((row: any) => {
          // Get the first (and only) value from the row object
          const values = Object.values(row);
          return values[0] as string;
        }).filter(Boolean); // Remove any undefined/null values
      }
    } catch (tableError) {
      console.error('Error fetching tables:', tableError);
      throw new Error(`Failed to fetch table list: ${tableError instanceof Error ? tableError.message : 'Unknown error'}`);
    }
    
    const requiredTables = [
      'users',
      'service_providers', 
      'service_bookings',
      'service_packages',
      'pets',
      'admin_profiles',
      'notifications',
      'payment_transactions'
    ];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    const existingTables = requiredTables.filter(table => tableNames.includes(table));
    
    // Check table structures for key tables
    const tableStructures: any = {};
    
    for (const table of ['users', 'service_providers']) {
      try {
        const columnsResult = await query(`DESCRIBE ${table}`) as any[];
        if (columnsResult && columnsResult.length > 0) {
          tableStructures[table] = columnsResult.map((col: any) => ({
            field: col.Field,
            type: col.Type,
            null: col.Null,
            key: col.Key
          }));
        } else {
          tableStructures[table] = 'No columns found';
        }
      } catch (error) {
        tableStructures[table] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        totalTables: tableNames.length,
        allTables: tableNames
      },
      schema: {
        requiredTables: requiredTables.length,
        existingTables: existingTables.length,
        missingTables: missingTables.length,
        existing: existingTables,
        missing: missingTables
      },
      structures: tableStructures,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set'
      }
    });
    
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set'
      }
    }, { status: 500 });
  }
}