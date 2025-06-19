import { NextRequest, NextResponse } from 'next/server';
import { testConnection, query } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    // Test basic database connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        details: 'Unable to connect to MySQL server. Please ensure MySQL is running on port 3306.',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test a simple query to ensure database is responsive
    try {
      const result = await query('SELECT 1 as test, NOW() as server_time');
      
      return NextResponse.json({
        status: 'success',
        message: 'Database connection successful',
        data: {
          connected: true,
          test_query: result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (queryError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connected but query failed',
        details: queryError instanceof Error ? queryError.message : 'Unknown query error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Database check error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Database check failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for consistency
export async function POST(request: NextRequest) {
  return GET(request);
}
