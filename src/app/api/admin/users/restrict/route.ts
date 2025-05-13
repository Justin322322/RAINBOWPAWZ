import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

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

    // Get request body
    const body = await request.json();
    const { userId, userType, action, duration, reason, businessId } = body;

    console.log('Received request body:', body);

    if (!userId || !userType || !action) {
      return NextResponse.json({
        error: 'Missing required parameters',
        success: false
      }, { status: 400 });
    }

    if (action !== 'restrict') {
      return NextResponse.json({
        error: 'Invalid action',
        success: false
      }, { status: 400 });
    }

    // Validate required fields for restriction
    if (!reason) {
      return NextResponse.json({
        error: 'Reason is required for restriction',
        success: false
      }, { status: 400 });
    }

    try {
      // Check if user_restrictions table exists, create if not
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

      // Restrict user based on user type
      if (userType === 'pet_parent') {
        console.log('Restricting pet parent with ID:', userId);
        
        // First check if the user exists
        const userExists = await query('SELECT id FROM users WHERE id = ?', [userId]) as any[];
        if (!userExists || userExists.length === 0) {
          return NextResponse.json({
            error: `User with ID ${userId} not found`,
            success: false
          }, { status: 404 });
        }
        
        // Check if is_restricted column exists
        const hasRestrictedColumn = await query("SHOW COLUMNS FROM users LIKE 'is_restricted'") as any[];
        
        if (hasRestrictedColumn && hasRestrictedColumn.length > 0) {
          // Update user restriction status
          await query(`
            UPDATE users
            SET is_restricted = 1, 
                restriction_reason = ?, 
                restriction_date = NOW(), 
                restriction_duration = ?,
                status = 'restricted',
                updated_at = NOW()
            WHERE id = ?
          `, [reason, duration, userId]);
        } else {
          // If is_restricted column doesn't exist, update status only
          await query(`
            UPDATE users
            SET status = 'restricted',
                updated_at = NOW()
            WHERE id = ?
          `, [userId]);
        }
        
        // Add entry to user_restrictions table
        await query(`
          INSERT INTO user_restrictions (user_id, reason, duration)
          VALUES (?, ?, ?)
        `, [userId, reason, duration]);
        
      } else if (userType === 'cremation_center') {
        // For cremation centers, we need the businessId
        if (!businessId) {
          return NextResponse.json({
            error: 'Business ID is required for cremation centers',
            success: false
          }, { status: 400 });
        }
        
        console.log('Restricting cremation center with business ID:', businessId);
        
        // First check if the business profile exists
        const businessExists = await query('SELECT id, user_id FROM business_profiles WHERE id = ?', [businessId]) as any[];
        if (!businessExists || businessExists.length === 0) {
          return NextResponse.json({
            error: `Business profile with ID ${businessId} not found`,
            success: false
          }, { status: 404 });
        }
        
        const businessUserId = businessExists[0].user_id;
        
        // Update business verification status
        await query(`
          UPDATE business_profiles
          SET verification_status = 'restricted', 
              status = 'restricted',
              restriction_reason = ?,
              restriction_date = NOW(),
              restriction_duration = ?,
              updated_at = NOW()
          WHERE id = ?
        `, [reason, duration, businessId]);
        
        // Also update the user's status
        await query(`
          UPDATE users
          SET status = 'restricted', updated_at = NOW()
          WHERE id = ?
        `, [businessUserId]);
        
        // Add entry to user_restrictions table
        await query(`
          INSERT INTO user_restrictions (user_id, reason, duration)
          VALUES (?, ?, ?)
        `, [businessUserId, reason, duration]);
      } else {
        return NextResponse.json({
          error: 'Invalid user type',
          success: false
        }, { status: 400 });
      }
    } catch (dbError) {
      console.error('Database error when restricting user:', dbError);
      return NextResponse.json({
        error: 'Database error when restricting user',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User restricted successfully'
    });
  } catch (error) {
    console.error('Error restricting user:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to restrict user';
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
