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
    const { userId, userType, action, duration, reason, businessId } = body;


    if (!userId || !userType || !action) {
      return NextResponse.json({
        error: 'Missing required parameters',
        success: false
      }, { status: 400 });
    }

    if (action !== 'restrict' && action !== 'restore') {
      return NextResponse.json({
        error: 'Invalid action. Must be either "restrict" or "restore"',
        success: false
      }, { status: 400 });
    }

    // Validate required fields for restriction
    if (action === 'restrict' && !reason) {
      return NextResponse.json({
        error: 'Reason is required for restriction',
        success: false
      }, { status: 400 });
    }

    try {
      // Check if user_restrictions table exists, create if not
      if (action === 'restrict') {
        const tablesResult = await query(
          "SHOW TABLES LIKE 'user_restrictions'"
        ) as any[];

        if (!tablesResult || tablesResult.length === 0) {
          await query(`
            CREATE TABLE user_restrictions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              reason TEXT,
              restriction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              duration VARCHAR(50) DEFAULT 'indefinite',
              is_active BOOLEAN DEFAULT 1,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `);
        }
      }

      // Handle user based on user type
      if (userType === 'pet_parent') {

        // First check if the user exists
        const userExists = await query('SELECT id FROM users WHERE id = ?', [userId]) as any[];
        if (!userExists || userExists.length === 0) {
          return NextResponse.json({
            error: `User with ID ${userId} not found`,
            success: false
          }, { status: 404 });
        }

        // Update user status accordingly
        await query(`
          UPDATE users
          SET status = ?, updated_at = NOW()
          WHERE id = ?
        `, [action === 'restrict' ? 'restricted' : 'active', userId]);

        if (action === 'restrict') {
          // Add entry to user_restrictions table
          await query(`
            INSERT INTO user_restrictions (user_id, reason, duration)
            VALUES (?, ?, ?)
          `, [userId, reason, duration]);
        } else {
          // Update existing restrictions to inactive
          await query(`
            UPDATE user_restrictions
            SET is_active = 0
            WHERE user_id = ? AND is_active = 1
          `, [userId]);
        }

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

        // Determine new status values based on action
        const newVerificationStatus = action === 'restrict' ? 'restricted' : 'verified';
        const newApplicationStatus = action === 'restrict' ? 'restricted' : 'approved';

        // Build the SQL query based on available columns
        let updateParts = [];
        let updateParams = [];

        // Update verification_status if it exists
        if (hasVerificationStatus) {
          updateParts.push('verification_status = ?');
          updateParams.push(newVerificationStatus);
        }

        // Update application_status if it exists (preferred)
        if (hasApplicationStatus) {
          updateParts.push('application_status = ?');
          updateParams.push(newApplicationStatus);
        }

        // Add restriction-specific fields
        if (action === 'restrict') {
          if (columnNames.includes('restriction_reason')) {
            updateParts.push('restriction_reason = ?');
            updateParams.push(reason);
          }

          if (columnNames.includes('restriction_date')) {
            updateParts.push('restriction_date = NOW()');
          }

          if (columnNames.includes('restriction_duration')) {
            updateParts.push('restriction_duration = ?');
            updateParams.push(duration);
          }
        } else {
          // For restoration, if there are restriction fields, clear them
          if (columnNames.includes('restriction_reason') && columnNames.includes('restriction_date')) {
            updateParts.push('restriction_reason = NULL, restriction_date = NULL');
          }
        }

        // Always add updated timestamp
        if (columnNames.includes('updated_at')) {
          updateParts.push('updated_at = NOW()');
        }

        // Add business ID to parameters list
        updateParams.push(businessId);

        // Build and execute update query
        await query(`
          UPDATE ${tableName}
          SET ${updateParts.join(', ')}
          WHERE ${idColumn} = ?
        `, updateParams);


        // Verify the status was updated correctly
        const verifyResult = await query(
          `SELECT ${hasVerificationStatus ? 'verification_status' : ''}, ${hasApplicationStatus ? 'application_status' : ''} FROM ${tableName} WHERE ${idColumn} = ?`,
          [businessId]
        ) as any[];

        if (verifyResult && verifyResult.length > 0) {

          // Check for mismatch in statuses and retry if needed
          let statusMismatch = false;

          if (hasVerificationStatus && verifyResult[0].verification_status !== newVerificationStatus) {
            statusMismatch = true;
          }

          if (hasApplicationStatus && verifyResult[0].application_status !== newApplicationStatus) {
            statusMismatch = true;
          }

          if (statusMismatch) {
            // Try to update again with a simplified query
            await query(
              `UPDATE ${tableName}
               SET ${hasVerificationStatus ? `verification_status = '${newVerificationStatus}'` : ''}
                  ${hasVerificationStatus && hasApplicationStatus ? ',' : ''}
                  ${hasApplicationStatus ? `application_status = '${newApplicationStatus}'` : ''}
               WHERE ${idColumn} = ?`,
              [businessId]
            );
          }
        }

        // Also update the user's status
        await query(`
          UPDATE users
          SET status = ?, updated_at = NOW()
          WHERE user_id = ?
        `, [action === 'restrict' ? 'restricted' : 'active', businessUserId]);

        if (action === 'restrict') {
          // Add entry to user_restrictions table
          await query(`
            INSERT INTO user_restrictions (user_id, reason, duration)
            VALUES (?, ?, ?)
          `, [businessUserId, reason, duration]);
        } else {
          // Update existing restrictions to inactive
          await query(`
            UPDATE user_restrictions
            SET is_active = 0
            WHERE user_id = ? AND is_active = 1
          `, [businessUserId]);
        }
      } else {
        return NextResponse.json({
          error: 'Invalid user type',
          success: false
        }, { status: 400 });
      }
    } catch (dbError) {
      return NextResponse.json({
        error: `Database error when ${action === 'restrict' ? 'restricting' : 'restoring'} user`,
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${action === 'restrict' ? 'restricted' : 'restored'} successfully`
    });
  } catch (error) {
    // Get the request body
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    // Provide more detailed error information
    let errorMessage = `Failed to ${body?.action === 'restrict' ? 'restrict' : 'restore'} user`;
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
