import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// API endpoint to restrict or restore access to a cremation business
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    let isAuthenticated = false;
    let accountType = '';

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      console.log('Development mode: Bypassing authentication for testing');
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

    // Get the business ID and action from the request body
    const body = await request.json();
    const { businessId, action } = body;

    if (!businessId) {
      return NextResponse.json({
        error: 'Missing business ID',
        success: false
      }, { status: 400 });
    }

    if (action !== 'restrict' && action !== 'restore') {
      return NextResponse.json({
        error: 'Invalid action. Must be either "restrict" or "restore"',
        success: false
      }, { status: 400 });
    }

    // Determine the new status based on the action
    const newStatus = action === 'restrict' ? 'restricted' : 'verified';
    // For application_status, when restoring, use 'approved' (it's the new equivalent of 'verified')
    const newApplicationStatus = action === 'restrict' ? 'restricted' : 'approved';

    console.log('Setting status for business ID:', businessId, 'Action:', action);
    console.log('New status values:', {
      newApplicationStatus,
      newStatus,
    });

    let result;
    const tableName = 'service_providers'; // Use only the service_providers table
    try {
      console.log(`Using table: ${tableName}`);

      // First, check if the business profile exists
      const checkResult = await query(`
        SELECT id, user_id, verification_status, application_status, provider_type
        FROM ${tableName}
        WHERE id = ?
      `, [businessId]) as any[];

      console.log('Check result:', checkResult);

      if (!checkResult || checkResult.length === 0) {
        console.error('Business profile not found with ID:', businessId);
        return NextResponse.json({
          error: 'Business profile not found',
          details: `No business profile found with ID ${businessId} in ${tableName} table`,
          success: false
        }, { status: 404 });
      }

      // Get the user ID from the check result
      const businessUserId = checkResult[0].user_id;
      console.log(`Found business with user ID: ${businessUserId}`);

      // Check for available columns
      const columnsResult = await query(`
        SHOW COLUMNS FROM ${tableName}
      `) as any[];

      console.log('Columns check result:', columnsResult);

      // Get all column names
      const columnNames = columnsResult.map((col: any) => col.Field);
      console.log('Available columns:', columnNames);

      // Check for required columns
      const hasVerificationStatus = columnNames.includes('verification_status');
      const hasApplicationStatus = columnNames.includes('application_status');
      const hasStatus = columnNames.includes('status');
      const hasProviderType = columnNames.includes('provider_type');

      // Prepare update parts based on available columns
      let updateParts = [];
      let updateParams = [];

      // Always update application_status if it exists (primary status field)
      if (hasApplicationStatus) {
        updateParts.push('application_status = ?');
        updateParams.push(newApplicationStatus);
      }

      // Update verification_status for backward compatibility
      if (hasVerificationStatus) {
        updateParts.push('verification_status = ?');
        updateParams.push(newStatus);
      }

      // Update status field if it exists (though it should be removed in migration)
      if (hasStatus) {
        updateParts.push('status = ?');
        updateParams.push(action === 'restrict' ? 'restricted' : 'active');
      }

      // Add updated_at timestamp
      if (columnNames.includes('updated_at')) {
        updateParts.push('updated_at = NOW()');
      }

      // Add verification_date if we're approving/verifying the business
      if (action === 'restore' && columnNames.includes('verification_date')) {
        updateParts.push('verification_date = NOW()');
      }

      // Clear restriction fields when restoring
      if (action === 'restore') {
        if (columnNames.includes('restriction_reason')) {
          updateParts.push('restriction_reason = NULL');
        }
        if (columnNames.includes('restriction_date')) {
          updateParts.push('restriction_date = NULL');
        }
        if (columnNames.includes('restriction_duration')) {
          updateParts.push('restriction_duration = NULL');
        }
      }

      // If there are no columns to update, return an error
      if (updateParts.length === 0) {
        console.error('No columns found to update');
        return NextResponse.json({
          error: 'Database schema issue',
          details: 'Could not find appropriate columns to update',
          success: false
        }, { status: 500 });
      }

      // Add businessId to parameters
      updateParams.push(businessId);

      // Build the final query
      let updateQuery = `UPDATE ${tableName} SET ${updateParts.join(', ')} WHERE id = ?`;

      // Add provider_type condition if the column exists and the business type is known
      const businessType = checkResult[0].provider_type;
      if (hasProviderType && businessType) {
        updateQuery += ` AND provider_type = ?`;
        updateParams.push(businessType);
      }

      console.log('Using update query:', updateQuery);
      console.log('Update parameters:', updateParams);

      try {
        result = await query(updateQuery, updateParams);
        console.log('Update result:', result);

        // If no rows were affected, try without the provider_type condition
        if (hasProviderType && (result as any).affectedRows === 0) {
          console.log('No rows affected with provider_type condition. Trying without it...');

          // Remove the provider_type condition and the last parameter
          if (businessType) {
            updateParams.pop();
          }
          updateQuery = `UPDATE ${tableName} SET ${updateParts.join(', ')} WHERE id = ?`;

          result = await query(updateQuery, updateParams);
          console.log('Update result (without provider_type):', result);
        }
      } catch (queryError) {
        console.error('SQL error during update:', queryError);
        return NextResponse.json({
          error: 'SQL error during update',
          details: queryError instanceof Error ? queryError.message : 'Unknown database error',
          success: false
        }, { status: 500 });
      }

      // Also update the user status if appropriate
      try {
        // Get the user ID for this service provider
        const userResult = await query(`
          SELECT user_id FROM ${tableName} WHERE id = ?
        `, [businessId]) as any[];

        if (userResult && userResult.length > 0) {
          const userId = userResult[0].user_id;

          // Update the user's status
          await query(`
            UPDATE users
            SET status = ?, updated_at = NOW()
            WHERE id = ?
          `, [action === 'restrict' ? 'restricted' : 'active', userId]);

          console.log(`Updated user status with ID ${userId} to ${action === 'restrict' ? 'restricted' : 'active'}`);

          // Handle user_restrictions table if it exists
          const restrictionsTableResult = await query(`
            SHOW TABLES LIKE 'user_restrictions'
          `) as any[];

          if (restrictionsTableResult && restrictionsTableResult.length > 0) {
            if (action === 'restrict') {
              // Add a new restriction record
              await query(`
                INSERT INTO user_restrictions (user_id, reason, duration)
                VALUES (?, ?, ?)
              `, [userId, body.reason || 'Restricted by admin', body.duration || 'indefinite']);
            } else {
              // Mark existing restrictions as inactive
              await query(`
                UPDATE user_restrictions 
                SET is_active = 0, updated_at = NOW()
                WHERE user_id = ? AND is_active = 1
              `, [userId]);
            }
          }
        }
      } catch (userUpdateError) {
        // Non-critical error, just log it
        console.error('Failed to update user status:', userUpdateError);
      }
    } catch (updateError) {
      console.error('Error during database update:', updateError);
      throw updateError;
    }

    // Check if the update was successful
    if (!result) {
      return NextResponse.json({
        error: 'Failed to update business status',
        details: 'Database update failed',
        success: false
      }, { status: 500 });
    }

    // If no rows were affected, it could be because the business was already in the desired state
    // In this case, we'll still return success to avoid confusing the client
    if ((result as any).affectedRows === 0) {
      console.log('No rows affected, but continuing with success response');
      // Check the current status to include in the response
      const currentStatusResult = await query(`
        SELECT application_status, verification_status
        FROM ${tableName}
        WHERE id = ?
      `, [businessId]) as any[];

      const currentStatus = currentStatusResult && currentStatusResult.length > 0
        ? currentStatusResult[0]
        : { application_status: newApplicationStatus, verification_status: newStatus };

      return NextResponse.json({
        success: true,
        message: `Business already in ${action === 'restrict' ? 'restricted' : 'restored'} state`,
        newStatus: currentStatus.verification_status || newStatus,
        newApplicationStatus: currentStatus.application_status || newApplicationStatus,
        noChanges: true
      });
    }

    // Try to log the action for audit purposes
    try {
      // First check if the admin_logs table exists
      const tableCheck = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = 'admin_logs'
      `, [process.env.DB_NAME || 'rainbow_paws']);

      const tableExists = tableCheck && Array.isArray(tableCheck) &&
                          tableCheck[0] && tableCheck[0].count > 0;

      if (tableExists) {
        await query(`
          INSERT INTO admin_logs (action, target_table, target_id, admin_id, details)
          VALUES (?, ?, ?, ?, ?)
        `, [
          action === 'restrict' ? 'restrict_business' : 'restore_business',
          tableName, // Use the correct table name
          businessId,
          'admin', // In a real system, this would be the admin's ID
          JSON.stringify({ action, businessId, newStatus, newApplicationStatus })
        ]);
      } else {
        console.log('admin_logs table does not exist, skipping audit logging');
      }
    } catch (logError) {
      // Non-critical error, just log it
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Business ${action === 'restrict' ? 'restricted' : 'restored'} successfully`,
      newStatus,
      newApplicationStatus
    });
  } catch (error) {
    console.error('Error updating business status:', error);
    return NextResponse.json({
      error: 'Failed to update business status',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
