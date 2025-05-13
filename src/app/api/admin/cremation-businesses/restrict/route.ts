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

    // Update the business status in the database
    const result = await query(`
      UPDATE business_profiles
      SET verification_status = ?
      WHERE id = ? AND business_type = 'cremation'
    `, [newStatus, businessId]);

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
          JSON.stringify({ action, businessId, newStatus })
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
      newStatus
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
