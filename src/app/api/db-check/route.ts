import { NextRequest, NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test the database connection
    const connectionResult = await testConnection();
    
    if (!connectionResult) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database connection failed' 
      }, { status: 500 });
    }
    
    // Check which tables exist
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `) as any[];
    
    // Check if bookings table exists
    const bookingsTableExists = tables.some(table => 
      table.table_name === 'bookings' || 
      table.TABLE_NAME === 'bookings'
    );
    
    // Check if service_bookings table exists
    const serviceBookingsTableExists = tables.some(table => 
      table.table_name === 'service_bookings' || 
      table.TABLE_NAME === 'service_bookings'
    );
    
    // If bookings table exists, check its structure
    let bookingsStructure = null;
    if (bookingsTableExists) {
      const columns = await query(`
        DESCRIBE bookings
      `) as any[];
      
      bookingsStructure = columns.map(col => ({
        field: col.Field || col.field,
        type: col.Type || col.type
      }));
    }
    
    // If service_bookings table exists, check its structure
    let serviceBookingsStructure = null;
    if (serviceBookingsTableExists) {
      const columns = await query(`
        DESCRIBE service_bookings
      `) as any[];
      
      serviceBookingsStructure = columns.map(col => ({
        field: col.Field || col.field,
        type: col.Type || col.type
      }));
    }
    
    // Check if there are any bookings in the bookings table
    let bookingsCount = 0;
    if (bookingsTableExists) {
      const countResult = await query(`
        SELECT COUNT(*) as count FROM bookings
      `) as any[];
      
      bookingsCount = countResult[0].count || 0;
    }
    
    // Check if there are any bookings in the service_bookings table
    let serviceBookingsCount = 0;
    if (serviceBookingsTableExists) {
      const countResult = await query(`
        SELECT COUNT(*) as count FROM service_bookings
      `) as any[];
      
      serviceBookingsCount = countResult[0].count || 0;
    }
    
    return NextResponse.json({
      status: 'success',
      connection: true,
      database: {
        tables: tables.map(table => table.table_name || table.TABLE_NAME),
        bookingsTableExists,
        serviceBookingsTableExists,
        bookingsStructure,
        serviceBookingsStructure,
        bookingsCount,
        serviceBookingsCount
      }
    });
  } catch (error) {
    console.error('Database check error:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database check failed',
      error: errorMessage
    }, { status: 500 });
  }
}
