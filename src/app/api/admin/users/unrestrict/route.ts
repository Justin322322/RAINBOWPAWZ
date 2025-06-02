import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    let isAuthenticated = false;

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        const accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { userId, userType, businessId } = body;


    if (!userId || !userType) {
      return NextResponse.json({
        error: 'Missing required parameters',
        success: false
      }, { status: 400 });
    }

    try {
      // Handle user based on user type
      if (userType === 'pet_parent') {

        // First check if the user exists
        const userExists = await query('SELECT user_id FROM users WHERE user_id = ?', [userId]) as any[];
        if (!userExists || userExists.length === 0) {
          return NextResponse.json({
            error: `User with ID ${userId} not found`,
            success: false
          }, { status: 404 });
        }

        // Update user status to active
        await query(`
          UPDATE users
          SET status = 'active', updated_at = NOW()
          WHERE id = ?
        `, [userId]);

        // Update any existing restrictions to inactive
        await query(`
          UPDATE user_restrictions
          SET is_active = 0
          WHERE user_id = ? AND is_active = 1
        `, [userId]);

      } else if (userType === 'cremation_center') {
        // For cremation centers, we need the businessId
        if (!businessId) {
          return NextResponse.json({
            error: 'Business ID is required for cremation centers',
            success: false
          }, { status: 400 });
        }


        // Check which table exists: business_profiles or service_providers
        const tableCheckResult = await query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name IN ('business_profiles', 'service_providers')
        `) as any[];

        const tableNames = tableCheckResult.map((row: any) => row.table_name);
        const useServiceProvidersTable = tableNames.includes('service_providers');
        const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';


        // First check if the business profile exists
        const idColumn = tableName === 'service_providers' ? 'provider_id' : 'id';
        const businessExists = await query(`SELECT ${idColumn}, user_id FROM ${tableName} WHERE ${idColumn} = ?`, [businessId]) as any[];
        if (!businessExists || businessExists.length === 0) {
          return NextResponse.json({
            error: `Service provider with ID ${businessId} not found`,
            success: false
          }, { status: 404 });
        }

        const businessUserId = businessExists[0].user_id;

        // Check what columns exist in the table
        const columnsResult = await query(`SHOW COLUMNS FROM ${tableName}`) as any[];
        const columnNames = columnsResult.map((col: any) => col.Field);

        // Check for required columns
        const hasVerificationStatus = columnNames.includes('verification_status');
        const hasApplicationStatus = columnNames.includes('application_status');

        // Build dynamic update query based on available columns
        let updateParts = [];
        let updateParams = [];

        // Update verification_status if it exists
        if (hasVerificationStatus) {
          updateParts.push('verification_status = ?');
          updateParams.push('verified');
        }

        // Update application_status if it exists (preferred)
        if (hasApplicationStatus) {
          updateParts.push('application_status = ?');
          updateParams.push('approved');
        }

        // Add verification_date if the column exists
        if (columnNames.includes('verification_date')) {
          updateParts.push('verification_date = NOW()');
        }

        // Clear restriction fields
        if (columnNames.includes('restriction_reason')) {
          updateParts.push('restriction_reason = NULL');
        }
        if (columnNames.includes('restriction_date')) {
          updateParts.push('restriction_date = NULL');
        }
        if (columnNames.includes('restriction_duration')) {
          updateParts.push('restriction_duration = NULL');
        }

        // Always add updated timestamp
        if (columnNames.includes('updated_at')) {
          updateParts.push('updated_at = NOW()');
        }

        // Add parameters
        updateParams.push(businessId);

        // Execute the update
        await query(`
          UPDATE ${tableName}
          SET ${updateParts.join(', ')}
          WHERE ${idColumn} = ?
        `, updateParams);


        // Verify the update was successful
        const verifyResult = await query(`
          SELECT ${hasVerificationStatus ? 'verification_status' : ''}, ${hasApplicationStatus ? 'application_status' : ''}
          FROM ${tableName} WHERE ${idColumn} = ?
        `, [businessId]) as any[];

        if (verifyResult && verifyResult.length > 0) {

          // Check for mismatch in statuses and retry if needed
          let statusMismatch = false;

          if (hasVerificationStatus && verifyResult[0].verification_status !== 'verified') {
            statusMismatch = true;
          }

          if (hasApplicationStatus && verifyResult[0].application_status !== 'approved') {
            statusMismatch = true;
          }

          if (statusMismatch) {
            // Try to update again with a simplified query
            try {
              await query(
                `UPDATE ${tableName}
                SET ${hasVerificationStatus ? "verification_status = 'verified'" : ''}
                  ${hasVerificationStatus && hasApplicationStatus ? ',' : ''}
                  ${hasApplicationStatus ? "application_status = 'approved'" : ''}
                WHERE ${idColumn} = ?`,
                [businessId]
              );
            } catch (retryError) {
              // Continue even if retry fails, since the initial update might have been partially successful
            }
          }
        } else {
        }

        // Also update the user's status
        await query(`
          UPDATE users
          SET status = 'active', updated_at = NOW()
          WHERE user_id = ?
        `, [businessUserId]);

        // Update any existing restrictions to inactive
        await query(`
          UPDATE user_restrictions
          SET is_active = 0
          WHERE user_id = ? AND is_active = 1
        `, [businessUserId]);
      } else {
        return NextResponse.json({
          error: 'Invalid user type',
          success: false
        }, { status: 400 });
      }
    } catch (dbError) {
      return NextResponse.json({
        error: 'Database error when restoring user',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User restored successfully'
    });
  } catch (error) {

    // Provide more detailed error information
    let errorMessage = 'Failed to restore user';
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