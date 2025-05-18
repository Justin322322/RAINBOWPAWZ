import { NextRequest, NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';

/**
 * API endpoint to check database connectivity
 * This endpoint performs a series of checks to verify database connection and schema
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Test basic connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        message: 'Could not connect to the database',
        details: {
          connection: false,
          tables: null,
          error: 'Connection failed'
        }
      }, { status: 500 });
    }
    
    // Step 2: Check if we can execute a simple query
    try {
      const pingResult = await query('SELECT 1 as connected');
      
      if (!pingResult || !Array.isArray(pingResult) || pingResult.length === 0 || pingResult[0].connected !== 1) {
        return NextResponse.json({
          status: 'error',
          message: 'Database connection test failed',
          details: {
            connection: true,
            query: false,
            tables: null
          }
        }, { status: 500 });
      }
    } catch (queryError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database query failed',
        details: {
          connection: true,
          query: false,
          error: queryError instanceof Error ? queryError.message : 'Unknown query error'
        }
      }, { status: 500 });
    }
    
    // Step 3: Check for required tables
    try {
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name IN ('users', 'pets', 'bookings', 'service_providers', 'service_packages')
      `) as any[];
      
      const foundTables = tablesResult.map((row: any) => 
        row.table_name || row.TABLE_NAME
      ).filter(Boolean);
      
      const requiredTables = ['users', 'pets', 'bookings'];
      const missingTables = requiredTables.filter(table => 
        !foundTables.some(found => found.toLowerCase() === table.toLowerCase())
      );
      
      if (missingTables.length > 0) {
        return NextResponse.json({
          status: 'warning',
          message: `Missing required tables: ${missingTables.join(', ')}`,
          details: {
            connection: true,
            query: true,
            tables: {
              found: foundTables,
              missing: missingTables
            }
          }
        }, { status: 200 });
      }
      
      // All checks passed
      return NextResponse.json({
        status: 'success',
        message: 'Database connection successful',
        details: {
          connection: true,
          query: true,
          tables: {
            found: foundTables,
            missing: []
          }
        }
      });
      
    } catch (tablesError) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to check database tables',
        details: {
          connection: true,
          query: true,
          tables: null,
          error: tablesError instanceof Error ? tablesError.message : 'Unknown tables error'
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Database check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}
