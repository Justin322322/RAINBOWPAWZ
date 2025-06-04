import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { decodeTokenUnsafe } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    let isAuthenticated = false;

    const authToken = getAuthTokenFromRequest(request);

    if (authToken) {
      // If we have a token, validate it
      let accountType: string | null = null;

      // Check if it's a JWT token or old format
      if (authToken.includes('.')) {
        // JWT token format
        const payload = decodeTokenUnsafe(authToken);
        accountType = payload?.accountType || null;
      } else {
        // Old format fallback
        const parts = authToken.split('_');
        accountType = parts.length === 2 ? parts[1] : null;
      }

      isAuthenticated = accountType === 'admin';
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
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

    // Build the SQL query based on available columns
    let sql = `SELECT * FROM service_packages WHERE ${providerIdColumn} = ?`;

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
