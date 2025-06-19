import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// API endpoint to restrict or restore access to a cremation business
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      _userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        _userId = parts[0];
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    let result;
    const tableName = 'service_providers'; // Use only the service_providers table
    try {

      // SECURITY FIX: First, check if the business profile exists
      const checkResult = await query(`
        SELECT provider_id, user_id, application_status, provider_type
        FROM service_providers
        WHERE provider_id = ?
      `, [businessId]) as any[];


      if (!checkResult || checkResult.length === 0) {
        return NextResponse.json({
          error: 'Business profile not found',
          details: `No business profile found with ID ${businessId} in service_providers table`,
          success: false
        }, { status: 404 });
      }

      // Get the user ID from the check result
      const _businessUserId = checkResult[0].user_id;

      // SECURITY FIX: Check for available columns
      const columnsResult = await query('SHOW COLUMNS FROM service_providers') as any[];


      // Get all column names
      const columnNames = columnsResult.map((col: any) => col.Field);

      // Check for required columns
      const hasApplicationStatus = columnNames.includes('application_status');
      const hasStatus = columnNames.includes('status');
      const hasProviderType = columnNames.includes('provider_type');

      // Prepare update parts based on available columns
      let updateParts = [];
      let updateParams = [];

      // Update application_status (primary status field)
      if (hasApplicationStatus) {
        updateParts.push('application_status = ?');
        updateParams.push(newApplicationStatus);
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
        return NextResponse.json({
          error: 'Database schema issue',
          details: 'Could not find appropriate columns to update',
          success: false
        }, { status: 500 });
      }

      // Add businessId to parameters
      updateParams.push(businessId);

      // SECURITY FIX: Build the final query with validated table name
      let updateQuery = `UPDATE service_providers SET ${updateParts.join(', ')} WHERE provider_id = ?`;

      // Add provider_type condition if the column exists and the business type is known
      const businessType = checkResult[0].provider_type;
      if (hasProviderType && businessType) {
        updateQuery += ` AND provider_type = ?`;
        updateParams.push(businessType);
      }


      try {
        result = await query(updateQuery, updateParams);

        // If no rows were affected, try without the provider_type condition
        if (hasProviderType && (result as any).affectedRows === 0) {

          // Remove the provider_type condition and the last parameter
          if (businessType) {
            updateParams.pop();
          }
          updateQuery = `UPDATE service_providers SET ${updateParts.join(', ')} WHERE provider_id = ?`;

          result = await query(updateQuery, updateParams);
        }
      } catch (queryError) {
        return NextResponse.json({
          error: 'SQL error during update',
          details: queryError instanceof Error ? queryError.message : 'Unknown database error',
          success: false
        }, { status: 500 });
      }

      // Also update the user status if appropriate
      try {
        // SECURITY FIX: Get the user ID for this service provider
        const userResult = await query(`
          SELECT user_id FROM service_providers WHERE provider_id = ?
        `, [businessId]) as any[];

        if (userResult && userResult.length > 0) {
          const _userId = userResult[0].user_id;

          // Update the user's status
          await query(`
            UPDATE users
            SET status = ?, updated_at = NOW()
            WHERE user_id = ?
          `, [action === 'restrict' ? 'restricted' : 'active', userId]);


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
                SET is_active = 0
                WHERE user_id = ? AND is_active = 1
              `, [userId]);
            }
          }
        }
      } catch (_userUpdateError) {
        // Non-critical error, just log it
      }
    } catch (updateError) {
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
      // SECURITY FIX: Check the current status to include in the response
      const currentStatusResult = await query(`
        SELECT application_status
        FROM service_providers
        WHERE provider_id = ?
      `, [businessId]) as any[];

      const currentStatus = currentStatusResult && currentStatusResult.length > 0
        ? currentStatusResult[0]
        : { application_status: newApplicationStatus };

      return NextResponse.json({
        success: true,
        message: `Business already in ${action === 'restrict' ? 'restricted' : 'restored'} state`,
        newStatus: newApplicationStatus,
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
          INSERT INTO admin_logs (action, entity_type, entity_id, admin_id, details)
          VALUES (?, ?, ?, ?, ?)
        `, [
          action === 'restrict' ? 'restrict_business' : 'restore_business',
          tableName, // Use the correct table name
          businessId,
          'admin', // In a real system, this would be the admin's ID
          JSON.stringify({ action, businessId, newStatus, newApplicationStatus })
        ]);
      } else {
      }
    } catch (_logError) {
      // Non-critical error, just log it
    }

    return NextResponse.json({
      success: true,
      message: `Business ${action === 'restrict' ? 'restricted' : 'restored'} successfully`,
      newStatus,
      newApplicationStatus
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update business status',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
