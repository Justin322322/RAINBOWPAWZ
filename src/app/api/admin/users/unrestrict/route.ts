import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        success: false
      }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required',
        success: false
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { userId, userType, businessId } = body;

    // Validate required fields
    if (!userId || !userType) {
      return NextResponse.json({
        error: 'User ID and user type are required',
        success: false
      }, { status: 400 });
    }

    // Validate user type
    if (!['personal', 'cremation_center'].includes(userType)) {
      return NextResponse.json({
        error: 'Invalid user type. Must be "personal" or "cremation_center"',
        success: false
      }, { status: 400 });
    }

    try {
      if (userType === 'personal') {
        // For personal users, simply update their status in users table
        await query(`
          UPDATE users
          SET status = 'active', updated_at = NOW()
          WHERE user_id = ?
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
        
        // SECURITY FIX: Use validated table names instead of template literals
        if (useServiceProvidersTable) {
          // Handle service_providers table
          const businessExists = await query(
            'SELECT provider_id, user_id FROM service_providers WHERE provider_id = ?', 
            [businessId]
          ) as any[];
          
          if (!businessExists || businessExists.length === 0) {
            return NextResponse.json({
              error: `Service provider with ID ${businessId} not found`,
              success: false
            }, { status: 404 });
          }

          const businessUserId = businessExists[0].user_id;

          // Check available columns safely
          const columnsResult = await query('SHOW COLUMNS FROM service_providers') as any[];
          const columnNames = columnsResult.map((col: any) => col.Field);

          // Build safe update query for service_providers
          const updateParts = [];
          const updateParams = [];

          if (columnNames.includes('verification_status')) {
            updateParts.push('verification_status = ?');
            updateParams.push('verified');
          }

          if (columnNames.includes('application_status')) {
            updateParts.push('application_status = ?');
            updateParams.push('approved');
          }

          if (columnNames.includes('verification_date')) {
            updateParts.push('verification_date = NOW()');
          }

          if (columnNames.includes('restriction_reason')) {
            updateParts.push('restriction_reason = NULL');
          }

          if (columnNames.includes('restriction_date')) {
            updateParts.push('restriction_date = NULL');
          }

          if (columnNames.includes('restriction_duration')) {
            updateParts.push('restriction_duration = NULL');
          }

          if (columnNames.includes('updated_at')) {
            updateParts.push('updated_at = NOW()');
          }

          updateParams.push(businessId);

          if (updateParts.length > 0) {
            const updateQuery = `UPDATE service_providers SET ${updateParts.join(', ')} WHERE provider_id = ?`;
            await query(updateQuery, updateParams);
          }

          // Update user status
          await query(`
            UPDATE users
            SET status = 'active', updated_at = NOW()
            WHERE user_id = ?
          `, [businessUserId]);

          // Update restrictions
          await query(`
            UPDATE user_restrictions
            SET is_active = 0
            WHERE user_id = ? AND is_active = 1
          `, [businessUserId]);

        } else {
          // Handle business_profiles table
          const businessExists = await query(
            'SELECT id, user_id FROM business_profiles WHERE id = ?', 
            [businessId]
          ) as any[];
          
          if (!businessExists || businessExists.length === 0) {
            return NextResponse.json({
              error: `Business profile with ID ${businessId} not found`,
              success: false
            }, { status: 404 });
          }

          const businessUserId = businessExists[0].user_id;

          // Check available columns safely
          const columnsResult = await query('SHOW COLUMNS FROM business_profiles') as any[];
          const columnNames = columnsResult.map((col: any) => col.Field);

          // Build safe update query for business_profiles
          const updateParts = [];
          const updateParams = [];

          if (columnNames.includes('verification_status')) {
            updateParts.push('verification_status = ?');
            updateParams.push('verified');
          }

          if (columnNames.includes('application_status')) {
            updateParts.push('application_status = ?');
            updateParams.push('approved');
          }

          if (columnNames.includes('verification_date')) {
            updateParts.push('verification_date = NOW()');
          }

          if (columnNames.includes('restriction_reason')) {
            updateParts.push('restriction_reason = NULL');
          }

          if (columnNames.includes('restriction_date')) {
            updateParts.push('restriction_date = NULL');
          }

          if (columnNames.includes('restriction_duration')) {
            updateParts.push('restriction_duration = NULL');
          }

          if (columnNames.includes('updated_at')) {
            updateParts.push('updated_at = NOW()');
          }

          updateParams.push(businessId);

          if (updateParts.length > 0) {
            const updateQuery = `UPDATE business_profiles SET ${updateParts.join(', ')} WHERE id = ?`;
            await query(updateQuery, updateParams);
          }

          // Update user status
          await query(`
            UPDATE users
            SET status = 'active', updated_at = NOW()
            WHERE user_id = ?
          `, [businessUserId]);

          // Update restrictions
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