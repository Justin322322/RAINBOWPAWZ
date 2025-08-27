import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check if database connection works
    const [testResult] = await query('SELECT 1 as test') as any[];
    
    if (!testResult || testResult.test !== 1) {
      throw new Error('Database connection test failed');
    }

    // Check for required tables
    const [tables] = await query('SHOW TABLES') as any[];
    const tableNames = tables.map((row: any) => Object.values(row)[0]);
    
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
        const [columns] = await query(`DESCRIBE ${table}`) as any[];
        tableStructures[table] = columns.map((col: any) => ({
          field: col.Field,
          type: col.Type,
          null: col.Null,
          key: col.Key
        }));
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