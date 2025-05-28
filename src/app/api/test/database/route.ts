import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const results: any = {};

    // Test 1: Check if admin_profiles table exists
    try {
      const adminProfilesCheck = await query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'admin_profiles'
      `) as any[];
      results.admin_profiles_exists = adminProfilesCheck[0].count > 0;
    } catch (error) {
      results.admin_profiles_exists = false;
      results.admin_profiles_error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test 2: Check service_providers table structure
    try {
      const serviceProvidersCheck = await query(`
        SHOW COLUMNS FROM service_providers
      `) as any[];
      results.service_providers_columns = serviceProvidersCheck.map((col: any) => col.Field);
      results.service_providers_has_provider_id = serviceProvidersCheck.some((col: any) => col.Field === 'provider_id');
    } catch (error) {
      results.service_providers_error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test 3: Try a sample query that was failing before
    try {
      const sampleQuery = await query(`
        SELECT provider_id, name, application_status 
        FROM service_providers 
        WHERE provider_type = 'cremation' 
        LIMIT 1
      `) as any[];
      results.sample_query_success = true;
      results.sample_query_result = sampleQuery;
    } catch (error) {
      results.sample_query_success = false;
      results.sample_query_error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test 4: Try admin profile query
    try {
      const adminQuery = await query(`
        SELECT u.user_id, u.email, u.first_name, u.last_name
        FROM users u
        WHERE u.role = 'admin'
        LIMIT 1
      `) as any[];
      results.admin_query_success = true;
      results.admin_query_result = adminQuery;
    } catch (error) {
      results.admin_query_success = false;
      results.admin_query_error = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      success: true,
      message: 'Database tests completed',
      results
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
