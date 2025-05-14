import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const providerId = url.searchParams.get('provider');
    const packageId = url.searchParams.get('package');

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    console.log(`[Debug] Fetching provider details for ID: ${providerId}`);

    // Debug information
    const debugInfo = {
      providerId,
      packageId,
      timestamp: new Date().toISOString(),
      databaseChecks: {} as any,
      apiResponse: {} as any
    };

    // Check service_providers table
    try {
      // First check which columns exist
      const spColumnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'service_providers'
      `) as any[];
      
      const spColumnNames = spColumnsResult.map(col => col.COLUMN_NAME);
      debugInfo.databaseChecks.serviceProvidersColumns = spColumnNames;
      
      const hasSPAppStatus = spColumnNames.includes('application_status');
      const hasSPVerStatus = spColumnNames.includes('verification_status');
      const hasStatus = spColumnNames.includes('status');
      
      debugInfo.databaseChecks.serviceProvidersStatusColumns = {
        applicationStatus: hasSPAppStatus,
        verificationStatus: hasSPVerStatus,
        status: hasStatus
      };
      
      // Build WHERE clause based on available columns
      let whereClause = 'id = ?';
      
      // Add status condition
      if (hasSPAppStatus) {
        whereClause += " AND (application_status = 'approved' OR application_status = 'verified')";
      } else if (hasSPVerStatus) {
        whereClause += " AND verification_status = 'verified'";
      }
      
      // Add active status condition if available
      if (hasStatus) {
        whereClause += " AND status = 'active'";
      }
      
      debugInfo.databaseChecks.serviceProvidersWhereClause = whereClause;
      
      // Try to find matching provider
      const providerResult = await query(`
        SELECT
          id,
          name,
          ${hasSPAppStatus ? 'application_status' : hasSPVerStatus ? 'verification_status' : "'unknown' as status"}
        FROM service_providers
        WHERE ${whereClause}
        LIMIT 1
      `, [providerId]) as any[];

      debugInfo.databaseChecks.serviceProvidersResult = providerResult;
      
      // Try to find ALL providers (without status filters)
      const allProvidersResult = await query(`
        SELECT
          id,
          name,
          ${hasSPAppStatus ? 'application_status' : hasSPVerStatus ? 'verification_status' : "'unknown' as status"}
        FROM service_providers
      `) as any[];
      
      debugInfo.databaseChecks.allServiceProviders = allProvidersResult;

      // Check business_profiles table
      const bpColumnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'business_profiles'
      `) as any[];
      
      const bpColumnNames = bpColumnsResult.map(col => col.COLUMN_NAME);
      debugInfo.databaseChecks.businessProfilesColumns = bpColumnNames;
      
      const hasBPAppStatus = bpColumnNames.includes('application_status');
      const hasBPVerStatus = bpColumnNames.includes('verification_status');
      
      debugInfo.databaseChecks.businessProfilesStatusColumns = {
        applicationStatus: hasBPAppStatus,
        verificationStatus: hasBPVerStatus
      };
      
      // Check packages table
      const packageColumnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'service_packages'
      `) as any[];
      
      const packageColumns = packageColumnsResult.map(col => col.COLUMN_NAME.toLowerCase());
      debugInfo.databaseChecks.servicePackagesColumns = packageColumns;
      
      const hasServiceProviderId = packageColumns.includes('service_provider_id');
      const hasProviderId = packageColumns.includes('provider_id');
      const hasBusinessId = packageColumns.includes('business_id');
      
      debugInfo.databaseChecks.servicePackagesIdColumns = {
        serviceProviderId: hasServiceProviderId,
        providerId: hasProviderId,
        businessId: hasBusinessId
      };
      
    } catch (dbError) {
      debugInfo.databaseChecks.error = {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      };
    }

    // Now try to call the actual API endpoints
    try {
      // Call service-providers API
      const providerResponse = await fetch(`${url.origin}/api/service-providers/${providerId}`);
      const providerData = await providerResponse.json();
      
      debugInfo.apiResponse.serviceProviders = {
        status: providerResponse.status,
        statusText: providerResponse.statusText,
        data: providerData
      };
      
      // If package ID is provided, call packages API
      if (packageId) {
        const packageResponse = await fetch(`${url.origin}/api/packages/${packageId}`);
        const packageData = await packageResponse.json();
        
        debugInfo.apiResponse.packages = {
          status: packageResponse.status,
          statusText: packageResponse.statusText,
          data: packageData
        };
      }
    } catch (apiError) {
      debugInfo.apiResponse.error = {
        message: apiError instanceof Error ? apiError.message : 'Unknown error',
        stack: apiError instanceof Error ? apiError.stack : undefined
      };
    }

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug route error:', error);
    return NextResponse.json({ 
      error: 'Debug route error', 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
