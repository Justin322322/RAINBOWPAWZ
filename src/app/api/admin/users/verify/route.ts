import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [_adminUserId, accountType] = authToken.split('_');

    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { userId, userType, action, notes, businessId } = body;


    if (!userId || !userType || !action) {
      return NextResponse.json({
        error: 'Missing required parameters',
        success: false
      }, { status: 400 });
    }

    if (action !== 'verify') {
      return NextResponse.json({
        error: 'Invalid action',
        success: false
      }, { status: 400 });
    }

    try {
      // Verify user based on user type
      if (userType === 'pet_parent') {

        // First check if the user exists
        const userExists = await query('SELECT user_id FROM users WHERE user_id = ?', [userId]) as any[];
        if (!userExists || userExists.length === 0) {
          return NextResponse.json({
            error: `User with ID ${userId} not found`,
            success: false
          }, { status: 404 });
        }

        // Update user verification status
        await query(`
          UPDATE users
          SET is_verified = 1, status = 'active', updated_at = NOW()
          WHERE user_id = ?
        `, [userId]);

      } else if (userType === 'cremation_center') {
        // For cremation centers, we need the businessId
        if (!businessId) {
          return NextResponse.json({
            error: 'Business ID is required for cremation centers',
            success: false
          }, { status: 400 });
        }


        // First check if the business profile exists
        // Use a more robust query that checks the table structure first

        try {
          // Check which table exists: business_profiles or service_providers
          const tableCheckResult = await query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name IN ('business_profiles', 'service_providers')
          `) as any[];

          // Determine which table to use
          const tableNames = tableCheckResult.map(row => row.table_name);

          const useServiceProvidersTable = tableNames.includes('service_providers');
          const useBusinessProfilesTable = tableNames.includes('business_profiles');

          if (!useServiceProvidersTable && !useBusinessProfilesTable) {
            return NextResponse.json({
              error: 'Database schema error: Required tables do not exist',
              success: false
            }, { status: 500 });
          }

          // Use the appropriate table name
          const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';

          // Check if the business exists
          const idColumn = tableName === 'service_providers' ? 'provider_id' : 'id';
          const businessExists = await query(`SELECT ${idColumn}, verification_status, application_status, user_id FROM ${tableName} WHERE ${idColumn} = ?`, [businessId]) as any[];
          if (!businessExists || businessExists.length === 0) {
            return NextResponse.json({
              error: `Business profile with ID ${businessId} not found in ${tableName} table`,
              success: false
            }, { status: 404 });
          }

          // Get current status and user ID
          const currentStatus = businessExists[0]?.application_status || businessExists[0]?.verification_status;
          const businessUserId = businessExists[0]?.user_id;


          // Only update verification_status if it's not restricted
          let updatedStatus = 'approved';
          if (currentStatus === 'restricted') {
            updatedStatus = 'restricted';
          }

          // Check if the table has application_status column
          const columnsResult = await query(`
            SHOW COLUMNS FROM ${tableName} LIKE 'application_status'
          `) as any[];

          const hasApplicationStatus = columnsResult.length > 0;

          // Update the business profile
          if (hasApplicationStatus) {
            // Use application_status as the primary status field
            await query(`
              UPDATE ${tableName}
              SET application_status = ?,
                  verification_status = ?, -- Keep for backward compatibility
                  verification_date = NOW(),
                  verification_notes = ?,
                  updated_at = NOW()
              WHERE ${idColumn} = ?
            `, [
              updatedStatus,
              updatedStatus === 'approved' ? 'verified' : updatedStatus, // Convert 'approved' to 'verified' for backward compatibility
              notes || (currentStatus === 'restricted' ? 'Verified by admin but still restricted' : 'Verified by admin'),
              businessId
            ]);
          } else {
            // Fallback to using only verification_status
            await query(`
              UPDATE ${tableName}
              SET verification_status = ?,
                  verification_date = NOW(),
                  verification_notes = ?,
                  updated_at = NOW()
              WHERE ${idColumn} = ?
            `, [
              updatedStatus === 'approved' ? 'verified' : updatedStatus, // Convert 'approved' to 'verified' for older schema
              notes || (currentStatus === 'restricted' ? 'Verified by admin but still restricted' : 'Verified by admin'),
              businessId
            ]);
          }


          // Update the user's verification status
          if (businessUserId) {
            await query(`
              UPDATE users
              SET is_verified = 1,
                  updated_at = NOW()
              WHERE user_id = ?
            `, [businessUserId]);

          } else {
          }
        } catch (error) {
          throw error;
        }
      } else {
        return NextResponse.json({
          error: 'Invalid user type',
          success: false
        }, { status: 400 });
      }
    } catch (dbError) {
      return NextResponse.json({
        error: 'Database error when verifying user',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User verified successfully'
    });
  } catch (error) {

    // Provide more detailed error information
    let errorMessage = 'Failed to verify user';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('ER_NO_SUCH_TABLE')) {
        errorMessage = 'Database table not found';
        errorDetails = 'The required database table does not exist. Database schema may need to be updated.';
      } else if (error.message.includes('ER_BAD_FIELD_ERROR')) {
        errorMessage = 'Database column not found';
        errorDetails = 'A required column is missing from the database. Database schema may need to be updated.';
      } else if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
        errorMessage = 'Database access denied';
        errorDetails = 'Could not access the database due to permission issues.';
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      success: false
    }, { status: statusCode });
  }
}
