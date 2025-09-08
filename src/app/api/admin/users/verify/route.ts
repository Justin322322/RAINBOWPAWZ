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
          // Check which table exists: service_providers or service_providers
          const tableCheckResult = await query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name IN ('service_providers', 'service_providers')
          `) as any[];

          // Determine which table to use
          const tableNames = tableCheckResult.map(row => row.TABLE_NAME || row.table_name);

          const useServiceProvidersTable = tableNames.includes('service_providers');
          const useBusinessProfilesTable = tableNames.includes('service_providers');

          if (!useServiceProvidersTable && !useBusinessProfilesTable) {
            return NextResponse.json({
              error: 'Database schema error: Required tables do not exist',
              success: false
            }, { status: 500 });
          }

          // SECURITY FIX: Use validated table names instead of template literals
          let businessExists;
          if (useServiceProvidersTable) {
            businessExists = await query(
              'SELECT provider_id, verification_status, application_status, user_id FROM service_providers WHERE provider_id = ?', 
              [businessId]
            ) as any[];
          } else {
            businessExists = await query(
              'SELECT id, verification_status, application_status, user_id FROM service_providers WHERE id = ?', 
              [businessId]
            ) as any[];
          }
          if (!businessExists || businessExists.length === 0) {
            const tableType = useServiceProvidersTable ? 'service_providers' : 'service_providers';
            return NextResponse.json({
              error: `Business profile with ID ${businessId} not found in ${tableType} table`,
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

          // SECURITY FIX: Check columns and update safely for each table type
          if (useServiceProvidersTable) {
            // Check if service_providers has application_status column (avoid SHOW + placeholders incompatibility)
            const columnsResult = await query(
              `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = ? 
                 AND COLUMN_NAME = ? 
               LIMIT 1`,
              ['service_providers', 'application_status']
            ) as any[];
            const hasApplicationStatus = columnsResult.length > 0;

            if (hasApplicationStatus) {
              await query(`
                UPDATE service_providers
                SET application_status = ?,
                    verification_status = ?,
                    verification_date = NOW(),
                    verification_notes = ?,
                    updated_at = NOW()
                WHERE provider_id = ?
              `, [
                updatedStatus,
                updatedStatus === 'approved' ? 'verified' : updatedStatus,
                notes || (currentStatus === 'restricted' ? 'Verified by admin but still restricted' : 'Verified by admin'),
                businessId
              ]);
            } else {
              await query(`
                UPDATE service_providers
                SET verification_status = ?,
                    verification_date = NOW(),
                    verification_notes = ?,
                    updated_at = NOW()
                WHERE provider_id = ?
              `, [
                updatedStatus === 'approved' ? 'verified' : updatedStatus,
                notes || (currentStatus === 'restricted' ? 'Verified by admin but still restricted' : 'Verified by admin'),
                businessId
              ]);
            }
          } else {
            // Check if service_providers has application_status column (avoid SHOW + placeholders incompatibility)
            const columnsResult = await query(
              `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = ? 
                 AND COLUMN_NAME = ? 
               LIMIT 1`,
              ['service_providers', 'application_status']
            ) as any[];
            const hasApplicationStatus = columnsResult.length > 0;

            if (hasApplicationStatus) {
              await query(`
                UPDATE service_providers
                SET application_status = ?,
                    verification_status = ?,
                    verification_date = NOW(),
                    verification_notes = ?,
                    updated_at = NOW()
                WHERE id = ?
              `, [
                updatedStatus,
                updatedStatus === 'approved' ? 'verified' : updatedStatus,
                notes || (currentStatus === 'restricted' ? 'Verified by admin but still restricted' : 'Verified by admin'),
                businessId
              ]);
            } else {
              await query(`
                UPDATE service_providers
                SET verification_status = ?,
                    verification_date = NOW(),
                    verification_notes = ?,
                    updated_at = NOW()
                WHERE id = ?
              `, [
                updatedStatus === 'approved' ? 'verified' : updatedStatus,
                notes || (currentStatus === 'restricted' ? 'Verified by admin but still restricted' : 'Verified by admin'),
                businessId
              ]);
            }
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
