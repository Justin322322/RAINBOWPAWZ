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
    // For restriction, set both verification_status and status to 'restricted'
    // For unrestriction, set verification_status to 'verified' and status to 'active'
    const newVerificationStatus = action === 'restrict' ? 'restricted' : 'verified';
    const newStatus = action === 'restrict' ? 'restricted' : 'active';

    console.log('Setting status for business ID:', businessId, 'Action:', action);
    console.log('New status values:', { newVerificationStatus, newStatus });

    console.log('Attempting to update business profile with ID:', businessId);
    console.log('New verification status:', newVerificationStatus);
    console.log('New status:', newStatus);

    let result;
    try {
      // First, check if the business profile exists
      const checkResult = await query(`
        SELECT id, business_type, verification_status
        FROM business_profiles
        WHERE id = ?
      `, [businessId]) as any[];

      console.log('Check result:', checkResult);

      if (!checkResult || checkResult.length === 0) {
        console.error('Business profile not found with ID:', businessId);
        return NextResponse.json({
          error: 'Business profile not found',
          details: `No business profile found with ID ${businessId}`,
          success: false
        }, { status: 404 });
      }

      // Check if the business_type column exists
      const columnsResult = await query(`
        SHOW COLUMNS FROM business_profiles LIKE 'business_type'
      `) as any[];

      console.log('Columns check result:', columnsResult);

      // Check if the status column exists
      const statusColumnResult = await query(`
        SHOW COLUMNS FROM business_profiles LIKE 'status'
      `) as any[];

      console.log('Status column check result:', statusColumnResult);

      // If status column doesn't exist, add it
      let hasStatusColumn = statusColumnResult && statusColumnResult.length > 0;

      if (!hasStatusColumn) {
        console.log('Status column does not exist, adding it...');
        try {
          await query(`
            ALTER TABLE business_profiles
            ADD COLUMN status VARCHAR(50) DEFAULT 'active' AFTER verification_status
          `);
          console.log('Status column added successfully');

          // Check again if the column was added successfully
          const recheckResult = await query(`
            SHOW COLUMNS FROM business_profiles LIKE 'status'
          `) as any[];

          hasStatusColumn = recheckResult && recheckResult.length > 0;
          console.log('Status column recheck result:', recheckResult);
        } catch (alterError) {
          console.error('Error adding status column:', alterError);
          // Continue even if we can't add the column
        }
      }

      // Determine which columns to update based on what exists in the database
      let updateQuery;
      let updateParams;

      // Always update both verification_status and status columns
      if (columnsResult && columnsResult.length > 0) {
        // business_type column exists
        updateQuery = `UPDATE business_profiles SET verification_status = ?, status = ? WHERE id = ? AND business_type = 'cremation'`;
      } else {
        // business_type column doesn't exist
        updateQuery = `UPDATE business_profiles SET verification_status = ?, status = ? WHERE id = ?`;
      }
      updateParams = [newVerificationStatus, newStatus, businessId];

      console.log('Using update query:', updateQuery);
      console.log('Update parameters:', updateParams);

      result = await query(updateQuery, updateParams);
      console.log('Update result:', result);
    } catch (updateError) {
      console.error('Error during database update:', updateError);
      throw updateError;
    }

    // Check if the update was successful
    if (!result || (result as any).affectedRows === 0) {
      return NextResponse.json({
        error: 'Failed to update business status',
        details: 'Business not found or no changes made',
        success: false
      }, { status: 404 });
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
          VALUES (?, 'business_profiles', ?, ?, ?)
        `, [
          action === 'restrict' ? 'restrict_business' : 'restore_business',
          businessId,
          'admin', // In a real system, this would be the admin's ID
          JSON.stringify({ action, businessId, newStatus, newVerificationStatus })
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
      newVerificationStatus
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
