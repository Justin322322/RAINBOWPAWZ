import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 403 });
    }

    // Get provider ID from query parameter
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({
        error: 'Missing provider ID',
        success: false
      }, { status: 400 });
    }


    // Check which tables exist
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name IN ('service_packages', 'service_providers')
    `) as any[];

    const tableNames = tablesResult.map((row: any) => row.table_name);

    const hasServicePackages = tableNames.includes('service_packages');
    const hasServiceProviders = tableNames.includes('service_providers');

    if (!hasServicePackages) {
      return NextResponse.json({
        error: 'Service packages table not found',
        success: false
      }, { status: 500 });
    }

    if (!hasServiceProviders) {
      return NextResponse.json({
        error: 'Service providers table not found',
        success: false
      }, { status: 500 });
    }

    // Check table structure for service_packages
    const columnsResult = await query(`
      SHOW COLUMNS FROM service_packages
    `) as any[];

    const columnNames = columnsResult.map((col: any) => col.Field);

    // Check for provider ID column
    const providerIdColumn = columnNames.includes('service_provider_id')
      ? 'service_provider_id'
      : (columnNames.includes('provider_id') ? 'provider_id' : null);

    if (!providerIdColumn) {
      return NextResponse.json({
        error: 'Service provider ID column not found in service_packages table',
        success: false
      }, { status: 500 });
    }

    // Check for is_active column
    const hasIsActive = columnNames.includes('is_active');

    // SECURITY FIX: Build the SQL query based on validated column names
    let sql;
    if (providerIdColumn === 'service_provider_id') {
      sql = 'SELECT * FROM service_packages WHERE service_provider_id = ?';
    } else if (providerIdColumn === 'provider_id') {
      sql = 'SELECT * FROM service_packages WHERE provider_id = ?';
    } else {
      return NextResponse.json({
        error: 'Invalid provider ID column',
        success: false
      }, { status: 500 });
    }

    if (hasIsActive) {
      sql += ' ORDER BY is_active DESC';
    }    // Execute the query
    const services = await query(sql, [providerId]);

    // Transform the response to ensure consistent field names
    const transformedServices = services.map((service: any) => {
      // Ensure package_id is mapped to id for frontend compatibility
      return {
        ...service,
        id: service.package_id
      };
    });

    return NextResponse.json({
      success: true,
      services: transformedServices || []
    });

  } catch (error) {

    return NextResponse.json({
      error: 'Failed to fetch services',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
